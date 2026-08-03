// Excel rows 32/64 "Total investment/average": a bonus/penalty multiplier
// applied uniformly across all 4 segments, based on whether this player's
// total spend for the step is below the group's average spend for that
// step. Shared by Technology (row 32) and Marketing (row 64) — Delivery and
// HR have no equivalent term.
function computeCompetitiveAverageMultiplier(totalInvestmentAverageConfig, playerTotalCost, groupAverageCost) {
  if (!totalInvestmentAverageConfig) return 1;
  const { belowAverageMultiplier, atOrAboveAverageMultiplier } = totalInvestmentAverageConfig;
  const below = belowAverageMultiplier ?? 1;
  const atOrAbove = atOrAboveAverageMultiplier ?? 1;
  return playerTotalCost < groupAverageCost ? below : atOrAbove;
}

module.exports = { computeCompetitiveAverageMultiplier };
