const mongoose = require("mongoose");

const CashFlowSchema = new mongoose.Schema({
  round: { type: String, required: true },

  summary: {
    totalIncome: Number,
    totalExpenses: Number,
    netCashFlow: Number
  },

  trend: [
    {
      round: String,
      value: Number
    }
  ]
});

module.exports = mongoose.model("CashFlow", CashFlowSchema);