const { forEachSegment } = require("./segments");

// PlayerStepEight.marketing and MarketingConfig.marketing use the SAME key
// per channel, so no name mapping is needed. There used to be a `field` ->
// `configKey` translation here, and four of its decision-side names
// (cashbackCoupons, emailSms, corporateTieups, housingComplexes) matched
// nothing the client ever sends — so those four channels silently lost their
// multiplier, exactly as they lost their cost in the step-eight controller.
//
// type: "slider" -> 1 + (spend * rate / divisor), spend from `spendField`
//       (googleAds/facebookAds only — the two the workbook defines a slider
//       formula for).
// type: "flat"   -> IF(selected, multiplier, 1).
const MARKETING_ITEMS = [
  { group: "acquisition", key: "googleAds", type: "slider", spendField: "budget" },
  { group: "acquisition", key: "facebookAds", type: "slider", spendField: "budget" },
  { group: "acquisition", key: "referralProgram", type: "flat" },
  { group: "acquisition", key: "firstOrderDiscount", type: "flat" },
  { group: "acquisition", key: "influencerMarketing", type: "flat" },
  { group: "retention", key: "cashbackOption", type: "flat" },
  { group: "retention", key: "loyaltyProgram", type: "flat" },
  { group: "retention", key: "pushNotifications", type: "flat" },
  { group: "retention", key: "emailAndSMS", type: "flat" },
  { group: "partnerships", key: "creditCardOffers", type: "flat" },
  { group: "partnerships", key: "corporateTieUps", type: "flat" },
  { group: "partnerships", key: "housingSociety", type: "flat" }
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
    const decision = marketing[item.group]?.[item.key];
    const optionConfig = marketingConfig.marketing?.[item.key];
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
