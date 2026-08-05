/**
 * Resets round progress for every player in one Group ("cohort") without
 * touching their accounts or any other cohort's data: deletes their docs
 * from every per-round decision/result collection, keyed by userId, so they
 * log back in with the same username/password and start fresh from round 1.
 *
 * Usage: node resetCohort.js ["Cohort A"]   (default cohort name: "Cohort A")
 */
require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("./config/db");

const Simulation = require("./models/Simulation");
const Group = require("./models/Group");
const User = require("./models/User");
const PricingDecision = require("./models/PricingDecision");
const PlayerStepOne = require("./models/PlayerStepOne");
const PlayerStepFour = require("./models/PlayerStepFour");
const PlayerStepFive = require("./models/PlayerStepFive");
const PlayerStepEight = require("./models/PlayerStepEight");
const PlayerStepNine = require("./models/PlayerStepNine");
const PlayerProductCategory = require("./models/PlayerProductCategory");
const UserSelection = require("./models/UserSelection");
const RDInvestment = require("./models/RDInvestment");
const PlayerRoundResult = require("./models/PlayerRoundResult");

const SIMULATION_NAME = "QuickCommerce Round 1";
const PLAYER_DATA_MODELS = [
  PricingDecision, PlayerStepOne, PlayerStepFour, PlayerStepFive,
  PlayerStepEight, PlayerStepNine, PlayerProductCategory, UserSelection,
  RDInvestment, PlayerRoundResult
];

(async () => {
  try {
    await connectDB();

    const cohortName = process.argv[2] || "Cohort A";

    const simulation = await Simulation.findOne({ name: SIMULATION_NAME });
    if (!simulation) {
      throw new Error(`Simulation "${SIMULATION_NAME}" not found — run seed.py first.`);
    }

    const group = await Group.findOne({ name: cohortName, simulationId: simulation._id });
    if (!group) {
      throw new Error(`Group "${cohortName}" not found under simulation "${simulation.name}".`);
    }

    const users = await User.find({ groupId: group._id.toString() }).select("_id username");
    if (users.length === 0) {
      console.log(`No players found in "${cohortName}" — nothing to reset.`);
      return;
    }
    const userIds = users.map((u) => u._id);

    console.log(`Resetting ${users.length} player(s) in "${cohortName}":`);
    users.forEach((u) => console.log(`  ${u.username}`));

    for (const Model of PLAYER_DATA_MODELS) {
      const result = await Model.deleteMany({ userId: { $in: userIds } });
      console.log(`  ${Model.modelName}: ${result.deletedCount} deleted`);
    }

    console.log(`\nDone. Accounts untouched — players log back in with their existing credentials.`);
  } catch (err) {
    console.error("RESET FAILED:", err);
  } finally {
    await mongoose.disconnect();
  }
})();
