const User = require("../../models/User");
const PlayerStepOne = require("../../models/PlayerStepOne");
const PlayerStepFour = require("../../models/PlayerStepFour");
const PlayerStepFive = require("../../models/PlayerStepFive");
const PlayerStepEight = require("../../models/PlayerStepEight");
const PlayerStepNine = require("../../models/PlayerStepNine");
const PlayerProductCategory = require("../../models/PlayerProductCategory");
const UserSelection = require("../../models/UserSelection");
const PricingDecision = require("../../models/PricingDecision");
const SourcingSupplier = require("../../models/Supplier");

/**
 * Cross-player query layer: given a group + round, fetches every user in
 * that group plus each of their per-round decision docs. Tolerates the
 * codebase's existing field-name/type inconsistencies rather than fixing
 * them (PlayerStepEight stores userId/simulationId as String;
 * PricingDecision's round field is named `round`, not `roundNumber`).
 */
async function fetchGroupRoundDecisions(simulationId, groupId, roundNumber) {
  const users = await User.find({ simulationId: String(simulationId), groupId: String(groupId) });

  return Promise.all(
    users.map(async (user) => {
      const uid = user._id;

      const [stepOne, stepFour, stepFive, stepEight, stepNine, productCategory, sourcingSelection, pricing] =
        await Promise.all([
          // Step 1 carries the player's chosen market positioning, which
          // decides WHICH segments they compete in. It wasn't fetched here at
          // all, so that choice had no effect on scoring whatsoever.
          PlayerStepOne.findOne({ userId: uid, simulationId, roundNumber }),
          PlayerStepFour.findOne({ userId: uid, simulationId, roundNumber }),
          PlayerStepFive.findOne({ userId: uid, simulationId, roundNumber }),
          PlayerStepEight.findOne({ userId: String(uid), simulationId: String(simulationId), roundNumber }),
          PlayerStepNine.findOne({ userId: uid, simulationId, roundNumber }),
          PlayerProductCategory.findOne({ userId: uid, simulationId, roundNumber }),
          UserSelection.findOne({ userId: uid, simulationId, roundNumber }),
          PricingDecision.findOne({ userId: uid, simulationId, round: roundNumber })
        ]);

      const supplier = sourcingSelection
        ? await SourcingSupplier.findById(sourcingSelection.supplierId)
        : null;

      return { user, stepOne, stepFour, stepFive, stepEight, stepNine, productCategory, supplier, pricing };
    })
  );
}

module.exports = { fetchGroupRoundDecisions };
