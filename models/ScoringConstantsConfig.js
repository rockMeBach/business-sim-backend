const mongoose = require("mongoose");

// Fixed constants from the Excel workbook that aren't tied to any specific
// step's decision options — kept in their own singleton config so the
// engine has a single, well-documented source for them.

const segmentWeightSchema = {
  premium: { type: Number, required: true },
  standard: { type: Number, required: true },
  basic: { type: Number, required: true },
  discount: { type: Number, required: true }
};

const segmentBandSchema = {
  premium: { min: Number, max: Number },
  standard: { min: Number, max: Number },
  basic: { min: Number, max: Number },
  discount: { min: Number, max: Number }
};

const scoringConstantsConfigSchema = new mongoose.Schema({
  // Excel row 85 "Others" = Focus * New-Player-in-Segment * R&D. Focus and
  // New-Player-in-Segment are fixed workbook constants (2.65, 0.85) with no
  // player-decision equivalent. R&D was fixed at 1 in the worked example
  // (no player ever invested) — but PricingDecision.rdInvestment is a real
  // player input, so it's computed dynamically (see rdInvestment below)
  // instead of being folded into a single fixed constant.
  focusMultiplier: { type: Number, required: true },              // e.g. 2.65
  newPlayerInSegmentMultiplier: { type: Number, required: true },  // e.g. 0.85

  // R&D slider formula: 1 + (rdInvestment * rate / divisor). No Excel
  // reference for these exact numbers (R&D was never varied in the
  // worked example) — seeded with reasonable values.
  rdInvestment: {
    rate: { type: Number, required: true },
    divisor: { type: Number, required: true }
  },

  // Excel rows 106-110 "Base Points Elasticity": per-segment weights applied
  // to Selling-Price points / Competitive-Quality points / Actual-Quality
  // points / Height-Price points when summing each segment's BASE score
  // (rows 115-136 -> 138-142).
  sellingPriceWeight: segmentWeightSchema,      // row 107, e.g. 0.1/0.3/0.5/0.9
  competitiveQualityWeight: segmentWeightSchema, // row 108, e.g. 0.8/0.6/0.4/0.2
  actualQualityWeight: segmentWeightSchema,      // row 109, e.g. 0.9/0.6/0.3/0.1
  heightPriceWeight: segmentWeightSchema,        // row 110, e.g. 0.2/0.5/0.6/0.8

  // Excel row 82 "Sigmoid New": 100/(1+EXP(-k*(spMultBase - m0))), fixed
  // parameters (not group-average-dependent, unlike rows 77/81).
  heightPriceSigmoid: {
    m0: { type: Number, required: true }, // e.g. 3.2
    k: { type: Number, required: true }   // e.g. 0.8
  },

  // Excel rows 91-94: per-segment [min,max) band that a player's Height
  // Price points must fall within to "qualify" to sell into that segment.
  heightPriceGateBands: segmentBandSchema
}, { timestamps: true });

module.exports = mongoose.model("ScoringConstantsConfig", scoringConstantsConfigSchema);
