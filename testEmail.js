require("dotenv").config();
const { sendCredentialsEmail } = require("./utils/sendEmail");

(async () => {
  try {
    await sendCredentialsEmail({
      to: "shubhgupta4102@gmail.com",
      username: "player02",
      password: "Temp@123",
      simulationName: "Quick Commerce Simulation",
      groupName: "Team Alpha"
    });
    console.log("✅ EMAIL FUNCTION EXECUTED");
  } catch (err) {
    console.error("❌ EMAIL FAILED:", err);
  }
})();
