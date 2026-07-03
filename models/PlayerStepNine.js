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
