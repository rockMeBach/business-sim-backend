require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");
const Simulation = require("./models/Simulation");
const Group = require("./models/Group");
const { sendCredentialsEmail } = require("./utils/sendEmail");

mongoose.connect(process.env.MONGO_URI);

(async () => {
  const username = process.argv[2];
  if (!username) {
    console.log("❌ Provide username");
    process.exit(1);
  }

  const user = await User.findOne({ username });
  if (!user) {
    console.log("❌ User not found");
    process.exit(1);
  }

  const simulation = await Simulation.findById(user.simulationId);
  const group = await Group.findById(user.groupId);

  await sendCredentialsEmail({
    to: user.email,
    username: user.username,
    password: "Temp@123", // admin-known password
    simulationName: simulation.name,
    groupName: group.name
  });

  console.log("✅ Email sent to", user.email);
  process.exit(0);
})();
