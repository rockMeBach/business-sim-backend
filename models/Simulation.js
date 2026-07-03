const mongoose = require("mongoose");

const roundSchema = new mongoose.Schema({
  roundNumber: { type: Number, required: true },
  name: { type: String } // optional: Round 1, Quiz, Coding, etc.
});

const simulationSchema = new mongoose.Schema({
  name: { type: String, required: true },

  totalRounds: {
    type: Number,
    required: true,
    min: 1
  },

  rounds: [roundSchema]
}, { timestamps: true });

module.exports = mongoose.model("Simulation", simulationSchema);
