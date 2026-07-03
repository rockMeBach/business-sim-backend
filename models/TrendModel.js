const mongoose = require("mongoose");

const TrendSchema = new mongoose.Schema({

 round:String,

 revenue:Number,

 profitability:Number

});

module.exports = mongoose.model("Trend",TrendSchema);