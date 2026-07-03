
const mongoose = require("mongoose");

const ProductCategorySchema = new mongoose.Schema({
  name: { type: String, required: true },      
  isActive: { type: Boolean, default: true },

  baseCost: { type: Number, required: true },  

  inventoryRanges: [
    {
      label: String,       
      min: Number,         
      max: Number           
    }
  ],

  pricingTiers: {
    premium: { type: Number, default: 0 },     
    standard: { type: Number, default: 0 },    
    basic: { type: Number, default: 0 },        
    discount: { type: Number, default: 0 }     
  },

  baseMonthlyDemand: {
    type: Number,
    required: true
  }
});

module.exports = mongoose.model("ProductCategory", ProductCategorySchema);
