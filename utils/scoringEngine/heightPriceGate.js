const { forEachSegment } = require("./segments");

// Excel row 82 "Sigmoid New": 100/(1+EXP(-k*(spMultBase-m0))) — fixed
// parameters, NOT group-average-dependent (unlike rows 77/81 in groupStats.js).
// IMPORTANT: the Height-Price GATE (rows 91-94) tests this raw value
// directly (`H$82`); the BASE weighted-sum's "Height Price points" (row
// 110) is a *separate* downstream quantity = 100 - this raw value. Do not
// conflate the two — gating on 100-minus-it inverts who qualifies.
function computeSigmoidNew(scoringConstantsConfig, spMultBase) {
  const { m0, k } = scoringConstantsConfig?.heightPriceSigmoid || {};
  if (m0 == null || k == null) return 50;
  return 100 / (1 + Math.exp(-k * (spMultBase - m0)));
}

// Excel row 110 "Height Price" points = 100 - row 82, used as one of the 4
// weighted components of each segment's BASE score.
function computeHeightPricePoints(sigmoidNew) {
  return 100 - sigmoidNew;
}

// Excel rows 91-94: strict-inequality band that this player's RAW Sigmoid
// New value (row 82, not the derived "points") must fall within to qualify
// to sell into that segment.
function computeSegmentQualification(scoringConstantsConfig, sigmoidNew) {
  const bands = scoringConstantsConfig?.heightPriceGateBands;
  return forEachSegment((segment) => {
    const band = bands?.[segment];
    if (!band || band.min == null || band.max == null) return false;
    return sigmoidNew > band.min && sigmoidNew < band.max;
  });
}

module.exports = { computeSigmoidNew, computeHeightPricePoints, computeSegmentQualification };
