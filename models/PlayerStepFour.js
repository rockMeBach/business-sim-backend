const mongoose = require("mongoose");

const PlayerStepFourSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  simulationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Simulation",
    required: true
  },
  roundNumber: {
    type: Number,
    required: true
  },

  deliveryFleet: {
    ownFleet: Boolean,
    ridersPerCity: Number,
    bikesPerCity: Number,

    electricBikes: {
      enabled: Boolean,
      percentage: Number,
      electricBikeCost: Number  
    },

    thirdPartyDelivery: Boolean
  },

  logisticsOptimization: {
    routeOptimization: Boolean,
    realTimeTracking: Boolean,
    batchingAlgorithm: Boolean,
    hyperlocalWarehousing: Boolean
  },

  // Auto-derived from the riders/bikes ratio (Excel Step 2 "Bike-Rider Optimization")
  bikeRiderOptimization: {
    ratio: Number,
    multiplier: Number,
    band: String
  },

  totalMonthlyCost: Number,

  kpis: {
    deliveryQuality: Number,
    coverage: Number,
    sustainability: Number,
    flexibility: Number,

    deliverySpeed: Number,
    costEfficiency: Number,
    scalability: Number,
    customerSatisfaction: Number,
    brandPerception: Number,

    operationalComplexity: Number,
    riskExposure: Number
  }
}, { timestamps: true });

module.exports = mongoose.model("PlayerStepFour", PlayerStepFourSchema);
