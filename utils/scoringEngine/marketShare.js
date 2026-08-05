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
 *
 * Warehouse capacity is NOT applied here — it is one shared cap across every
 * category, so it can only be enforced once all categories are known. See
 * applyPooledWarehouseCapacity below.
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

/**
 * One warehouse serves every category, so the monthly capacity a player
 * enters is a single pooled cap on total units moved — not a per-category
 * one. If combined actualSold across every category AND segment exceeds it,
 * each segment absorbs the cut proportionally to its own pre-cap actualSold,
 * so no category or segment is favored/starved outright. Shaved-off units
 * join wastedDemand (same treatment as a supplier fulfillment shortfall) and
 * revenue/COGS/grossProfit are recomputed off the reduced actualSold.
 *
 * Mutates `perCategory` in place and returns the post-cap totals so callers
 * don't have to re-derive them.
 *
 * @param perCategory Array<{ segments: { premium, standard, basic, discount } }> for ONE player.
 * @param warehouseCapacity pooled units/month cap; null/undefined means uncapped.
 * @param qualityPricing { spMultBase, cpMult, baseUnitPrice } for this player.
 * @param unitCostBasis rupee cost per unit used for COGS.
 */
function applyPooledWarehouseCapacity({ perCategory, warehouseCapacity, qualityPricing, unitCostBasis }) {
  const cogsUnitCost = unitCostBasis ?? qualityPricing.baseUnitPrice;

  const totalActualSold = perCategory.reduce(
    (sum, cat) => sum + SEGMENTS.reduce((s, seg) => s + cat.segments[seg].actualSold, 0),
    0
  );

  const capped = warehouseCapacity != null && warehouseCapacity >= 0 && totalActualSold > warehouseCapacity;
  const scale = capped ? (totalActualSold > 0 ? warehouseCapacity / totalActualSold : 0) : 1;

  let totalRevenue = 0, totalCogs = 0, totalGrossProfit = 0;

  for (const cat of perCategory) {
    for (const segment of SEGMENTS) {
      const seg = cat.segments[segment];

      if (capped) {
        const cappedActualSold = seg.actualSold * scale;
        seg.wastedDemand += seg.actualSold - cappedActualSold;
        seg.actualSold = cappedActualSold;
        seg.expectedRevenue = cappedActualSold * qualityPricing.spMultBase * qualityPricing.baseUnitPrice;
        seg.cogs = cappedActualSold * qualityPricing.cpMult * cogsUnitCost;
        seg.grossProfit = seg.expectedRevenue - seg.cogs;
      }

      totalRevenue += seg.expectedRevenue;
      totalCogs += seg.cogs;
      totalGrossProfit += seg.grossProfit;
    }
  }

  return { totalRevenue, totalCogs, totalGrossProfit };
}

module.exports = { computeMarketShareResult, applyPooledWarehouseCapacity };
