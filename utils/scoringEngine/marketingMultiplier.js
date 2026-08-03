const { forEachSegment } = require("./segments");

// Maps PlayerStepEight.marketing's decision field names onto
// MarketingConfig.marketing's config item names — this is the SAME mapping
// controllers/stepEight.controller.js's calculateMarketing() already uses
// live (verified there field-by-field), not an independent guess.
// type: "slider" -> engine computes 1 + (spend * rate / divisor), spend
//       taken from the named field (googleAds/facebookAds only — the two
//       items the workbook actually defines a slider formula for).
// type: "flat"   -> IF(selected, multiplierBySegment[seg], 1).
const MARKETING_ITEMS = [
  { group: "acquisition", field: "googleAds", configKey: "googleAds", type: "slider", spendField: "budget" },
  { group: "acquisition", field: "facebookAds", configKey: "facebookAds", type: "slider", spendField: "budget" },
  { group: "acquisition", field: "referralProgram", configKey: "referralProgram", type: "flat" },
  { group: "acquisition", field: "firstOrderDiscount", configKey: "firstOrderDiscount", type: "flat" },
  { group: "acquisition", field: "influencerMarketing", configKey: "influencerMarketing", type: "flat" },
  { group: "retention", field: "cashbackCoupons", configKey: "cashbackOption", type: "flat" },
  { group: "retention", field: "loyaltyProgram", configKey: "loyaltyProgram", type: "flat" },
  { group: "retention", field: "pushNotifications", configKey: "pushNotifications", type: "flat" },
  { group: "retention", field: "emailSms", configKey: "emailAndSMS", type: "flat" },
  { group: "partnerships", field: "creditCardOffers", configKey: "creditCardOffers", type: "flat" },
  { group: "partnerships", field: "corporateTieups", configKey: "corporateTieUps", type: "flat" },
  { group: "partnerships", field: "housingComplexes", configKey: "housingSociety", type: "flat" }
];

/**
 * Marketing step's option-driven multiplier only (Excel rows 52-63 of the
 * row-51 PRODUCT chain — the row-64 competitive-average term is applied
 * separately in the orchestrator, since it needs the whole group's spend).
 * Returns { premium, standard, basic, discount }.
 */
function computeMarketingOptionsMultiplier(marketingConfig, stepEightDoc) {
  if (!marketingConfig || !stepEightDoc?.marketing) {
    return forEachSegment(() => 1);
  }

  const marketing = stepEightDoc.marketing;

  // Excel row 51 (`=PRODUCT(V52:V64)`) is a single scalar per player, applied
  // identically to all 4 segments — "Applies To" text is cosmetic only, so
  // the flat `multiplier` field is used instead of `multiplierBySegment`.
  let product = 1;

  for (const item of MARKETING_ITEMS) {
    const decision = marketing[item.group]?.[item.field];
    const optionConfig = marketingConfig.marketing?.[item.configKey];
    if (!decision || !optionConfig) continue;

    if (item.type === "slider") {
      const spend = Number(decision[item.spendField] || 0);
      if (decision.enabled && spend > 0 && optionConfig.sliderConfig?.divisor) {
        const { rate, divisor } = optionConfig.sliderConfig;
        product *= 1 + (spend * rate) / divisor;
      }
    } else {
      const selected = !!decision.enabled;
      if (selected && optionConfig.cost > 0) {
        product *= optionConfig.multiplier ?? 1;
      }
    }
  }

  return forEachSegment(() => product);
}

module.exports = { computeMarketingOptionsMultiplier };
