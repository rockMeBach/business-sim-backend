const mongoose = require("mongoose");

/* ---------- SUB SCHEMAS ---------- */

const BreakdownSchema = new mongoose.Schema(
  {
    multiplier: Number,
    keyIndicator: String,
    achievedPoints: Number,
    totalScore: Number,
  },
  { _id: false }
);

const MultiplierSchema = new mongoose.Schema(
  {
    title: String,
    description: String,
    value: Number,
  },
  { _id: false }
);

const CompetitionSchema = new mongoose.Schema(
  {
    name: String,
    score: Number,
  },
  { _id: false }
);

const MarketSchema = new mongoose.Schema(
  {
    marketShare: Number,
    totalMarketSize: Number,
    yourSales: Number,
    directDemand: Number,
    substituteDemand: Number,
  },
  { _id: false }
);

/* ---------- MAIN ANALYSIS SCHEMA ---------- */

const TierAnalysisSchema = new mongoose.Schema(
  {
    coreScore: Number,

    breakdown: [BreakdownSchema],

    multiplierOnCoreScore: Number,
    multipliers: [MultiplierSchema],

    totalScore: Number,

    competitors: [CompetitionSchema],
    localCompetition: Number,

    market: MarketSchema,
  },
  { _id: false }
);

const CategoryAnalysisSchema = new mongoose.Schema(
  {
    categoryName: {
      type: String,
      required: true,
      unique: true,
    },

    tiers: {
      premium: TierAnalysisSchema,
      standard: TierAnalysisSchema,
      basic: TierAnalysisSchema,
      discount: TierAnalysisSchema,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CategoryAnalysis", CategoryAnalysisSchema);
