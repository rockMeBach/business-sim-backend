const mongoose = require("mongoose");

const BalanceSchema = new mongoose.Schema({
  round: { type: String, required: true },

  summary: {
    totalAssets: Number,
    ownersEquity: Number,
    totalDebt: Number,
    solvency: Number
  },

  assets: {
    fixed: [
      {
        label: String,
        value: Number
      }
    ],
    current: [
      {
        label: String,
        value: Number
      }
    ],
    cash: {
      label: String,
      value: Number
    }
  },

  liabilities: {
    equity: [
      {
        label: String,
        value: Number
      }
    ],
    nonCurrent: [
      {
        label: String,
        value: Number
      }
    ],
    current: [
      {
        label: String,
        value: Number
      }
    ]
  },

  fundingStructure: [
    {
      name: String,
      value: Number,
      color: String
    }
  ]
});

module.exports = mongoose.model("Balance", BalanceSchema);