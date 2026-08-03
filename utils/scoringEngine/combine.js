const { SEGMENTS, forEachSegment } = require("./segments");
const { sigmoid } = require("./groupStats");

/**
 * Combines every step's per-segment multiplier plus the quality/pricing and
 * height-price-gate outputs into a per-segment BASE score, Final Multiplier,
 * and segmentScore (Excel rows 106-157) for ONE player.
 *
 * Matches the workbook's row-144 `=PRODUCT(V85,V68,V51,V23,V10)` exactly —
 * 5 terms, no Sourcing. The reference sheet's Sourcing table (rows 38-47)
 * was never wired into any player's column. Sourcing still affects score
 * through the chosen supplier's costPerUnit (COGS) and turnover bonus,
 * just not through this multiplier chain.
 */
function combinePlayerSegmentScores({
  stepMultipliers, // { delivery, technology, marketing, hrOps } each {premium,standard,basic,discount}
  competitiveAverage, // { technology, marketing } each a single scalar
  othersMultiplier, // scalar, e.g. 2.2525
  qualityPricing, // { spMultBase, actualQualityPoints }
  thisPlayerQualityLevel,
  groupQualityLevelStats, // { avg, stdev } over ALL players' chosen quality levels (row 77 basis)
  groupSpMultBaseStats, // { avg, stdev } over ALL players' spMultBase (row 81 basis)
  heightPricePoints,
  segmentQualification, // { premium, standard, basic, discount } booleans
  weights // ScoringConstantsConfig: { sellingPriceWeight, competitiveQualityWeight, actualQualityWeight, heightPriceWeight }
}) {
  // Row 108 "Competitive Quality" points: group-relative sigmoid over
  // everyone's chosen quality LEVEL this round.
  const competitiveQualityPoints = sigmoid(
    thisPlayerQualityLevel,
    groupQualityLevelStats.avg,
    groupQualityLevelStats.stdev
  );

  // Row 107 "Selling Price" points: 100 - group-relative sigmoid over
  // everyone's SP-Mult-Base this round.
  const sellingPriceSigmoid = sigmoid(
    qualityPricing.spMultBase,
    groupSpMultBaseStats.avg,
    groupSpMultBaseStats.stdev
  );
  const sellingPricePoints = 100 - sellingPriceSigmoid;

  const actualQualityPoints = qualityPricing.actualQualityPoints;

  // Excel rows 96-103 (cols B-E): a player's quality level only earns
  // SellingPrice/CompetitiveQuality/ActualQuality BASE points in the 1-2
  // segments that level is eligible for — every other segment gets only
  // the Height-Price term (rows 115-130 are blank there, row 132-136 is
  // filled for every player/segment unconditionally).
  const eligibleSegments = qualityPricing.eligibleSegments ?? SEGMENTS;

  // Per-segment breakdown of the 4 weighted terms that sum to `base`,
  // shaped to match the frontend's existing Breakdown type directly
  // (keyIndicator/achievedPoints/multiplier/totalScore) so the Analysis
  // page's "Core Score Breakdown" panel can show these real numbers with
  // no shape translation needed.
  const breakdownBySegment = forEachSegment((segment) => {
    const qualifiesForTierTerms = eligibleSegments.includes(segment);
    const rows = [
      {
        keyIndicator: "Selling Price Advantage",
        achievedPoints: qualifiesForTierTerms ? sellingPricePoints : 0,
        weight: weights.sellingPriceWeight?.[segment] ?? 0
      },
      {
        keyIndicator: "Competitive Quality",
        achievedPoints: qualifiesForTierTerms ? competitiveQualityPoints : 0,
        weight: weights.competitiveQualityWeight?.[segment] ?? 0
      },
      {
        keyIndicator: "Actual Quality",
        achievedPoints: qualifiesForTierTerms ? actualQualityPoints : 0,
        weight: weights.actualQualityWeight?.[segment] ?? 0
      },
      {
        keyIndicator: "Height-Price Fit",
        achievedPoints: heightPricePoints,
        weight: weights.heightPriceWeight?.[segment] ?? 0
      }
    ];
    return rows.map((row) => ({
      keyIndicator: row.keyIndicator,
      achievedPoints: row.achievedPoints,
      multiplier: row.weight,
      totalScore: row.achievedPoints * row.weight
    }));
  });

  const base = forEachSegment((segment) =>
    breakdownBySegment[segment].reduce((sum, row) => sum + row.totalScore, 0)
  );

  // Per-segment breakdown of the multiplier chain (row-144 PRODUCT terms),
  // shaped to match the frontend's existing Multiplier type directly
  // (title/description/value).
  const multiplierBySegment = forEachSegment((segment) => [
    {
      title: "HR & Operations",
      description: "Corporate team size, education budget, and rider bonus budget",
      value: stepMultipliers.hrOps[segment]
    },
    {
      title: "Marketing",
      description: "Marketing spend vs. the group average",
      value: stepMultipliers.marketing[segment] * competitiveAverage.marketing
    },
    {
      title: "Technology",
      description: "Technology investment vs. the group average",
      value: stepMultipliers.technology[segment] * competitiveAverage.technology
    },
    {
      title: "Delivery & Logistics",
      description: "Fleet setup and logistics optimization choices",
      value: stepMultipliers.delivery[segment]
    },
    {
      title: "Other Factors",
      description: "Focus, new-player-in-segment, and R&D investment",
      value: othersMultiplier
    }
  ]);

  const stepsProduct = forEachSegment((segment) =>
    othersMultiplier *
    stepMultipliers.hrOps[segment] *
    stepMultipliers.marketing[segment] * competitiveAverage.marketing *
    stepMultipliers.technology[segment] * competitiveAverage.technology *
    stepMultipliers.delivery[segment]
  );

  const finalMultiplier = forEachSegment((segment) =>
    stepsProduct[segment] * (segmentQualification[segment] ? 1 : 0)
  );

  const segmentScore = forEachSegment((segment) => base[segment] * finalMultiplier[segment]);

  return { base, finalMultiplier, segmentScore, breakdownBySegment, multiplierBySegment };
}

module.exports = { combinePlayerSegmentScores, SEGMENTS };
