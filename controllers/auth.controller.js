const User = require("../models/User");
const PlayerRoundResult = require("../models/PlayerRoundResult");
const Simulation = require("../models/Simulation");
const Group = require("../models/Group");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// "Current round" used to live only in the browser's localStorage (always
// reset to 1 on a fresh login/device, and never revisited once
// gameState.started was true), so switching browsers, logging in incognito,
// or an admin recreating players mid-testing all left the player stuck on a
// stale round forever. Derive it here instead: a round only counts as done
// once it's been SCORED (matches RoundLeaderboard's own gate on advancing
// past a round via "Continue to Round N+1", which stays disabled until the
// whole group finishes) — not just submitted by this one player. Shared by
// both login (fresh session) and /me (re-sync on every app load, including
// already-"started" sessions that never see the login screen again).
async function deriveRoundProgress(user) {
  const [simulation, scoredRounds] = await Promise.all([
    Simulation.findById(user.simulationId),
    PlayerRoundResult.find({ userId: user._id, simulationId: user.simulationId }, "roundNumber")
  ]);
  const maxRounds = simulation?.totalRounds ?? 8;
  const lastScoredRound = scoredRounds.reduce((max, r) => Math.max(max, r.roundNumber), 0);
  const currentRound = Math.min(lastScoredRound + 1, maxRounds);
  return { currentRound, maxRounds };
}

exports.login = async (req, res) => {
  try {
    const { username, password, groupId } = req.body;

    if (!groupId) {
      return res.status(400).json({ message: "groupId is required" });
    }

    // Usernames are only unique WITHIN a group (different groups each have
    // their own player1..playerN roster), so the group picked in the login
    // dropdown is part of the lookup, not just a display label.
    const user = await User.findOne({ username, groupId });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    const [{ currentRound, maxRounds }, group] = await Promise.all([
      deriveRoundProgress(user),
      Group.findById(user.groupId)
    ]);

    res.json({
      token,
      userId: user._id,
      username: user.username,
      simulationId: user.simulationId,
      groupId: user.groupId,
      // Usernames repeat across cohorts, so the group name is the only thing
      // that identifies WHICH player1 this session is.
      groupName: group?.name || "",
      role: user.role,
      currentRound,
      maxRounds
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// The frontend caches identity (userId/simulationId/groupId/jwt) in
// localStorage indefinitely — there was previously no way for it to notice
// when that cached identity goes stale (e.g. an admin wipes/recreates
// players directly in Mongo, as happens routinely between test rounds).
// The stored userId would then point at a deleted document forever, with
// every page silently failing against dead references instead of prompting
// a fresh login. This lets the frontend verify its cached identity still
// resolves to a real user on load, and re-sync simulationId/groupId in case
// the account moved groups.
exports.me = async (req, res) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: "User no longer exists" });
    }

    const [{ currentRound, maxRounds }, group] = await Promise.all([
      deriveRoundProgress(user),
      Group.findById(user.groupId)
    ]);

    res.json({
      userId: user._id,
      username: user.username,
      simulationId: user.simulationId,
      groupId: user.groupId,
      groupName: group?.name || "",
      role: user.role,
      currentRound,
      maxRounds
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
