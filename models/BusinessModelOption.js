const mongoose = require("mongoose");

const businessModelOptionSchema = new mongoose.Schema({
  name: { type: String, required: true },        
  description: { type: String },                
  example: { type: String },                      
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model(
  "BusinessModelOption",
  businessModelOptionSchema
);
