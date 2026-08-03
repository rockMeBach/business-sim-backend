const { forEachSegment } = require("./segments");

// Maps PlayerStepFour.logisticsOptimization's boolean field names onto
// DeliveryConfig.logisticsOptimization's option keys (Excel rows 13-16).
const OPTION_FIELD_TO_CONFIG_KEY = {
  routeOptimization: "routeOptimization",
  realTimeTracking: "gpsTracking",
  batchingAlgorithm: "algorithmAssignment",
  hyperlocalWarehousing: "warehousingSystem"
};

// Excel row 17 "Electric Bikes %": 1 + (spend * rate) / (costMultiplier * bikeCost),
// where spend = percentage * bikesPerCity * bikeCost * costMultiplier.
function computeElectricBikeMultiplier(deliveryConfig, deliveryFleet) {
  const electricBikes = deliveryFleet?.electricBikes;
  if (!electricBikes?.enabled) return 1;

  const percentage = electricBikes.percentage || 0; // stored as a 0-1 fraction
  const bikes = deliveryFleet.bikesPerCity || 0;
  const evConfig = deliveryConfig.ownFleet?.electricBikeConfig || {};
  const rate = evConfig.electricBikePercent || 0;         // Excel C17
  const costMultiplier = evConfig.electricBikeCostMultiplier || 1; // Excel D17
  const bikeCost = deliveryConfig.ownFleet?.bikeCost?.min || 0;    // Excel D12

  if (bikeCost === 0 || costMultiplier === 0) return 1;

  const spend = percentage * bikes * bikeCost * costMultiplier; // Excel O17
  return 1 + (spend * rate) / (costMultiplier * bikeCost);
}

/**
 * Delivery step multiplier (Excel Step 2, row 10 PRODUCT(V13:V18)).
 * Returns { premium, standard, basic, discount }. Tolerates a missing
 * stepFourDoc (neutral 1.0 for every segment).
 */
function computeDeliveryStepMultiplier(deliveryConfig, stepFourDoc) {
  if (!deliveryConfig || !stepFourDoc) {
    return forEachSegment(() => 1);
  }

  const logisticsSelected = stepFourDoc.logisticsOptimization || {};
  const logisticsConfig = deliveryConfig.logisticsOptimization || {};

  // Excel row 10 (`=PRODUCT(V13:V18)`) is a single scalar per player, applied
  // identically to all 4 segments (rows 145-148 are identical across
  // segments for every player) — "Applies To" text next to an option (e.g.
  // "GPS Tracking: Premium, Standard") is cosmetic only and does NOT gate
  // the multiplier per segment. `multiplierBySegment` is only read at its
  // `.premium` value here to stay uniform.
  let optionsMultiplier = 1;
  for (const [fieldName, configKey] of Object.entries(OPTION_FIELD_TO_CONFIG_KEY)) {
    const selected = !!logisticsSelected[fieldName];
    const optionConfig = logisticsConfig[configKey];
    if (selected && optionConfig?.cost > 0) {
      optionsMultiplier *= optionConfig.multiplierBySegment?.premium ?? 1;
    }
  }

  const evMultiplier = computeElectricBikeMultiplier(deliveryConfig, stepFourDoc.deliveryFleet);
  // Bike-Rider Optimization (row 18) is already computed & stored by
  // stepFour.controller.js — reuse it rather than recomputing, and apply it
  // uniformly across segments (the Excel doesn't split it by segment).
  const bikeRiderMultiplier = stepFourDoc.bikeRiderOptimization?.multiplier ?? 1;

  const total = optionsMultiplier * evMultiplier * bikeRiderMultiplier;
  return forEachSegment(() => total);
}

module.exports = { computeDeliveryStepMultiplier };
