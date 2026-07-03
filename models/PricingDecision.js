const mongoose = require("mongoose");

const PricingDecisionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    simulationId: { type: mongoose.Schema.Types.ObjectId, required: true },
    round: { type: Number, required: true },

    categories: [
      {
        categoryId: mongoose.Schema.Types.ObjectId,
        name: String,

        basePrice: Number,
        baseMonthlyDemand: Number,

        qualityLevel: Number,
        qualityMultiplier: Number,
        qualityPrice: Number,          

        marginMultiplier: Number,
        finalSellingPrice: Number,     

        monthlyRevenue: Number
      }
    ],

    selectedFeatures: [String],
    rdInvestment: Number
  },
  { timestamps: true }
);

module.exports = mongoose.model("PricingDecision", PricingDecisionSchema);
