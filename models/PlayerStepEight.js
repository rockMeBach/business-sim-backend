const mongoose = require("mongoose");

const playerStepEightSchema = new mongoose.Schema({
  userId: String,
  simulationId: String,
  roundNumber: Number,
  marketing: Object,
  totalCost: Number,
  kpis: Object,
  breakdown: Object
});

module.exports = mongoose.model("PlayerStepEight", playerStepEightSchema);
