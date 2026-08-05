const mongoose = require("mongoose");

const PlayerStepFiveSchema = new mongoose.Schema({
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

  // what player selected
  customerFacing: Object,
  operations: Object,

  // Website development spend, entered in lakhs on the slider. The client
  // always POSTed this; without a schema entry Mongoose discarded it, so the
  // slider silently reset to 0 on every reload.
  websiteBudget: { type: Number, default: 0 },

  // 🔥 calculated data (explicit)
  technologyBreakdown: {
    customerFacing: Object,
    operations: Object
  },

  totalTechnologyCost: Number,

  // 🔥 KPIs from technology
  kpis: {
    customerFacing: Object,
    operations: Object
  }

}, { timestamps: true });

module.exports = mongoose.model("PlayerStepFive", PlayerStepFiveSchema);
