const mongoose = require("mongoose");

/* SEGMENT DATA (table on right side UI) */
const SegmentSchema = new mongoose.Schema({
  name: String,          // premium, standard, basic, discount
  share: Number,
  yourSales: Number,
  totalDemand: Number
}, { _id: false });

/* POSITIONING BUBBLE GRAPH */
const PositioningSchema = new mongoose.Schema({
  segment: String,
  price: Number,
  quality: Number,
  bubbleSize: Number
}, { _id: false });

/* MAIN ANALYSIS MODEL */
const CategoryAnalysisSchema = new mongoose.Schema({
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ProductCategory",
    required: true,
    unique: true
  },

  kpis: {
    totalScore: Number,
    avgMultiplier: Number,
    avgMarketShare: Number,
    totalSales: Number
  },

  segments: [SegmentSchema],
  positioning: [PositioningSchema]

}, { timestamps: true });

module.exports = mongoose.model("ProductCategoryAnalysis", CategoryAnalysisSchema);
