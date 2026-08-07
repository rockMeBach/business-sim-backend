// STEP 2 — Bike-Rider Optimization (Excel row 18).
// V18 = IF(riders/bikes < low, below, IF(riders/bikes > high, above, optimal))
const DEFAULT_BIKE_RIDER_BANDS = {
  lowThreshold: 2.5,
  highThreshold: 3.5,
  belowMultiplier: 0.85,
  optimalMultiplier: 1.05,
  aboveMultiplier: 0.95
};

function computeBikeRiderOptimization(config, deliveryFleet) {
  const bands = { ...DEFAULT_BIKE_RIDER_BANDS, ...(config.bikeRiderRatioBands || {}) };
  const riders = deliveryFleet?.ridersPerCity || 0;
  const bikes = deliveryFleet?.bikesPerCity || 0;

  // Only meaningful with an own fleet that actually has bikes and riders.
  if (!deliveryFleet?.ownFleet || riders <= 0 || bikes <= 0) {
    return { ratio: 0, multiplier: 1, band: "n/a" };
  }

  const ratio = riders / bikes;
  let multiplier;
  let band;
  if (ratio < bands.lowThreshold) {
    multiplier = bands.belowMultiplier;
    band = "underutilized"; // too many bikes for the number of riders
  } else if (ratio > bands.highThreshold) {
    multiplier = bands.aboveMultiplier;
    band = "overloaded"; // too few bikes for the number of riders
  } else {
    multiplier = bands.optimalMultiplier;
    band = "optimal";
  }

  return { ratio: Math.round(ratio * 100) / 100, multiplier, band };
}

exports.computeBikeRiderOptimization = computeBikeRiderOptimization;

