const { SEGMENTS } = require("./segments");

/**
 * Excel rows 157-184 (per segment):
 *   Market Share = segmentScore_i / (SUM(everyone's segmentScore) * (1 + intensity%))
 *   — the (1+intensity%) inflates the denominator to represent an implicit
 *     "rest of the local market" outside this named group of players
 *     (confirmed against the workbook: at Med intensity 0.25, the 6 named
 *     players' shares sum to 1/(1+0.25) = 0.8, matching cell AB163 exactly).
 *   Expected Sale    = Market Share * category's segment demand (Step 1 table)
 *   Actual Sold      = Expected Sale * supplier fulfillment rate (Excel "Supplier" sheet)
 *   Wasted Demand    = Expected Sale - Actual Sold
 *   Expected Revenue = Actual Sold * SP-Mult-Base * baseUnitPrice
 *   COGS             = Actual Sold * CP-Mult * unitCostBasis
 *   Gross Profit     = Expected Revenue - COGS
 *
 * Deliberate additions vs. the literal workbook (Round1's own rows 157-184
 * never reference the separate "Supplier" tab, and always used raw Expected
 * Sale for revenue/COGS with no supplier-choice consequence):
 *   1. COGS's unit-cost basis is the chosen supplier's `costPerUnit` (falls
 *      back to `baseUnitPrice` if no supplier was selected) rather than
 *      always `baseUnitPrice`.
 *   2. Revenue/COGS/gross-profit are now driven by Actual Sold rather than
 *      raw Expected Sale — grafting in the "Supplier" sheet's reliability +
 *      lead-time stockout model (utils/scoringEngine/supplierFulfillment.js)
 *      so a slower/less-reliable supplier costs real revenue, not just a
 *      COGS-per-unit and turnover-bonus difference.
 *
 * @param allPlayersSegmentScores Array<{ premium, standard, basic, discount }>
 *   — every player in the group's segmentScore for this category.
 * @param thisPlayerIndex index of the player being scored within that array.
 * @param categorySegmentDemand { premium, standard, basic, discount } for this category.
 * @param localCompetitionIntensityPercent { premium, standard, basic, discount }.
 * @param qualityPricing { spMultBase, cpMult, baseUnitPrice } for this player.
 * @param unitCostBasis rupee cost per unit used for COGS (supplier.costPerUnit, or baseUnitPrice as fallback).
 * @param fulfillmentRate fraction (0,1] of Expected Sale the chosen supplier can actually deliver this round.
 */
function computeMarketShareResult({
  allPlayersSegmentScores,
  thisPlayerIndex,
  categorySegmentDemand,
  localCompetitionIntensityPercent,
  qualityPricing,
  unitCostBasis,
  fulfillmentRate
}) {
  const result = {};
  const cogsUnitCost = unitCostBasis ?? qualityPricing.baseUnitPrice;
  const rate = fulfillmentRate ?? 1;

  for (const segment of SEGMENTS) {
    const thisScore = allPlayersSegmentScores[thisPlayerIndex][segment];
    const totalScore = allPlayersSegmentScores.reduce((sum, s) => sum + s[segment], 0);
    const intensity = localCompetitionIntensityPercent?.[segment] ?? 0;
    const denominator = totalScore * (1 + intensity);

    const totalMarketSize = categorySegmentDemand?.[segment] ?? 0;
    const marketShare = denominator > 0 ? thisScore / denominator : 0;
    const expectedSale = marketShare * totalMarketSize;
    const actualSold = expectedSale * rate;
    const wastedDemand = expectedSale - actualSold;
    const expectedRevenue = actualSold * qualityPricing.spMultBase * qualityPricing.baseUnitPrice;
    const cogs = actualSold * qualityPricing.cpMult * cogsUnitCost;
    const grossProfit = expectedRevenue - cogs;

    result[segment] = {
      marketShare, expectedSale, actualSold, wastedDemand,
      expectedRevenue, cogs, grossProfit, totalMarketSize
    };
  }

  return result;
}

module.exports = { computeMarketShareResult };
