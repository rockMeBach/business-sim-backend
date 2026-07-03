const mongoose = require("mongoose");

const marketPositionOptionSchema = new mongoose.Schema({
  name: { type: String, required: true },        //Premium Urban
  description: { type: String },                 //High-income areas
  focus: { type: String },                       //Imported,organic focus
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model(
  "MarketPositionOption",
  marketPositionOptionSchema
);
