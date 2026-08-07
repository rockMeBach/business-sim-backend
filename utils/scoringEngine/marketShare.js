const { SEGMENTS } = require("./segments");

/**
 * Excel rows 157-184 (per segment):
 *   Market Share = segmentScore_i / (SUM(everyone's segmentScore) * (1 + intensity%))
 *   — the (1+intensity%) inflates the denominator to represent an implicit
 *     "rest of the local market" outside this named group of players
 *     (confirmed against the workbook: at Med intensity 0.25, the 6 named
 *     players' shares sum to 1/(1+0.25) = 0.8, matching cell AB163 exactly).
 *   Expected Sale    = Market Share * category's segment demand (Step 1 table)
 *
 * This function stops at Expected Sale — the demand the market awards. What
 * fraction of it a player can actually supply, store and deliver is decided
 * week by week in weeklyFulfillment.js, which writes actualSold /
 * wastedDemand / revenue / COGS / grossProfit back onto these same segment
 * objects. It has to run later because supply, warehouse space and rider
 * capacity are all pooled across every category at once.
 *
 * @param allPlayersSegmentScores Array<{ premium, standard, basic, discount }>
 *   — every player in the group's segmentScore for this category.
 * @param thisPlayerIndex index of the player being scored within that array.
 * @param categorySegmentDemand { premium, standard, basic, discount } for this category.
 * @param localCompetitionIntensityPercent { premium, standard, basic, discount }.
 */
function computeMarketShareResult({
  allPlayersSegmentScores,
  thisPlayerIndex,
  categorySegmentDemand,
  localCompetitionIntensityPercent
}) {
  const result = {};

  for (const segment of SEGMENTS) {
    const thisScore = allPlayersSegmentScores[thisPlayerIndex][segment];
    const totalScore = allPlayersSegmentScores.reduce((sum, s) => sum + s[segment], 0);
    const intensity = localCompetitionIntensityPercent?.[segment] ?? 0;
    const denominator = totalScore * (1 + intensity);

    const totalMarketSize = categorySegmentDemand?.[segment] ?? 0;
    const marketShare = denominator > 0 ? thisScore / denominator : 0;

    result[segment] = {
      marketShare,
      expectedSale: marketShare * totalMarketSize,
      totalMarketSize,
      // Filled in by runWeeklyFulfillment.
      actualSold: 0, wastedDemand: 0, expectedRevenue: 0, cogs: 0, grossProfit: 0
    };
  }

  return result;
}

module.exports = { computeMarketShareResult };
