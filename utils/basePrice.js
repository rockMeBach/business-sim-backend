const PricingConfig = require("../models/PricingConfig");

/**
 * "Base price" shown to players is the buying price at the CHEAPEST quality
 * level — the floor before any quality or margin multiplier is applied.
 *
 * Quality tiers are keyed "1".."7" with the lowest level the cheapest
 * (cpMult 1), so this is baseUnitPrice * cpMult(lowest level). Falls back to
 * the category's own baseCost when no pricing config has been seeded.
 *
 * Derived rather than stored, so it can't drift out of sync with
 * PricingConfig the way a duplicated field would.
 */
function resolveBasePrice(category, pricingConfig) {
  const fallback = category?.baseCost ?? 0;
  if (!pricingConfig?.baseUnitPrice) return fallback;

  const tiers = pricingConfig.qualityTiers;
  const levels = tiers
    ? Array.from(tiers.keys()).map(Number).filter((n) => !Number.isNaN(n))
    : [];
  if (!levels.length) return pricingConfig.baseUnitPrice;

  const cheapest = String(Math.min(...levels));
  const cpMult = tiers.get(cheapest)?.cpMult ?? 1;
  return pricingConfig.baseUnitPrice * cpMult;
}

/** Attaches a derived `basePrice` to each ProductCategory document. */
async function withBasePrice(categories) {
  const pricingConfig = await PricingConfig.findOne({});
  return categories.map((c) => ({
    ...(typeof c.toObject === "function" ? c.toObject() : c),
    basePrice: resolveBasePrice(c, pricingConfig)
  }));
}

module.exports = { resolveBasePrice, withBasePrice };
