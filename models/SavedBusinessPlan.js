// models/SavedBusinessPlan.js
const mongoose = require("mongoose");

const SavedBusinessPlanSchema = new mongoose.Schema({
  section: { type: String, required: true },
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
  savedAt: { type: Date, default: Date.now }
}, { collection: "saved_business_plans" });

module.exports = mongoose.model("SavedBusinessPlan", SavedBusinessPlanSchema);