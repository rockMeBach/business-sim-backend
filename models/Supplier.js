    const mongoose = require("mongoose");

const supplierSchema = new mongoose.Schema({
  name: String,
  logoUrl: String,

  costPerUnit: Number,        // ₹ or €
  deliveryTimeWeeks: Number,

  turnoverBonusPercent: Number,
  bonusThreshold: Number,

  reliability: Number,        // 1–5 stars
  sustainability: Number      // 1–5 stars
});

module.exports = mongoose.model("SourcingSupplier", supplierSchema);
