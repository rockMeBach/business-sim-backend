const mongoose = require("mongoose");

// Excel Step 6 (rows 69-73) — HR/Operations multiplier chain, separate from
// OperationsStaffingConfig's role salary/boost bands (which drive cost/KPI
// display, not the scoring engine's PRODUCT chain).
const riderBonusBandSchema = {
  label: String,
  minPercent: { type: Number, required: true },
  maxPercent: { type: Number, required: true },
  multiplier: { type: Number, required: true }
};

const hrOpsMultiplierConfigSchema = new mongoose.Schema({
  // Excel row 70 "Corporate Team Size": NOT a fixed range — whichever
  // player in the group has the MIN total corporate spend gets
  // `minSpendMultiplier`, whichever has the MAX gets `maxSpendMultiplier`,
  // and everyone else gets `midSpendMultiplier`. The min/max comparison
  // itself happens in the orchestrator (needs the whole group's spend).
  corporateTeamSize: {
    minSpendMultiplier: { type: Number, required: true },  // e.g. 0.95
    midSpendMultiplier: { type: Number, required: true },  // e.g. 1.03
    maxSpendMultiplier: { type: Number, required: true }   // e.g. 1.08
  },

  // Excel row 71 "Education Budget/Rider": slider formula
  // 1 + (spend * rate / divisor), e.g. rate=0.05, divisor=50000.
  educationBudgetPerRider: {
    rate: { type: Number, required: true },
    divisor: { type: Number, required: true }
  },

  // Excel row 72 "Rider Bonus Budget": banded multiplier by the chosen
  // percentage (row 73's C73=0.05, D73=0.1 thresholds) -> 0.9 / 1.05 / 1.15.
  // The app stores this decision as a rupee budget (percentage * riders *
  // riderCostPerMonth), so the engine back-derives the percentage before
  // banding against these thresholds — see hrOpsMultiplier.js.
  riderBonusBudgetBands: [riderBonusBandSchema]
}, { timestamps: true });

module.exports = mongoose.model("HROpsMultiplierConfig", hrOpsMultiplierConfigSchema);
