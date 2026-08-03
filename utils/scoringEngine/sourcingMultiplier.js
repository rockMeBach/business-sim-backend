const { forEachSegment } = require("./segments");

// Excel Step 4 (rows 38-47): only the supplier's `sustainability` star
// rating feeds a multiplier — applied to Premium via `premiumMultiplier`,
// and to Standard/Basic/Discount ("Mass") via `massMultiplier`.
function findBand(bands, stars) {
  return (bands || []).find((band) => stars >= band.minStars && stars <= band.maxStars);
}

/**
 * Sourcing step multiplier. Returns { premium, standard, basic, discount }.
 * Tolerates a missing sourcing selection or supplier doc (neutral 1.0).
 */
function computeSourcingStepMultiplier(sourcingMultiplierConfig, supplierDoc) {
  if (!sourcingMultiplierConfig || !supplierDoc) {
    return forEachSegment(() => 1);
  }

  const band = findBand(sourcingMultiplierConfig.sustainabilityBands, supplierDoc.sustainability);
  if (!band) {
    return forEachSegment(() => 1);
  }

  return {
    premium: band.premiumMultiplier,
    standard: band.massMultiplier,
    basic: band.massMultiplier,
    discount: band.massMultiplier
  };
}

module.exports = { computeSourcingStepMultiplier };
