const mongoose = require("mongoose");

const teamMemberSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  designation: {
    type: String,
    required: true,
    trim: true
  }
});

const teamProfileSchema = new mongoose.Schema({
  companyName: {
    type: String,
    required: true,
    trim: true
  },
  teamMembers: {
    type: [teamMemberSchema],
    validate: [arrayLimit, '{PATH} exceeds the limit of 6']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Maximum 6 members validation
function arrayLimit(val) {
  return val.length <= 6;
}

module.exports = mongoose.model("TeamProfile", teamProfileSchema);
