const mongoose = require("mongoose");

const StatementSchema = new mongoose.Schema({

 round:String,

 netTurnover:Number,

 costOfSales:Number,

 grossMargin:Number,

 salesCosts:Number,

 locationCosts:Number,

 rentalCosts:Number,

 remuneration:Number,

 socialSecurity:Number,

 educationCosts:Number,

 otherCosts:Number,

 sumCosts:Number,

 retainedProfit:Number

});

module.exports =
mongoose.model("IncomeStatement",StatementSchema);