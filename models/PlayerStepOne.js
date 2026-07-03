const mongoose = require("mongoose");

const playerStepOneSchema = new mongoose.Schema({
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

  businessModelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "BusinessModelOption",
    required: true
  },

  marketPositionIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "MarketPositionOption"
  }]

}, { timestamps: true });

module.exports = mongoose.model("PlayerStepOne", playerStepOneSchema);
