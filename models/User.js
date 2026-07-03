const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
    email: {
    type: String,
    required: false, // keep false to avoid breaking old users
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  simulationId: {
    type: String,
    required: true
  },
  groupId: {
    type: String,
    required: true
  }
});

module.exports = mongoose.model("User", UserSchema);