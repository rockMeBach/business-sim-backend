const mongoose = require("mongoose");

const playerStepNineSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  simulationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Simulation",
    required: true
  },
  roundNumber: {
    type: Number,
    required: true
  },

  darkStoreStaff: Object,
  deliveryStaff: Object,
  corporateTeam: Object,

  // Which specific employees the player hired. corporateTeam only keeps
  // headcounts per bucket, which is lossy — the exact roster couldn't be
  // restored from it, so the HR screen came back empty after a refresh.
  selectedEmployees: [String],

  educationBudgetPerRider: { type: Number, default: 0 },
  riderBonusBudget: { type: Number, default: 0 },

  totalMonthlyCost: {
    type: Number,
    required: true
  },

  kpis: {
    quality: Number,
    speed: Number,
    coverage: Number,
    scalability: Number,
    customerSatisfaction: Number
  }

}, { timestamps: true });

module.exports = mongoose.model("PlayerStepNine", playerStepNineSchema);
