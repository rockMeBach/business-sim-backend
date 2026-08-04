
const mongoose = require("mongoose");

const PlayerProductCategorySchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  simulationId: mongoose.Schema.Types.ObjectId,
  roundNumber: Number,

  categories: [
    {
      categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ProductCategory"
      },
      enabled: Boolean,
      baseCost: Number,
      pricingTiers: {
        premium: Number,
        standard: Number,
        basic: Number,
        discount: Number
      },
      inventoryRange: String,
      monthlyDemand: Number,
      warehouseCapacity: Number
    }
  ]
});

module.exports = mongoose.model(
  "PlayerProductCategory",
  PlayerProductCategorySchema
);
