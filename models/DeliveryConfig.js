const mongoose = require("mongoose");

const segmentMultiplierSchema = {
  premium: { type: Number, default: 1 },
  standard: { type: Number, default: 1 },
  basic: { type: Number, default: 1 },
  discount: { type: Number, default: 1 }
};

const DeliveryConfigSchema = new mongoose.Schema({
  ownFleet: {
    setupCost: {
      min: Number,
      max: Number
    },

    riders: {
      min: Number,
      max: Number
    },

    riderCostPerMonth: {
      min: Number,
      max: Number
    },

    bikes: {
      min: Number,
      max: Number
    },

    bikeCost: {
      min: Number,
      max: Number
    },

    electricBikeConfig: {
      electricBikePercent: Number,          
      electricBikeCostMultiplier: Number  
    }
  },

  thirdPartyDelivery: {
    costPerOrder: {
      min: Number,
      max: Number
    }
  },

  logisticsOptimization: {
    routeOptimization: {
      cost: Number,
      multiplierBySegment: segmentMultiplierSchema
    },

    gpsTracking: {
      cost: Number,
      multiplierBySegment: {
        premium: { type: Number, default: 1.06 },
        standard: { type: Number, default: 1.06 },
        basic: { type: Number, default: 1 },
        discount: { type: Number, default: 1 }
      }
    },

    algorithmAssignment: {
      cost: Number,
      multiplierBySegment: segmentMultiplierSchema
    },

    warehousingSystem: {
      cost: Number,
      multiplierBySegment: segmentMultiplierSchema
    }
  }
});

module.exports = mongoose.model("DeliveryConfig", DeliveryConfigSchema);
