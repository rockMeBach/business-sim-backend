const mongoose = require("mongoose");

const groupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  simulationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Simulation",
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model("Group", groupSchema);
