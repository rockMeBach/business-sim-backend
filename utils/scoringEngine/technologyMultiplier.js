const { forEachSegment } = require("./segments");

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

  // websiteDevelopment (row 31): slider, units stored directly as a number.
  const websiteUnits = Number(customerFacingSelected.websiteDevelopment) || 0;
  const websiteConfig = technologyConfig.customerFacing?.websiteDevelopment;
  if (websiteUnits > 0 && websiteConfig?.sliderConfig) {
    const { rate, divisor } = websiteConfig.sliderConfig;
    const spend = websiteUnits * (websiteConfig.cost || 0);
    if (divisor) {
      product *= 1 + (spend * rate) / divisor;
    }
  }

  return forEachSegment(() => product);
}

module.exports = { computeTechnologyOptionsMultiplier };
