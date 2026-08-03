
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
  },

  // Excel Step 1 (rows 3-5): per-segment demand split for this category.
  // Additive alongside pricingTiers, which stepTwo.controller.js already
  // actively copies into PlayerProductCategory — left untouched.
  segmentDemand: {
    premium: { type: Number, default: 0 },
    standard: { type: Number, default: 0 },
    basic: { type: Number, default: 0 },
    discount: { type: Number, default: 0 }
  },

  // Which local-competition-intensity band (Excel rows 157-160) applies to
  // this category. Admin-set config, not a player choice.
  localCompetitionIntensity: {
    type: String,
    enum: ["less", "med", "high", "veryHigh"],
    default: "med"
  }
});

module.exports = mongoose.model("ProductCategory", ProductCategorySchema);
