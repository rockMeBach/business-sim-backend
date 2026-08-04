/**
 * Provisions groups and players from a config list — the reusable tool for
 * "here's a group name, username, password" requests. Idempotent: upserts
 * groups by name (within the simulation), upserts users by
 * {username, groupId} (usernames only need to be unique within their own
 * group, not across the whole simulation).
 *
 * Usage: edit the ROSTER array below, then `node provisionPlayers.js`.
 * Runs against whatever MONGO_URI is currently set in .env.
 */
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const connectDB = require("./config/db");
const Simulation = require("./models/Simulation");
const Group = require("./models/Group");
const User = require("./models/User");

const SIMULATION_NAME = "QuickCommerce Round 1";

const ROSTER = [
  { groupName: "Group 2", username: "player1", password: "Test@123" },
  { groupName: "Group 2", username: "player2", password: "Test@123" },
  { groupName: "Group 2", username: "player3", password: "Test@123" },
  { groupName: "Group 2", username: "player4", password: "Test@123" },
  { groupName: "Group 2", username: "player5", password: "Test@123" },
  { groupName: "Group 2", username: "player6", password: "Test@123" }
];

(async () => {
  try {
    await connectDB();
    const simulation = await Simulation.findOne({ name: SIMULATION_NAME });
    if (!simulation) {
      throw new Error(`Simulation "${SIMULATION_NAME}" not found — run seed.py first.`);
    }

    const groupCache = new Map();
    async function getOrCreateGroup(name) {
      if (groupCache.has(name)) return groupCache.get(name);
      let group = await Group.findOne({ name, simulationId: simulation._id });
      if (!group) {
        group = await Group.create({ name, simulationId: simulation._id });
        console.log(`Created group "${name}"`);
      }
      groupCache.set(name, group);
      return group;
    }

    for (const entry of ROSTER) {
      const group = await getOrCreateGroup(entry.groupName);
      const passwordHash = await bcrypt.hash(entry.password, 10);
      await User.findOneAndUpdate(
        { username: entry.username, groupId: group._id.toString() },
        {
          username: entry.username,
          password: passwordHash,
          simulationId: simulation._id.toString(),
          groupId: group._id.toString()
        },
        { upsert: true, new: true }
      );
      console.log(`  ${entry.groupName} / ${entry.username} / ${entry.password}`);
    }

    console.log("\nDone.");
  } catch (err) {
    console.error("PROVISIONING FAILED:", err);
  } finally {
    await mongoose.disconnect();
  }
})();
