exports.calculateDeliveryImpact = ({
  config,
  deliveryFleet,
  logisticsOptimization
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
    cost += config.ownFleet.setupCost.min;

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


  const estimatedMonthlyDemand = 50000;
  const excessDemand = Math.max(0, estimatedMonthlyDemand - ownFleetCapacity);
  const thirdPartyIsUsed = excessDemand > 0;

  let thirdPartyDetails = {
    isUsed: thirdPartyIsUsed,
    ordersHandled: excessDemand,
    cost: 0
  };

  if (thirdPartyIsUsed) {
    const thirdPartyCost =
      excessDemand *
      config.thirdPartyDelivery.costPerOrder.min;

    cost += thirdPartyCost;
    thirdPartyDetails.cost = thirdPartyCost;

    if (thirdPartyCost > 0) {
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

  return {
    totalCost: Math.round(cost),
     electricBikeCost,
    kpis,
    thirdPartyDetails,
    capacityInfo: {
      ownFleetCapacity,
      estimatedDemand: estimatedMonthlyDemand,
      excessDemand
    }
  };
};
