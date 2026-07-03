const CashFlow = require("../models/CashFlowModel");

exports.getCashFlowData = async (req, res) => {
  try {
    const round = req.query.round || "R5";

    const data = await CashFlow.findOne({ round });

    if (!data) {
      return res.status(404).json({ message: "Cash flow data not found" });
    }

    res.json(data);

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};