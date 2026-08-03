require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const connectDB = require("./config/db");
const Simulation = require("./models/Simulation");
const Group = require("./models/Group");
const User = require("./models/User");

const USERNAME = "player03";
const PASSWORD = "Temp@123";

(async () => {
  try {
    await connectDB();

    let simulation = await Simulation.findOne({ name: "Quick Commerce Simulation" });
    if (!simulation) {
      simulation = await Simulation.create({
        name: "Quick Commerce Simulation",
        totalRounds: 8,
        rounds: Array.from({ length: 8 }, (_, i) => ({
          roundNumber: i + 1,
          name: `Round ${i + 1}`
        }))
      });
    }

    let group = await Group.findOne({ name: "Team Alpha", simulationId: simulation._id });
    if (!group) {
      group = await Group.create({ name: "Team Alpha", simulationId: simulation._id });
    }

    const passwordHash = await bcrypt.hash(PASSWORD, 10);

    const user = await User.findOneAndUpdate(
      { username: USERNAME },
      {
        username: USERNAME,
        password: passwordHash,
        simulationId: simulation._id.toString(),
        groupId: group._id.toString()
      },
      { upsert: true, new: true }
    );

    console.log("User ready:");
    console.log("  username:", user.username);
    console.log("  password:", PASSWORD);
    console.log("  simulationId:", user.simulationId);
    console.log("  groupId:", user.groupId);
  } catch (err) {
    console.error("FAILED:", err);
  } finally {
    await mongoose.disconnect();
  }
})();
