const ProductCategory = require("../../models/ProductCategory");
const DeliveryConfig = require("../../models/DeliveryConfig");
const TechnologyConfig = require("../../models/TechnologyConfig");
const MarketingConfig = require("../../models/MarketingConfig");
const HROpsMultiplierConfig = require("../../models/HROpsMultiplierConfig");
const OperationsStaffingConfig = require("../../models/OperationsStaffingConfig");
const PricingConfig = require("../../models/PricingConfig");
const LocalCompetitionConfig = require("../../models/LocalCompetitionConfig");
const ScoringConstantsConfig = require("../../models/ScoringConstantsConfig");
const SupplierReliabilityConfig = require("../../models/SupplierReliabilityConfig");
const MarketPositionOption = require("../../models/MarketPositionOption");
const PlayerRoundResult = require("../../models/PlayerRoundResult");

const { fetchGroupRoundDecisions } = require("./fetchDecisions");
const { computeDeliveryStepMultiplier } = require("./deliveryMultiplier");
const { computeTechnologyOptionsMultiplier } = require("./technologyMultiplier");
const { computeMarketingOptionsMultiplier } = require("./marketingMultiplier");
const { computeCorporateTeamSpend, computeHROpsStepMultiplier } = require("./hrOpsMultiplier");
const { computeCompetitiveAverageMultiplier } = require("./competitiveAverage");
const { computeQualityPricing } = require("./qualityPricing");
const { computeSigmoidNew, computeHeightPricePoints, computeSegmentQualification } = require("./heightPriceGate");
const { computePositioningQualification } = require("./positioningGate");
const { average, sampleStdev, minMax } = require("./groupStats");
const { combinePlayerSegmentScores } = require("./combine");
const { computeMarketShareResult } = require("./marketShare");
const { runWeeklyFulfillment } = require("./weeklyFulfillment");
const { SEGMENTS } = require("./segments");

function firstCategoryPricingDecision(playerDecisions) {
  return playerDecisions.pricing?.categories?.[0] || null;
}

async function loadConfigs() {
  const [
    deliveryConfig,
    technologyConfig,
    marketingConfig,
    hrOpsMultiplierConfig,
    operationsStaffingConfig,
    pricingConfig,
    localCompetitionConfig,
    scoringConstantsConfig,
    supplierReliabilityConfig,
    categories,
    marketPositionOptions
  ] = await Promise.all([
    DeliveryConfig.findOne(),
    TechnologyConfig.findOne(),
    MarketingConfig.findOne(),
    HROpsMultiplierConfig.findOne(),
    OperationsStaffingConfig.findOne(),
    PricingConfig.findOne(),
    LocalCompetitionConfig.findOne(),
    ScoringConstantsConfig.findOne(),
    SupplierReliabilityConfig.findOne(),
    ProductCategory.find({ isActive: true }),
    MarketPositionOption.find({})
  ]);

  return {
    deliveryConfig, technologyConfig, marketingConfig,
    hrOpsMultiplierConfig, operationsStaffingConfig, pricingConfig,
    localCompetitionConfig, scoringConstantsConfig, supplierReliabilityConfig, categories,
    marketPositionOptions
  };
}

/**
 * Computes each player's per-step multipliers, quality/pricing, and
 * height-price gate — everything that doesn't depend on the group's
 * aggregate stats. Those are folded in afterward (pass 2).
 */
