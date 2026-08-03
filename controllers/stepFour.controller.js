const PlayerStepFour = require("../models/PlayerStepFour");
const DeliveryConfig = require("../models/DeliveryConfig");
const ProductCategory = require("../models/ProductCategory");
const {
  calculateDeliveryImpact,
  computeBikeRiderOptimization
} = require("../utils/deliveryImpactCalculator");

// Real per-round demand a fleet needs to cover, replacing what used to be a
// flat hardcoded 50000 disconnected from the actual seeded categories.
async function getEstimatedMonthlyDemand() {
  const categories = await ProductCategory.find({ isActive: true }, "baseMonthlyDemand");
  return categories.reduce((sum, c) => sum + (c.baseMonthlyDemand || 0), 0);
}

exports.saveStepFour = async (req, res) => {
  try {
    const {
      userId,
      simulationId,
      roundNumber,
      deliveryFleet,
      logisticsOptimization
    } = req.body;

    if (!userId || !simulationId || !roundNumber) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const config = await DeliveryConfig.findOne();
    if (!config) {
      return res.status(500).json({ message: "Delivery config missing" });
    }

    const result = calculateDeliveryImpact({
      config,
      deliveryFleet,
      logisticsOptimization,
      estimatedMonthlyDemand: await getEstimatedMonthlyDemand()
    });

   if (deliveryFleet.electricBikes?.enabled) {
  deliveryFleet.electricBikes.electricBikeCost =
    result.electricBikeCost || 0;
}


    const saved = await PlayerStepFour.findOneAndUpdate(
      { userId, simulationId, roundNumber },
      {
        deliveryFleet,
        logisticsOptimization,
        bikeRiderOptimization: result.bikeRiderOptimization,
        totalMonthlyCost: result.totalCost,
        kpis: result.kpis
      },
      { upsert: true, new: true }
    );

    res.json({
      message: "STEP-4 saved successfully",
      data: saved
    });

  } catch (err) {
    console.error("STEP-4 ERROR:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.calculateStepFour = async (req, res) => {
  try {
    const {
      deliveryFleet,
      logisticsOptimization
    } = req.body;

    const config = await DeliveryConfig.findOne();
    if (!config) {
      return res.status(500).json({ message: "Delivery config missing" });
    }
    let deliveryFleetImpact = {
      cost: 0,
      kpis: {}
    };

    let ownFleetCapacity = 0;
    let electricBikeCost = 0;

    if (deliveryFleet.ownFleet) {
      deliveryFleetImpact.cost +=
        deliveryFleet.ridersPerCity *
        config.ownFleet.riderCostPerMonth.min;

      deliveryFleetImpact.cost +=
        deliveryFleet.bikesPerCity *
        config.ownFleet.bikeCost.min;

      deliveryFleetImpact.kpis.quality = 25;
      deliveryFleetImpact.kpis.coverage = Math.min(
        30,
        Math.floor(deliveryFleet.ridersPerCity / 50)
      );

      ownFleetCapacity =
        (deliveryFleet.ridersPerCity * 15 +
          deliveryFleet.bikesPerCity * 20) *
        30;

      if (deliveryFleet.electricBikes?.enabled) {
        electricBikeCost =
          config.ownFleet.bikeCost.min *
          deliveryFleet.bikesPerCity *
          config.ownFleet.electricBikeConfig.electricBikeCostMultiplier *
          (deliveryFleet.electricBikes.percentage / 100);

        deliveryFleetImpact.cost += electricBikeCost;

        deliveryFleetImpact.kpis.sustainability =
          Math.floor(deliveryFleet.electricBikes.percentage / 2);
      }
    }
    const estimatedMonthlyDemand = await getEstimatedMonthlyDemand();
    const excessDemand = Math.max(0, estimatedMonthlyDemand - ownFleetCapacity);
    const thirdPartyIsUsed = excessDemand > 0;

    let thirdPartyImpact = {
      isUsed: thirdPartyIsUsed,
      ordersHandled: excessDemand,
      cost: 0,
      kpis: {}
    };

    if (thirdPartyIsUsed) {
      thirdPartyImpact.cost =
        excessDemand * config.thirdPartyDelivery.costPerOrder.min;

      thirdPartyImpact.kpis.flexibility = 35;
      thirdPartyImpact.kpis.coverage = 50;
      thirdPartyImpact.kpis.customerSatisfaction = -15;
    }

    let logisticsImpact = {
      cost: 0,
      kpis: {}
    };

    if (logisticsOptimization.routeOptimization) {
      logisticsImpact.cost +=
        config.logisticsOptimization.routeOptimization.cost;

      logisticsImpact.kpis.speed = 15;
    }

    if (logisticsOptimization.realTimeTracking) {
      logisticsImpact.cost +=
        config.logisticsOptimization.gpsTracking.cost;

      logisticsImpact.kpis.quality = 10;
    }

    if (logisticsOptimization.batchingAlgorithm) {
      logisticsImpact.cost +=
        config.logisticsOptimization.algorithmAssignment.cost;

      logisticsImpact.kpis.coverage = 10;
    }

    if (logisticsOptimization.hyperlocalWarehousing) {
      logisticsImpact.cost +=
        config.logisticsOptimization.warehousingSystem.cost;

      logisticsImpact.kpis.speed =
        (logisticsImpact.kpis.speed || 0) + 10;
    }

    const totalCost =
      deliveryFleetImpact.cost +
      thirdPartyImpact.cost +
      logisticsImpact.cost;

    const bikeRiderOptimization = computeBikeRiderOptimization(config, deliveryFleet);

    return res.json({
      deliveryFleet: {
        ...deliveryFleetImpact,
        electricBikeCost
      },
      bikeRiderOptimization,
      thirdPartyDelivery: thirdPartyImpact,
      logisticsOptimization: logisticsImpact,
      totalCost,
      capacityInfo: {
        ownFleetCapacity,
        estimatedDemand: estimatedMonthlyDemand,
        excessDemand
      }
    });

  } catch (err) {
    console.error("STEP-4 CALCULATE ERROR:", err);
    res.status(500).json({ message: "Calculation failed" });
  }
};
