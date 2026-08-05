
const mongoose = require("mongoose");

const PlayerProductCategorySchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  simulationId: mongoose.Schema.Types.ObjectId,
  roundNumber: Number,

  // One shared warehouse across every category (previously stored per
  // category inside the array below). The scoring engine pools total units
  // sold across all categories against this single cap.
  warehouseCapacity: Number,

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
