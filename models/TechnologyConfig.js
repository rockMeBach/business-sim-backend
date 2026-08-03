const mongoose = require("mongoose");

/* ================= SEGMENT MULTIPLIER ================= */
const segmentMultiplierSchema = {
  premium: { type: Number, default: 1 },
  standard: { type: Number, default: 1 },
  basic: { type: Number, default: 1 },
  discount: { type: Number, default: 1 }
};

/* ================= TECHNOLOGY ITEM ================= */
const technologyItemSchema = {
  appliesTo: {
    type: String, // Mandatory | Premium,Standard | All | Slider
    required: true
  },

  cost: {
    type: Number,
    required: true
  },

  multiplierBySegment: {
    type: segmentMultiplierSchema,
    required: true
  },

  // Only populated for the slider-style item (websiteDevelopment): the
  // engine computes 1 + (units * cost * rate / divisor). Absent for flat
  // items, which use IF(cost>0, multiplierBySegment[seg], 1).
  sliderConfig: {
    rate: Number,
    divisor: Number
  }
};

/* ================= MAIN SCHEMA ================= */
const TechnologyConfigSchema = new mongoose.Schema({
  customerFacing: {
    mobileApp: technologyItemSchema,
    voiceOrdering: technologyItemSchema,
    websiteDevelopment: technologyItemSchema
  },

  operations: {
    darkStoreSystem: technologyItemSchema,
    riderApp: technologyItemSchema,
    demandForecastingAI: technologyItemSchema,
    dynamicPricing: technologyItemSchema,
    supplyChainAnalytics: technologyItemSchema
  },

  // Excel row 32 "Total investment/average" — competitive bonus/penalty
  // applied on top of the PRODUCT chain based on this player's total tech
  // spend vs. the average spend across the group.
  totalInvestmentAverage: {
    appliesTo: String,
    belowAverageMultiplier: Number,        // e.g. 0.9
    atOrAboveAverageMultiplier: Number      // e.g. 1
  }
}, { timestamps: true });

module.exports = mongoose.model("TechnologyConfig", TechnologyConfigSchema);
