/**
 * Excel "Supplier" sheet: a player's chosen supplier only ever fulfills a
 * fraction of what the market awards them (rows 1-10) — reliability caps the
 * steady-state fulfillment %, and lead time delays the first delivery,
 * during which only a partial (rampUp) fraction of demand is met. See
 * models/SupplierReliabilityConfig.js for the two sheet-derived constants.
 *
 * @returns {number} fulfillmentRate in (0, 1] — the fraction of a player's
 *   market-share-won demand that actually gets sold this round.
 */
function computeFulfillmentRate(supplierReliabilityConfig, supplier) {
  const bands = supplierReliabilityConfig?.reliabilityBands || [];
  const stars = supplier?.reliability;
  const band = stars != null ? bands.find((b) => stars >= b.minStars && stars <= b.maxStars) : null;
  // No supplier chosen, or reliability outside every configured band:
  // assume full fulfillment rather than silently zeroing out revenue.
  const steadyStateRate = band?.fulfillmentRate ?? 1;

  const weeksPerRound = supplierReliabilityConfig?.weeksPerRound || 8;
  const deliveryTimeWeeks = supplier?.deliveryTimeWeeks || 0;
  const rampFraction = Math.min(deliveryTimeWeeks / weeksPerRound, 1);
  const rampUpRate = supplierReliabilityConfig?.rampUpFulfillmentRate ?? steadyStateRate;

  return steadyStateRate * (1 - rampFraction * (1 - rampUpRate));
}

module.exports = { computeFulfillmentRate };
