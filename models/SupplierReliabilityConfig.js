const mongoose = require("mongoose");

// Excel "Supplier" sheet (separate tab from Round1): a chosen supplier's
// reliability star rating maps to a weekly fulfillment-% band (rows 8-9:
// 5*->95-100%, 4.5*->90-95%, 4*->85-90%), applied against ordered/expected
// demand to split it into "Actually Sold" vs "Wasted demand" (cols O-U). The
// sheet draws the exact % randomly within a supplier's band each week/order
// (A10 "Random"); the engine uses each band's midpoint instead so scoring
// stays deterministic and reproducible across re-calculations. Bands below
// 4 stars aren't given in the sheet (its worked example only used 4-5 star
// suppliers) — extrapolated at the same ~5-point-per-half-star spacing to
// cover the full 1-5 star range Supplier.reliability allows.
const reliabilityBandSchema = {
  minStars: { type: Number, required: true },
  maxStars: { type: Number, required: true },
  fulfillmentRate: { type: Number, required: true } // band midpoint, e.g. 0.875 for the 85-90% band
};

const supplierReliabilityConfigSchema = new mongoose.Schema({
  reliabilityBands: [reliabilityBandSchema],

  // The sheet's lead-time effect (E1 "ORDER (WK)-4" + the week-by-week
  // waterfall showing weeks 1-4 stocked out before a bigger order caught up)
  // has no closed-form single-round formula — only an 8-week worked example.
  // This models that: the fraction of a round (deliveryTimeWeeks /
  // weeksPerRound) spent waiting on the first delivery sells at
  // rampUpFulfillmentRate instead of the steady-state reliability rate,
  // approximating the sheet's demonstrated stockout dynamic.
  weeksPerRound: { type: Number, required: true, default: 8 },
  // Sheet's own weeks 1-4 example: demand 600/wk (2400 total), actually sold
  // 0+425+440+450=1315 -> 1315/2400 ~= 0.55.
  rampUpFulfillmentRate: { type: Number, required: true, default: 0.55 }
}, { timestamps: true });

module.exports = mongoose.model("SupplierReliabilityConfig", supplierReliabilityConfigSchema);
