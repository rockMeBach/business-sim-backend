/**
 * Replaces one Group's ("cohort") entire player roster: deletes its existing
 * User accounts and all their per-round decision/result docs, then creates a
 * fresh set of player accounts under the same group. Other cohorts and the
 * Simulation/Group shell itself are untouched.
 *
 * Usage: node replaceCohortRoster.js ["Cohort A"] [count]   (default cohort: "Cohort A", default count: 4)
 */
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
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
const PASSWORD = "Test@123";
const PLAYER_DATA_MODELS = [
  PricingDecision, PlayerStepOne, PlayerStepFour, PlayerStepFive,
  PlayerStepEight, PlayerStepNine, PlayerProductCategory, UserSelection,
  RDInvestment, PlayerRoundResult
];

(async () => {
  try {
    await connectDB();

    const cohortName = process.argv[2] || "Cohort A";
    const count = Number(process.argv[3]) || 4;

    const simulation = await Simulation.findOne({ name: SIMULATION_NAME });
    if (!simulation) {
      throw new Error(`Simulation "${SIMULATION_NAME}" not found — run seed.py first.`);
    }

    const group = await Group.findOne({ name: cohortName, simulationId: simulation._id });
    if (!group) {
      throw new Error(`Group "${cohortName}" not found under simulation "${simulation.name}".`);
    }

    const existingUsers = await User.find({ groupId: group._id.toString() }).select("_id username");
    const existingIds = existingUsers.map((u) => u._id);

    console.log(`Replacing roster for "${cohortName}" (${existingUsers.length} existing player(s)):`);
    existingUsers.forEach((u) => console.log(`  removing ${u.username}`));

    for (const Model of PLAYER_DATA_MODELS) {
      const result = await Model.deleteMany({ userId: { $in: existingIds } });
      console.log(`  ${Model.modelName}: ${result.deletedCount} deleted`);
    }
    const userDeleteResult = await User.deleteMany({ groupId: group._id.toString() });
    console.log(`  Users: ${userDeleteResult.deletedCount} deleted`);

    const passwordHash = await bcrypt.hash(PASSWORD, 10);
    const created = [];
    for (let i = 1; i <= count; i++) {
      const username = `player${i}`;
      const user = await User.create({
        username,
        password: passwordHash,
        simulationId: simulation._id.toString(),
        groupId: group._id.toString()
      });
      created.push(user.username);
    }

    console.log(`\nCreated ${count} fresh players in "${cohortName}":`);
    created.forEach((u) => console.log(`  ${u} / ${PASSWORD}`));
  } catch (err) {
    console.error("REPLACE FAILED:", err);
  } finally {
    await mongoose.disconnect();
  }
})();
