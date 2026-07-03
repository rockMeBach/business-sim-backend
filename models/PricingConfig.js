const mongoose = require("mongoose");

const pricingConfigSchema = new mongoose.Schema({
  baseCostPerCategory: {
    type: Map,
    of: Number
  },

  qualityMultipliers: {
    type: Map,
    of: Number
  },

  // 🔥 ADD THIS
  maxBaseQuality: {
    type: Number,
    default: 5 
  }
});

module.exports = mongoose.model("PricingConfig", pricingConfigSchema);