function computePerPlayerBasics(playerDecisions, configs) {
  const pricingDecision = firstCategoryPricingDecision(playerDecisions);
  const qualityLevel = pricingDecision?.qualityLevel ?? 1;
  const spMult = pricingDecision?.marginMultiplier ?? 1;

  const stepMultipliers = {
    delivery: computeDeliveryStepMultiplier(configs.deliveryConfig, playerDecisions.stepFour),
    technology: computeTechnologyOptionsMultiplier(configs.technologyConfig, playerDecisions.stepFive),
    marketing: computeMarketingOptionsMultiplier(configs.marketingConfig, playerDecisions.stepEight)
    // hrOps filled in during pass 2 (needs group min/max corporate spend)
  };

  const qualityPricing = computeQualityPricing(configs.pricingConfig, qualityLevel, spMult);
  const sigmoidNew = computeSigmoidNew(configs.scoringConstantsConfig, qualityPricing.spMultBase);
  const heightPricePoints = computeHeightPricePoints(sigmoidNew);
  // Where the player competes is their Step 1 positioning choice. The
  // height-price band is kept only as a fallback for rounds saved before
  // positioning was recorded; sigmoidNew still feeds heightPricePoints above,
  // so pricing continues to affect HOW WELL they score in those segments.
  const heightPriceQualification = computeSegmentQualification(configs.scoringConstantsConfig, sigmoidNew);
  const segmentQualification = computePositioningQualification(
    playerDecisions.stepOne, configs.marketPositionOptions, heightPriceQualification
  );

  const corporateSpend = computeCorporateTeamSpend(configs.operationsStaffingConfig, playerDecisions.stepNine);
  const techCost = playerDecisions.stepFive?.totalTechnologyCost || 0;
  const marketingCost = playerDecisions.stepEight?.totalCost || 0;

  // Excel row 85 "Others" = Focus * New-Player-in-Segment * R&D. The first
  // two sub-factors are fixed workbook constants; R&D was fixed at 1 in the
  // worked example (no player ever invested) but PricingDecision.rdInvestment
  // exists as a real player input, so it's wired in here as a slider term
  // rather than left permanently inert.
  const constants = configs.scoringConstantsConfig;
  const rdInvestment = playerDecisions.pricing?.rdInvestment || 0; // top-level field on PricingDecision, not per-category
  const rdMultiplier = constants?.rdInvestment?.divisor
    ? 1 + (rdInvestment * constants.rdInvestment.rate) / constants.rdInvestment.divisor
    : 1;
  const othersMultiplier =
    (constants?.focusMultiplier ?? 1) * (constants?.newPlayerInSegmentMultiplier ?? 1) * rdMultiplier;

  const unitCostBasis = playerDecisions.supplier?.costPerUnit ?? configs.pricingConfig?.baseUnitPrice;

  // Own riders can carry riders x hoursPerWeek x itemsPerHour units a week;
  // anything beyond that goes to the third party at a per-order fee. Step 4
  // can't compute this itself — it doesn't know how much demand the player
  // will win, which only falls out of the competition here.
  const throughput = configs.deliveryConfig?.riderThroughput;
  const riderWeeklyCapacity =
    (playerDecisions.stepFour?.deliveryFleet?.ridersPerCity || 0) *
    (throughput?.hoursPerWeek ?? 40) *
    (throughput?.itemsPerHour ?? 10);

  return {
    qualityLevel, stepMultipliers, qualityPricing, heightPricePoints,
    segmentQualification, corporateSpend, techCost, marketingCost,
    othersMultiplier, unitCostBasis, riderWeeklyCapacity
  };
}

/**
 * Stock left in the warehouse at the end of the previous round. Rounds are
 * consecutive months of the same business, so inventory carries; a player who
 * over-ordered in round 1 starts round 2 already holding it.
 *
 * Returns 0 for round 1, or when the previous round hasn't been scored yet —
 * in which case there is nothing to carry rather than an error.
 */
async function previousRoundCarryOver(userId, simulationId, groupId, roundNumber) {
  const empty = { inventory: 0, backlog: 0, pendingSupply: 0 };
  if (roundNumber <= 1) return empty;
  const previous = await PlayerRoundResult.findOne({
    userId, simulationId, groupId, roundNumber: roundNumber - 1
  }).select("closingInventory closingBacklog closingPendingSupply");
  if (!previous) return empty;
  return {
    inventory: previous.closingInventory || 0,
    backlog: previous.closingBacklog || 0,
    pendingSupply: previous.closingPendingSupply || 0
  };
}

/**
 * Runs the full engine for one group+round. Returns an array of
 * PlayerRoundResult-shaped plain objects (one per user in the group).
 */
