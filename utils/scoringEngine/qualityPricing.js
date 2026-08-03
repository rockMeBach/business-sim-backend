// Excel Step 7 (rows 76-82). "SP Mult" (row 79) is a free player choice —
// NOT derived from quality level — so it's read from the caller's
// PricingDecision.categories[].marginMultiplier, not looked up here.
const ALL_SEGMENTS = ["premium", "standard", "basic", "discount"];

function computeQualityPricing(pricingConfig, qualityLevel, spMult) {
  const tier = pricingConfig?.qualityTiers?.get(String(qualityLevel));
  const cpMult = tier?.cpMult ?? 1;
  const eligibleSegments = tier?.eligibleSegments ?? ALL_SEGMENTS;
  const effectiveSpMult = spMult || 1;
  const spMultBase = cpMult * effectiveSpMult;

  // Excel rows 96-103 "Actual Quality": a fixed lookup table over quality
  // levels 1..maxBaseQuality — not group-dependent (unlike rows 77/81).
  const { avg, stdev } = pricingConfig?.sigmoid || {};
  const actualQualityPoints = avg != null && stdev
    ? 100 / (1 + Math.exp(-((qualityLevel - avg) / stdev)))
    : 50;

  return {
    cpMult,
    spMult: effectiveSpMult,
    spMultBase,
    actualQualityPoints,
    eligibleSegments,
    baseUnitPrice: pricingConfig?.baseUnitPrice || 0
  };
}

module.exports = { computeQualityPricing };
