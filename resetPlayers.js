/**
 * Wipes all player-specific data (accounts, every per-round decision doc,
 * computed round results) while keeping the Simulation/Group shell and all
 * shared engine config (categories, suppliers, scoring constants, etc.)
 * intact, then creates a fresh set of player accounts to test with.
 *
 * Usage: node resetPlayers.js [count]   (default count: 3)
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

const PASSWORD = "Test@123";
const PLAYER_DATA_MODELS = [
  PricingDecision, PlayerStepOne, PlayerStepFour, PlayerStepFive,
  PlayerStepEight, PlayerStepNine, PlayerProductCategory, UserSelection,
  RDInvestment, PlayerRoundResult
];

(async () => {
  try {
    await connectDB();

    const simulation = await Simulation.findOne({ name: "QuickCommerce Round 1" });
    const group = simulation && await Group.findOne({ simulationId: simulation._id });
    if (!simulation || !group) {
      throw new Error('Expected Simulation "QuickCommerce Round 1" / its Group to already exist — run seed.py first.');
    }

    console.log("Wiping player data...");
    const userDeleteResult = await User.deleteMany({});
    console.log(`  Users: ${userDeleteResult.deletedCount} deleted`);
    for (const Model of PLAYER_DATA_MODELS) {
      const result = await Model.deleteMany({});
      console.log(`  ${Model.modelName}: ${result.deletedCount} deleted`);
    }

    const count = Number(process.argv[2]) || 3;
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

    console.log(`\nCreated ${count} fresh players under simulation "${simulation.name}" / group "${group.name}":`);
    created.forEach((u) => console.log(`  ${u} / ${PASSWORD}`));
  } catch (err) {
    console.error("RESET FAILED:", err);
  } finally {
    await mongoose.disconnect();
  }
})();
