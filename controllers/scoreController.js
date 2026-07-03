const Score = require("../models/ScoreModel");

exports.getScoreData = async (req, res) => {
  try {
    const round = req.query.round || "R5";

    const data = await Score.findOne({ round });

    if (!data) {
      return res.status(404).json({ message: "Score data not found" });
    }

    res.json(data);

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};