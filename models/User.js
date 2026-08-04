const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
    // No longer globally unique — see the compound index below. Different
    // groups each field their own "player1".."playerN" roster, so the same
    // username must be allowed to exist once PER GROUP.
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

// Login now looks a user up by {username, groupId} (the group is chosen via
// a dropdown before the user types their credentials), so uniqueness only
// needs to hold within a group, not across the whole simulation/DB.
UserSchema.index({ username: 1, groupId: 1 }, { unique: true });

module.exports = mongoose.model("User", UserSchema);