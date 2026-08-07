const mongoose = require("mongoose");

// Explicit Schema instances (not plain-object shorthand) from here down —
// nesting a plain-object schema 2+ levels deep with an array-of-objects
// field inside (breakdown/multipliers) isn't reliably interpreted by
// Mongoose's implicit inference; it silently strips those fields on save
// instead of erroring, which is what happened before this was made explicit.
const breakdownRowSchema = new mongoose.Schema({
  keyIndicator: String, achievedPoints: Number, multiplier: Number, totalScore: Number
}, { _id: false });

const multiplierRowSchema = new mongoose.Schema({
  title: String, description: String, value: Number
}, { _id: false });

const segmentResultSchema = new mongoose.Schema({
  marketShare: Number,
  expectedSale: Number, // demand won by market share, before supplier stockouts
  actualSold: Number,   // expectedSale after the "Supplier" sheet's reliability/lead-time fulfillment rate
  wastedDemand: Number, // expectedSale - actualSold: demand won but not deliverable (stockouts)
  expectedRevenue: Number,
  cogs: Number,
  grossProfit: Number,
  totalMarketSize: Number, // this segment's total demand for the category (Step 1 table, Excel $B$3-style cell)
  finalMultiplier: Number,
  localScore: Number,
  qualifies: Boolean, // whether this player's Height-Price score gates into this segment at all

  // Real per-segment equivalents of the Analysis page's mock "Core Score
  // Breakdown" / "Multipliers on Core Score" panels — shaped to match the
  // frontend's existing Breakdown/Multiplier types directly.
  coreScore: Number, // = base[segment]: sum of the 4 breakdown rows' totalScore
  breakdown: [breakdownRowSchema],
  multipliers: [multiplierRowSchema]
}, { _id: false });

const categoryResultSchema = new mongoose.Schema({
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "ProductCategory" },
  categoryName: String,
  segments: {
    premium: segmentResultSchema,
    standard: segmentResultSchema,
    basic: segmentResultSchema,
    discount: segmentResultSchema
  }
});

const playerRoundResultSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  simulationId: { type: mongoose.Schema.Types.ObjectId, ref: "Simulation", required: true },
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true },
  roundNumber: { type: Number, required: true },

  perCategory: [categoryResultSchema],

  totalRevenue: Number,
  totalCogs: Number,
  totalGrossProfit: Number,
  turnoverBonus: Number, // supplier turnover bonus, already folded into totalOperatingProfit; broken out for transparency
  totalOperatingProfit: Number,

  costBreakdown: {
    riderCost: Number,
    fleetCost: Number,
    techCost: Number,
    marketingCost: Number,
    hrCost: Number,
    // Orders the own fleet couldn't carry, billed per order by the third
    // party. Computed by the weekly cycle, not by Step 4 — only the engine
    // knows how much demand a player actually won.
    thirdPartyDeliveryCost: Number
  },

  // Warehouse stock at the start/end of the round. Rounds are consecutive
  // months, so what isn't sold is still there next round.
  openingInventory: Number,
  closingInventory: Number,
  thirdPartyOrders: Number,

  // The week-by-week run inside this round: demand, what the supplier
  // delivered, what fitted in the warehouse, what shipped and on whose bikes.
  weeklyFulfillment: [
    {
      week: Number,
      demand: Number,
      warehouseCapacity: Number,
      riderCapacity: Number,
      supplyRate: Number,
      received: Number,
      refusedForSpace: Number,
      sold: Number,
      ownFleetDelivered: Number,
      thirdPartyDelivered: Number,
      unmetDemand: Number,
      closingInventory: Number
    }
  ],

  score: Number, // single number surfaced to the frontend
  rank: Number,  // rank within this group+round

  computedAt: { type: Date, default: Date.now }
}, { timestamps: true });

playerRoundResultSchema.index(
  { simulationId: 1, groupId: 1, roundNumber: 1, userId: 1 },
  { unique: true }
);

module.exports = mongoose.model("PlayerRoundResult", playerRoundResultSchema);
