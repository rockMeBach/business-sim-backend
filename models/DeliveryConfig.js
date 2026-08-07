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
  },

  // STEP 2 — Bike-Rider Optimization (Excel row 18 "Indi Efficiency").
  // Auto-derived multiplier from the riders/bikes ratio:
  //   ratio < lowThreshold           -> belowMultiplier   (too many bikes idle)
  //   lowThreshold <= ratio <= high  -> optimalMultiplier  (best efficiency)
  //   ratio > highThreshold          -> aboveMultiplier    (too few bikes)
  bikeRiderRatioBands: {
    lowThreshold:      { type: Number, default: 2.5 },
    highThreshold:     { type: Number, default: 3.5 },
    belowMultiplier:   { type: Number, default: 0.85 },
    optimalMultiplier: { type: Number, default: 1.05 },
    aboveMultiplier:   { type: Number, default: 0.95 }
  },

  // How much one rider can physically move in a week. Used to check the
  // weekly warehouse capacity a player enters against the fleet they hired —
  // capacity you can't deliver is capacity you don't have.
  riderThroughput: {
    hoursPerWeek: { type: Number, default: 40 },
    itemsPerHour: { type: Number, default: 10 }
  }
});

module.exports = mongoose.model("DeliveryConfig", DeliveryConfigSchema);
