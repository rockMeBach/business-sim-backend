const mongoose = require("mongoose");

const AchievedSchema = new mongoose.Schema({
  target: String,
  desc: String,
  maxPoints: Number,
  achieved: Boolean,
  points: Number
});

const ProgressSchema = new mongoose.Schema({
  target: String,
  desc: String,
  min: String,
  max: String,
  currentTarget: String,
  points: Number
});

const ChartSchema = new mongoose.Schema({
  round: String,
  actual: Number,
  target: Number
});

const ScoreSchema = new mongoose.Schema({
  round: { type: String, required: true },

  totalScore: Number,
  previousScore: Number,

  achievedTotal: Number,
  progressTotal: Number,

  achievedRows: [AchievedSchema],
  progressRows: [ProgressSchema],

  profitChart: [ChartSchema],
  educationChart: [ChartSchema],
  solvencyChart: [ChartSchema]
});

module.exports = mongoose.model("Score", ScoreSchema);