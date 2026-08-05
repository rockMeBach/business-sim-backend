const PlayerStepOne = require("../models/PlayerStepOne");
const PlayerProductCategory = require("../models/PlayerProductCategory");
const PlayerStepFour = require("../models/PlayerStepFour");
const PlayerStepFive = require("../models/PlayerStepFive");
const PlayerStepEight = require("../models/PlayerStepEight");
const PlayerStepNine = require("../models/PlayerStepNine");
const PricingDecision = require("../models/PricingDecision");
const UserSelection = require("../models/UserSelection");

/**
 * Read-back for every decision a player has saved in one round.
 *
 * Until this existed, each step could only be WRITTEN: the step routes exposed
 * POST /save with no matching GET, so the client had no way to recover what it
 * had submitted. The UI compensated by treating localStorage as the source of
 * truth, under unscoped keys like "step8_marketing_state" — which meant a
 * second player on the same browser loaded the first player's answers, and
 * saving without touching anything wrote them to their own record.
 *
 * One aggregate endpoint rather than eight per-step ones, so the decisions
 * screen hydrates in a single round-trip.
 *
 * The queries below tolerate two pre-existing inconsistencies rather than
 * silently returning nothing:
 *   - PlayerStepEight stores userId/simulationId as String; the rest use
 *     ObjectId. Both forms are matched.
 *   - PricingDecision names its round field `round`, not `roundNumber`.
 */
function idVariants(value) {
  // Match documents saved either as ObjectId or as its string form.
  return [value, String(value)];
}

exports.getDecisions = async (req, res) => {
  try {
    const { userId, simulationId, roundNumber } = req.query;

    if (!userId || !simulationId || !roundNumber) {
      return res.status(400).json({
        message: "userId, simulationId, and roundNumber are required"
      });
    }

    const round = Number(roundNumber);
    if (Number.isNaN(round)) {
      return res.status(400).json({ message: "roundNumber must be a number" });
    }

    const byUserAndRound = {
      userId: { $in: idVariants(userId) },
      simulationId: { $in: idVariants(simulationId) },
      roundNumber: round
    };

    const [stepOne, productCategory, stepFour, stepFive, stepEight, stepNine, pricing, sourcing] =
      await Promise.all([
        PlayerStepOne.findOne(byUserAndRound).lean(),
        PlayerProductCategory.findOne(byUserAndRound).lean(),
        PlayerStepFour.findOne(byUserAndRound).lean(),
        PlayerStepFive.findOne(byUserAndRound).lean(),
        PlayerStepEight.findOne(byUserAndRound).lean(),
        PlayerStepNine.findOne(byUserAndRound).lean(),
        PricingDecision.findOne({
          userId: { $in: idVariants(userId) },
          simulationId: { $in: idVariants(simulationId) },
          round
        }).lean(),
        UserSelection.findOne(byUserAndRound).lean()
      ]);

    res.json({
      userId,
      simulationId,
      roundNumber: round,
      // null for a step the player hasn't saved yet — the client treats that
      // as "no saved answer" and falls back to its own defaults.
      stepOne: stepOne || null,
      productCategory: productCategory || null,
      stepFour: stepFour || null,
      stepFive: stepFive || null,
      stepEight: stepEight || null,
      stepNine: stepNine || null,
      pricing: pricing || null,
      sourcing: sourcing || null
    });
  } catch (err) {
    console.error("GET DECISIONS ERROR:", err);
    res.status(500).json({ message: "Failed to load saved decisions", error: err.message });
  }
};
