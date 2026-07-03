const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

exports.sendCredentialsEmail = async ({
  to,
  username,
  password,
  simulationName,
  groupName
}) => {
  try {
    await transporter.sendMail({
      from: `"Simulation Admin" <${process.env.EMAIL_FROM}>`,
      to,
      subject: "Your Simulation Login Credentials",
      html: `
        <h3>Simulation Access</h3>
        <p><b>Simulation:</b> ${simulationName}</p>
        <p><b>Group:</b> ${groupName}</p>
        <p><b>Username:</b> ${username}</p>
        <p><b>Password:</b> ${password}</p>
      `
    });

    console.log("✅ Email sent successfully");
  } catch (err) {
    console.error("❌ Email error:", err.message);
    throw err;
  }
};
