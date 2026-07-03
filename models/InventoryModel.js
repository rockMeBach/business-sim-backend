const mongoose = require("mongoose");

const WeeklySchema = new mongoose.Schema({
  week: String,
  demand: Number,
  sales: Number,
  inventory: Number
});

const InventorySchema = new mongoose.Schema({
  round: { type: String, required: true },

  summary: {
    totalDemand: Number,
    totalSales: Number,
    fulfillment: Number,
    stockouts: Number
  },

  weeklyData: [WeeklySchema]
});

module.exports = mongoose.model("Inventory", InventorySchema);