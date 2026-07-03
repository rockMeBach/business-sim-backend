
const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  role: String,
  expertise: String,
  salaryPerMonth: Number,
  profileImage: String,
  isTopManagement: {
    type: Boolean,
    default: false
  }
});

module.exports= mongoose.model("Employee", employeeSchema);
