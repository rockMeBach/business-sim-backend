const { forEachSegment, SEGMENTS } = require("./segments");

/**
 * Which segments a player actually competes in.
 *
 * Step 1 asks the player to pick one or more Market Positions — Premium,
 * Standard, Basic, Discount — and requires at least one. That choice used to
 * have NO effect: the engine never loaded the step-one document, and decided
 * participation purely from a height-price sigmoid band. Players were routinely
 * scored in segments they had explicitly not chosen (e.g. selecting Standard
 * and earning all their revenue in Basic).
 *
 * Positioning now decides WHERE you compete. The height-price sigmoid still
 * decides HOW WELL you score once there — it feeds heightPricePoints, one of
 * the four scored key indicators — it just no longer relocates you.
 *
 * MarketPositionOption documents are matched to segments by name, which is how
 * they are seeded ("Premium" -> premium, and so on).
 */
function segmentsFromMarketPositions(marketPositionIds, marketPositionOptions) {
  if (!marketPositionIds?.length || !marketPositionOptions?.length) return null;

  const nameById = new Map(
    marketPositionOptions.map((option) => [String(option._id), String(option.name || "").toLowerCase()])
  );

  const chosen = new Set();
  for (const id of marketPositionIds) {
    const name = nameById.get(String(id));
    if (name && SEGMENTS.includes(name)) chosen.add(name);
  }

  return chosen.size ? chosen : null;
}

/**
 * @param stepOneDoc the player's PlayerStepOne (may be null).
 * @param marketPositionOptions all MarketPositionOption docs.
 * @param heightPriceQualification the legacy sigmoid-band gate, used as a
 *   fallback for rounds saved before positioning was recorded — without it,
 *   older data would score zero everywhere.
 * @returns { premium, standard, basic, discount } booleans
 */
function computePositioningQualification(stepOneDoc, marketPositionOptions, heightPriceQualification) {
  const chosen = segmentsFromMarketPositions(stepOneDoc?.marketPositionIds, marketPositionOptions);
  if (!chosen) return heightPriceQualification;
  return forEachSegment((segment) => chosen.has(segment));
}

module.exports = { computePositioningQualification, segmentsFromMarketPositions };
