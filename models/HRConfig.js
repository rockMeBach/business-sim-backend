
const mongoose = require("mongoose");

const hrConfigSchema = new mongoose.Schema({
  selectedEmployees: [{ type: mongoose.Schema.Types.ObjectId, ref: "Employee" }],
  trainingBudgetPerEmployee: Number,
  bonusPerEmployee: Number,
  createdAt: { type: Date, default: Date.now }
});

module.exports= mongoose.model("HRConfig", hrConfigSchema);
