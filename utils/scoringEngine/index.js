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

const { fetchGroupRoundDecisions } = require("./fetchDecisions");
const { computeDeliveryStepMultiplier } = require("./deliveryMultiplier");
const { computeTechnologyOptionsMultiplier } = require("./technologyMultiplier");
const { computeMarketingOptionsMultiplier } = require("./marketingMultiplier");
const { computeCorporateTeamSpend, computeHROpsStepMultiplier } = require("./hrOpsMultiplier");
const { computeCompetitiveAverageMultiplier } = require("./competitiveAverage");
const { computeQualityPricing } = require("./qualityPricing");
const { computeSigmoidNew, computeHeightPricePoints, computeSegmentQualification } = require("./heightPriceGate");
const { average, sampleStdev, minMax } = require("./groupStats");
const { combinePlayerSegmentScores } = require("./combine");
const { computeMarketShareResult } = require("./marketShare");
const { computeFulfillmentRate } = require("./supplierFulfillment");
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
    categories
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
    ProductCategory.find({ isActive: true })
  ]);

  return {
    deliveryConfig, technologyConfig, marketingConfig,
    hrOpsMultiplierConfig, operationsStaffingConfig, pricingConfig,
    localCompetitionConfig, scoringConstantsConfig, supplierReliabilityConfig, categories
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
  const segmentQualification = computeSegmentQualification(configs.scoringConstantsConfig, sigmoidNew);

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
  const fulfillmentRate = computeFulfillmentRate(configs.supplierReliabilityConfig, playerDecisions.supplier);

  return {
    qualityLevel, stepMultipliers, qualityPricing, heightPricePoints,
    segmentQualification, corporateSpend, techCost, marketingCost,
    othersMultiplier, unitCostBasis, fulfillmentRate
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
      corporateSpendMinMax,
      {
        ridersPerCity: playerDecisions.stepFour?.deliveryFleet?.ridersPerCity,
        riderCostPerMonth: configs.deliveryConfig?.ownFleet?.riderCostPerMonth?.min
      }
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
      hrCost: playerDecisions.stepNine?.totalMonthlyCost || 0
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
      const playerCategoryEntry = decisions[playerIndex].productCategory?.categories?.find(
        (c) => String(c.categoryId) === String(category._id)
      );

      const marketShareBySegment = computeMarketShareResult({
        allPlayersSegmentScores: enrolledScores,
        thisPlayerIndex: poolIndex,
        categorySegmentDemand: category.segmentDemand,
        localCompetitionIntensityPercent: intensity,
        qualityPricing: basics[playerIndex].qualityPricing,
        unitCostBasis: basics[playerIndex].unitCostBasis,
        fulfillmentRate: basics[playerIndex].fulfillmentRate,
        warehouseCapacity: playerCategoryEntry?.warehouseCapacity
      });

      const segments = {};
      let categoryRevenue = 0, categoryCogs = 0, categoryGrossProfit = 0;
      for (const segment of SEGMENTS) {
        const m = marketShareBySegment[segment];
        segments[segment] = {
          ...m,
          finalMultiplier: perPlayerCombined[playerIndex].finalMultiplier[segment],
          localScore: perPlayerSegmentScores[playerIndex][segment],
          qualifies: basics[playerIndex].segmentQualification[segment],
          coreScore: perPlayerCombined[playerIndex].base[segment],
          breakdown: perPlayerCombined[playerIndex].breakdownBySegment[segment],
          multipliers: perPlayerCombined[playerIndex].multiplierBySegment[segment]
        };
        categoryRevenue += m.expectedRevenue;
        categoryCogs += m.cogs;
        categoryGrossProfit += m.grossProfit;
      }

      results[playerIndex].perCategory.push({
        categoryId: category._id,
        categoryName: category.name,
        segments
      });
      results[playerIndex].totalRevenue += categoryRevenue;
      results[playerIndex].totalCogs += categoryCogs;
      results[playerIndex].totalGrossProfit += categoryGrossProfit;
    });
  }

  results.forEach((r, playerIndex) => {
    const { riderCost, fleetCost, techCost, marketingCost, hrCost } = r.costBreakdown;
    const operatingProfitBeforeBonus = r.totalGrossProfit - (riderCost + fleetCost + techCost + marketingCost + hrCost);

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
