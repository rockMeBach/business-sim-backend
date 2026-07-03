const mongoose = require("mongoose");

const IncomeSchema = new mongoose.Schema({

 round:{
  type:String
 },

 netTurnover:Number,

 grossMargin:Number,

 totalCosts:Number,

 retainedProfit:Number,

 netTurnoverChange:Number,

 grossMarginChange:Number,

 totalCostsChange:Number,

 retainedProfitChange:Number

});

module.exports = mongoose.model("Income",IncomeSchema);