exports.calculateDeliveryImpact = ({
  config,
  deliveryFleet,
  logisticsOptimization,
  // Total demand (sum of ProductCategory.baseMonthlyDemand across active
  // categories) a fleet needs to cover before third-party delivery kicks
  // in. Was hardcoded to 50000, disconnected from the real per-round total
  // (10650 with the seeded Food/Mobile/Clothes categories) — every player's
  // fleet, even at DeliveryConfig's own advertised max (20 riders/10
  // bikes, 15000 capacity), was guaranteed to trigger a massive third-party
  // penalty regardless of choice. Falls back to the old constant if the
  // caller doesn't have category data on hand.
  estimatedMonthlyDemand = 50000
}) => {

  let cost = 0;
  let electricBikeCost = 0;
  let kpis = {
    deliveryQuality: 50,
    coverage: 50,
    sustainability: 40,
    flexibility: 40,

    deliverySpeed: 50,
    costEfficiency: 50,
    scalability: 50,
    customerSatisfaction: 50,
    brandPerception: 45,

    operationalComplexity: 40,
    riskExposure: 40
  };

  let ownFleetCapacity = 0;

  if (deliveryFleet.ownFleet) {
    kpis.deliveryQuality += 15;
    kpis.brandPerception += 10;
    kpis.operationalComplexity += 15;
    kpis.scalability -= 10;
    kpis.riskExposure -= 10;
    const riderCost =
      deliveryFleet.ridersPerCity *
      config.ownFleet.riderCostPerMonth.min;

    cost += riderCost;

    if (riderCost > 0) {
      kpis.coverage += Math.min(25, deliveryFleet.ridersPerCity / 40);
      kpis.deliverySpeed += 10;
    }
    const bikeCost =
      deliveryFleet.bikesPerCity *
      config.ownFleet.bikeCost.min;

    cost += bikeCost;

    if (bikeCost > 0) {
      kpis.coverage += Math.min(15, deliveryFleet.bikesPerCity / 80);
    }

 
    ownFleetCapacity =
      (deliveryFleet.ridersPerCity * 15 +
        deliveryFleet.bikesPerCity * 20) *
      30;
    if (deliveryFleet.electricBikes?.enabled) {
      const electricBikeCost =
        config.ownFleet.bikeCost.min *
        deliveryFleet.bikesPerCity *
        config.ownFleet.electricBikeConfig.electricBikeCostMultiplier *
        (deliveryFleet.electricBikes.percentage / 100);

      cost += electricBikeCost;

      if (electricBikeCost > 0) {
        kpis.sustainability += deliveryFleet.electricBikes.percentage / 4;
        kpis.brandPerception += 10;
        kpis.operationalComplexity += 5;
      }
    }
  }


  // estimatedMonthlyDemand is the WHOLE market's demand, not this player's —
  // Step 4 runs before any competition has happened, so it cannot know what
  // this player will actually win. That made third-party delivery a flat
  // ~₹2.7L charge every player paid identically whether they shipped 300
  // units or 2,400.
  //
  // The real bill is now raised by the scoring engine, which prices it off
  // units this player genuinely shipped beyond their own fleet
  // (utils/scoringEngine/weeklyFulfillment.js). What's computed here is an
  // indicative figure for the Step 4 screen only, and is NOT added to `cost`.
  const excessDemand = Math.max(0, estimatedMonthlyDemand - ownFleetCapacity);
  const thirdPartyIsUsed = excessDemand > 0;

  let thirdPartyDetails = {
    isUsed: thirdPartyIsUsed,
    ordersHandled: excessDemand,
    cost: 0,
    isEstimate: true
  };

  if (thirdPartyIsUsed) {
    thirdPartyDetails.cost = excessDemand * config.thirdPartyDelivery.costPerOrder.min;

    if (thirdPartyDetails.cost > 0) {
      kpis.flexibility += 20;
      kpis.scalability += 20;
      kpis.deliveryQuality -= 5;
      kpis.riskExposure += 15;
      kpis.costEfficiency -= 5;
      kpis.customerSatisfaction -= 10;
    }
  }

  if (logisticsOptimization.routeOptimization) {
    const routeCost =
      config.logisticsOptimization.routeOptimization.cost;

    cost += routeCost;

    if (routeCost > 0) {
      kpis.deliverySpeed += 10;
      kpis.coverage += 5;
      kpis.costEfficiency += 10;
    }
  }

  if (logisticsOptimization.realTimeTracking) {
    const gpsCost =
      config.logisticsOptimization.gpsTracking.cost;

    cost += gpsCost;

    if (gpsCost > 0) {
      kpis.deliveryQuality += 10;
      kpis.customerSatisfaction += 15;
      kpis.brandPerception += 15;
    }
  }

  if (logisticsOptimization.batchingAlgorithm) {
    const algoCost =
      config.logisticsOptimization.algorithmAssignment.cost;

    cost += algoCost;

    if (algoCost > 0) {
      kpis.costEfficiency += 15;
      kpis.flexibility += 10;
      kpis.deliverySpeed -= 5;
    }
  }

  if (logisticsOptimization.hyperlocalWarehousing) {
    const wareCost =
      config.logisticsOptimization.warehousingSystem.cost;

    cost += wareCost;

    if (wareCost > 0) {
      kpis.coverage += 12;
      kpis.scalability += 15;
      kpis.riskExposure -= 5;
    }
  }


  kpis.customerSatisfaction = Math.min(
    100,
    Math.round(
      kpis.deliveryQuality * 0.4 +
      kpis.deliverySpeed * 0.3 +
      kpis.brandPerception * 0.3
    )
  );


  Object.keys(kpis).forEach(key => {
    kpis[key] = Math.max(0, Math.min(100, Math.round(kpis[key])));
  });

  const bikeRiderOptimization = computeBikeRiderOptimization(config, deliveryFleet);

  return {
    totalCost: Math.round(cost),
     electricBikeCost,
    kpis,
    bikeRiderOptimization,
    thirdPartyDetails,
    capacityInfo: {
      ownFleetCapacity,
      estimatedDemand: estimatedMonthlyDemand,
      excessDemand
    }
  };
};
