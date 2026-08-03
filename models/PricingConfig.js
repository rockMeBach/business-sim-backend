const mongoose = require("mongoose");

const qualityTierSchema = new mongoose.Schema({
  cpMult: { type: Number, required: true }, // Cost multiplier (Excel "CP Mult", VLOOKUP col F, rows 96-103)
  // NOTE: "SP Mult" (Excel row 79) is a free player choice, not derived from
  // quality level — it's read from PricingDecision.categories[].marginMultiplier,
  // not stored here.

  // Which segments this quality level actually competes in for the
  // SellingPrice/CompetitiveQuality/ActualQuality BASE terms (Excel rows
  // 96-103, columns B-E — a 1 marks eligibility, blank means that segment's
  // BASE score only gets the Height-Price term for this quality level).
  eligibleSegments: { type: [String], default: ["premium", "standard", "basic", "discount"] }
}, { _id: false });

const pricingConfigSchema = new mongoose.Schema({
  baseCostPerCategory: {
    type: Map,
    of: Number
  },

  qualityMultipliers: {
    type: Map,
    of: Number
  },

  // 🔥 ADD THIS
  maxBaseQuality: {
    type: Number,
    default: 7
  },

  // Excel D78 — flat base unit price used in Expected Revenue/COGS.
  baseUnitPrice: {
    type: Number,
    default: 1200
  },

  // Quality tiers 1-7, keyed as strings ("1".."7") to match qualityMultipliers.
  // Additive alongside qualityMultipliers — existing readers of that map are
  // untouched; the scoring engine reads qualityTiers/baseUnitPrice/sigmoid.
  qualityTiers: {
    type: Map,
    of: qualityTierSchema
  },

  // Excel rows 77/81/82 — sigmoid quality-score curve parameters:
  // 100 / (1 + EXP(-((level - avg) / stdev))).
  sigmoid: {
    avg: Number,
    stdev: Number
  }
});

module.exports = mongoose.model("PricingConfig", pricingConfigSchema);
