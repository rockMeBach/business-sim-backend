const mongoose = require("mongoose");

const rdInvestmentSchema = new mongoose.Schema({
  userId: String,
  round: Number,

  investedThisRound: Number,
  totalInvestedTillNow: Number,
  redeemedAmount: Number,
  balanceCarryForward: Number
});

module.exports=mongoose.model("RDInvestment", rdInvestmentSchema);
// collection → rdinvestments
