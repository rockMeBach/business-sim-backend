const mongoose = require("mongoose");

// Excel Step 4 (rows 38-47): only the supplier's `sustainability` star
// rating feeds a multiplier — `reliability` has no corresponding table in
// the workbook and is treated as informational-only.
// "premiumMultiplier" applies to the Premium segment; "massMultiplier"
// applies uniformly to Standard/Basic/Discount ("Mass" in the sheet).
const sustainabilityBandSchema = {
  minStars: { type: Number, required: true },
  maxStars: { type: Number, required: true },
  premiumMultiplier: { type: Number, required: true },
  massMultiplier: { type: Number, required: true }
};

const sourcingMultiplierConfigSchema = new mongoose.Schema({
  sustainabilityBands: [sustainabilityBandSchema]
}, { timestamps: true });

module.exports = mongoose.model("SourcingMultiplierConfig", sourcingMultiplierConfigSchema);
