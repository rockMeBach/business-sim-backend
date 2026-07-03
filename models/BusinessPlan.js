const mongoose = require("mongoose");

const BusinessPlanSchema = new mongoose.Schema({
  section: {
    type: String,
    required: true,
    index: true
  },

  data: {
    type: mongoose.Schema.Types.Mixed, // flexible structure
    required: true
  }
});

module.exports = mongoose.model("BusinessPlan", BusinessPlanSchema);
