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

  // Percentage of monthly salary (0-20), NOT a rupee amount. Was
  // `riderBonusBudget` in rupees, which the scoring engine then had to divide
  // by ridersPerCity * riderCostPerMonth to recover the percentage its bands
  // are defined on. Storing what's actually banded removes that round-trip.
  riderBonusPercent: { type: Number, default: 0 },
  // Rupee cost of that percentage, so the HR total doesn't have to re-derive
  // it from a payroll the engine can't see.
  totalBonusCost: { type: Number, default: 0 },

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
