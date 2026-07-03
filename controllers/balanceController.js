const Balance = require("../models/BalanceModel");

exports.getBalanceData = async (req, res) => {
  try {
    const round = req.query.round || "R5";

    const balance = await Balance.findOne({ round });

    if (!balance) {
      return res.status(404).json({ message: "Data not found" });
    }

    res.json(balance);

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};