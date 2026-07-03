const Income = require("../models/IncomeModel");
const Trend = require("../models/TrendModel");
const Statement =
require("../models/IncomeStatementModel");


exports.getIncomeData = async (req,res)=>{

 try{

 const round = req.query.round || "R5";

 const cards =
 await Income.findOne({round});

 const trend =
 await Trend.find();

 const statement =
 await Statement.findOne({round});


 res.json({

 cards,
 trendData:trend,
 incomeStatement:statement

 });

 }

 catch(error){

 res.status(500).json({
 message:"Server error"
 });

 }

}