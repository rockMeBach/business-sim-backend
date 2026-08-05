const { forEachSegment } = require("./segments");
const { WEBSITE_BUDGET_UNIT } = require("../websiteBudget");

// Boolean-flag options (Excel rows 24-30). websiteDevelopment (row 31) is
// handled separately as a slider.
const FLAT_OPTIONS = [
  { field: "mobileApp", group: "customerFacing" },
  { field: "voiceOrdering", group: "customerFacing" },
  { field: "darkStoreSystem", group: "operations" },
  { field: "riderApp", group: "operations" },
  { field: "demandForecastingAI", group: "operations" },
  { field: "dynamicPricing", group: "operations" },
  { field: "supplyChainAnalytics", group: "operations" }
];

/**
 * Technology step's option-driven multiplier only (Excel rows 24-31 of the
 * row-23 PRODUCT chain — the row-32 competitive-average term is applied
 * separately in the orchestrator, since it needs the whole group's spend).
 * Returns { premium, standard, basic, discount }.
 */
function computeTechnologyOptionsMultiplier(technologyConfig, stepFiveDoc) {
  if (!technologyConfig || !stepFiveDoc) {
    return forEachSegment(() => 1);
  }

  const customerFacingSelected = stepFiveDoc.customerFacing || {};
  const operationsSelected = stepFiveDoc.operations || {};

  // Excel row 23 (`=PRODUCT(V24:V32)`) is a single scalar per player, applied
  // identically to all 4 segments — "Applies To" text is cosmetic only, so
  // `multiplierBySegment` is read at its `.premium` value to stay uniform.
  let product = 1;

  for (const { field, group } of FLAT_OPTIONS) {
    const selected = group === "customerFacing"
      ? !!customerFacingSelected[field]
      : !!operationsSelected[field];
    const optionConfig = technologyConfig[group]?.[field];
    if (selected && optionConfig?.cost > 0) {
      product *= optionConfig.multiplierBySegment?.premium ?? 1;
    }
  }

  // Website development (row 31) is a budget slider, not a checkbox.
  //
  // This used to read `customerFacing.websiteDevelopment` expecting a unit
  // count, but the client sends that field as a BOOLEAN and puts the slider
  // value in `websiteBudget`. Number(false) is 0, so the website multiplier
  // never applied for anyone — the budget was inert in scoring even though
  // the UI presented it as a real investment.
  //
  // `websiteBudget` is denominated in LAKHS, matching the slider's own
  // "₹0 L – ₹100 L" labels.
  const websiteBudgetLakhs = Number(stepFiveDoc.websiteBudget) || 0;
  const websiteConfig = technologyConfig.customerFacing?.websiteDevelopment;
  if (websiteBudgetLakhs > 0 && websiteConfig?.sliderConfig) {
    const { rate, divisor } = websiteConfig.sliderConfig;
    const spend = websiteBudgetLakhs * WEBSITE_BUDGET_UNIT;
    if (divisor) {
      product *= 1 + (spend * rate) / divisor;
    }
  }

  return forEachSegment(() => product);
}

module.exports = { computeTechnologyOptionsMultiplier };