async function computeRoundScores(simulationId, groupId, roundNumber) {
  const configs = await loadConfigs();
  const decisions = await fetchGroupRoundDecisions(simulationId, groupId, roundNumber);

  if (decisions.length === 0) return [];

  const basics = decisions.map((d) => computePerPlayerBasics(d, configs));

  // --- Group-wide statistics (pass 2 inputs) ---
  const groupQualityLevelStats = {
    avg: average(basics.map((b) => b.qualityLevel)),
    stdev: sampleStdev(basics.map((b) => b.qualityLevel))
  };
  const groupSpMultBaseStats = {
    avg: average(basics.map((b) => b.qualityPricing.spMultBase)),
    stdev: sampleStdev(basics.map((b) => b.qualityPricing.spMultBase))
  };
  const corporateSpendMinMax = minMax(basics.map((b) => b.corporateSpend));
  const techCostAverage = average(basics.map((b) => b.techCost));
  const marketingCostAverage = average(basics.map((b) => b.marketingCost));

  // --- Per-player: finish step multipliers + BASE/FinalMultiplier/segmentScore ---
  const perPlayerCombined = decisions.map((playerDecisions, i) => {
    const b = basics[i];

    const hrOps = computeHROpsStepMultiplier(
      configs.hrOpsMultiplierConfig,
      configs.operationsStaffingConfig,
      playerDecisions.stepNine,
      corporateSpendMinMax
    );

    const competitiveAverage = {
      technology: computeCompetitiveAverageMultiplier(
        configs.technologyConfig?.totalInvestmentAverage, b.techCost, techCostAverage
      ),
      marketing: computeCompetitiveAverageMultiplier(
        configs.marketingConfig?.totalInvestmentAverage, b.marketingCost, marketingCostAverage
      )
    };

    return combinePlayerSegmentScores({
      stepMultipliers: { ...b.stepMultipliers, hrOps },
      competitiveAverage,
      othersMultiplier: b.othersMultiplier,
      qualityPricing: b.qualityPricing,
      thisPlayerQualityLevel: b.qualityLevel,
      groupQualityLevelStats,
      groupSpMultBaseStats,
      heightPricePoints: b.heightPricePoints,
      segmentQualification: b.segmentQualification,
      weights: {
        sellingPriceWeight: configs.scoringConstantsConfig?.sellingPriceWeight,
        competitiveQualityWeight: configs.scoringConstantsConfig?.competitiveQualityWeight,
        actualQualityWeight: configs.scoringConstantsConfig?.actualQualityWeight,
        heightPriceWeight: configs.scoringConstantsConfig?.heightPriceWeight
      }
    });
  });
  const perPlayerSegmentScores = perPlayerCombined.map((c) => c.segmentScore);

  // --- Per category: market share among the players enrolled in it ---
  const results = decisions.map((playerDecisions) => ({
    user: playerDecisions.user,
    perCategory: [],
    totalRevenue: 0, totalCogs: 0, totalGrossProfit: 0,
    costBreakdown: {
      riderCost: 0,
      fleetCost: playerDecisions.stepFour?.totalMonthlyCost || 0,
      techCost: playerDecisions.stepFive?.totalTechnologyCost || 0,
      marketingCost: playerDecisions.stepEight?.totalCost || 0,
      hrCost: playerDecisions.stepNine?.totalMonthlyCost || 0,
      // Set by the weekly cycle below, from units actually shipped.
      thirdPartyDeliveryCost: 0
    }
  }));

  for (const category of configs.categories) {
    const enrolledIndexes = decisions
      .map((d, i) => ({ d, i }))
      .filter(({ d }) =>
        d.productCategory?.categories?.some(
          (c) => String(c.categoryId) === String(category._id) && c.enabled
        )
      )
      .map(({ i }) => i);

    if (enrolledIndexes.length === 0) continue;

    const intensity = configs.localCompetitionConfig?.intensityLevels?.[category.localCompetitionIntensity];
    const enrolledScores = enrolledIndexes.map((i) => perPlayerSegmentScores[i]);

    enrolledIndexes.forEach((playerIndex, poolIndex) => {
      const marketShareBySegment = computeMarketShareResult({
        allPlayersSegmentScores: enrolledScores,
        thisPlayerIndex: poolIndex,
        categorySegmentDemand: category.segmentDemand,
        localCompetitionIntensityPercent: intensity
      });

      const segments = {};
      for (const segment of SEGMENTS) {
        segments[segment] = {
          ...marketShareBySegment[segment],
          finalMultiplier: perPlayerCombined[playerIndex].finalMultiplier[segment],
          localScore: perPlayerSegmentScores[playerIndex][segment],
          qualifies: basics[playerIndex].segmentQualification[segment],
          coreScore: perPlayerCombined[playerIndex].base[segment],
          breakdown: perPlayerCombined[playerIndex].breakdownBySegment[segment],
          multipliers: perPlayerCombined[playerIndex].multiplierBySegment[segment]
        };
      }

      results[playerIndex].perCategory.push({
        categoryId: category._id,
        categoryName: category.name,
        segments
      });
    });
  }

  // Supply, warehouse space and delivery are all pooled across every
  // category, so the weekly cycle can only run once each player's full
  // category set is known. This is what turns market share into units sold.
  const reliabilityCfg = configs.supplierReliabilityConfig;
  const thirdPartyCostPerOrder = configs.deliveryConfig?.thirdPartyDelivery?.costPerOrder?.min ?? 0;

  await Promise.all(
    results.map(async (r, playerIndex) => {
      const supplier = decisions[playerIndex].supplier;
      const band = supplier?.reliability != null
        ? (reliabilityCfg?.reliabilityBands || []).find(
            (b) => supplier.reliability >= b.minStars && supplier.reliability <= b.maxStars
          )
        : null;

      const carry = await previousRoundCarryOver(
        decisions[playerIndex].user._id, simulationId, groupId, roundNumber
      );

      const outcome = runWeeklyFulfillment({
        perCategory: r.perCategory,
        weeksPerRound: reliabilityCfg?.weeksPerRound,
        openingInventory: carry.inventory,
        openingBacklog: carry.backlog,
        openingPendingSupply: carry.pendingSupply,
        warehouseCapacity: decisions[playerIndex].productCategory?.warehouseCapacity,
        riderWeeklyCapacity: basics[playerIndex].riderWeeklyCapacity,
        thirdPartyCostPerOrder,
        deliveryTimeWeeks: supplier?.deliveryTimeWeeks || 0,
        steadyStateRate: band?.fulfillmentRate ?? 1,
        rampUpRate: reliabilityCfg?.rampUpFulfillmentRate ?? 1,
        qualityPricing: basics[playerIndex].qualityPricing,
        unitCostBasis: basics[playerIndex].unitCostBasis
      });

      r.totalRevenue = outcome.totalRevenue;
      r.totalCogs = outcome.totalCogs;
      r.totalGrossProfit = outcome.totalGrossProfit;
      r.openingInventory = carry.inventory;
      r.openingBacklog = carry.backlog;
      r.openingPendingSupply = carry.pendingSupply;
      r.closingInventory = outcome.closingInventory;
      r.closingBacklog = outcome.closingBacklog;
      r.closingPendingSupply = outcome.closingPendingSupply;
      r.weeklyFulfillment = outcome.weekly;
      // Third-party delivery is billed on what this player actually shipped
      // beyond their own fleet. Step 4 can only guess at that, so it no
      // longer charges for it — see controllers/stepFour.controller.js.
      r.costBreakdown.thirdPartyDeliveryCost = outcome.thirdPartyCost;
      r.thirdPartyOrders = outcome.thirdPartyOrders;
    })
  );

  results.forEach((r, playerIndex) => {
    const { riderCost, fleetCost, techCost, marketingCost, hrCost, thirdPartyDeliveryCost } = r.costBreakdown;
    const operatingProfitBeforeBonus =
      r.totalGrossProfit -
      (riderCost + fleetCost + techCost + marketingCost + hrCost + (thirdPartyDeliveryCost || 0));

    // Supplier turnover bonus: rewards crossing the chosen supplier's
    // revenue threshold, previously-dead Supplier.turnoverBonusPercent/
    // bonusThreshold fields now actually affect score.
    const supplier = decisions[playerIndex].supplier;
    r.turnoverBonus =
      supplier?.bonusThreshold != null && r.totalRevenue >= supplier.bonusThreshold
        ? r.totalRevenue * ((supplier.turnoverBonusPercent || 0) / 100)
        : 0;

    r.totalOperatingProfit = operatingProfitBeforeBonus + r.turnoverBonus;
    r.score = Math.round(r.totalOperatingProfit);
  });

  results
    .slice()
    .sort((a, b) => b.score - a.score)
    .forEach((r, i) => { r.rank = i + 1; });

  return results;
}

module.exports = { computeRoundScores };
