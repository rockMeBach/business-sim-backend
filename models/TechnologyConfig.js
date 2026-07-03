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
  }
}, { timestamps: true });

module.exports = mongoose.model("TechnologyConfig", TechnologyConfigSchema);
