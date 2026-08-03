const UserSelection = require("../models/UserSelection");

exports.saveSelection = async (req, res) => {
  try {
    const { userId, simulationId, roundNumber, supplierId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required"
      });
    }

    if (!simulationId) {
      return res.status(400).json({
        success: false,
        message: "Simulation ID is required"
      });
    }

    if (!roundNumber) {
      return res.status(400).json({
        success: false,
        message: "Round number is required"
      });
    }

    if (!supplierId) {
      return res.status(400).json({
        success: false,
        message: "Supplier ID is required"
      });
    }

    const selection = await UserSelection.findOneAndUpdate(
      { userId, simulationId, roundNumber },
      {
        userId,
        simulationId,
        roundNumber,
        supplierId
      },
      { new: true, upsert: true }
    );

    res.status(200).json({
      success: true,
      message: "Supplier selected successfully",
      data: selection
    });
  } catch (err) {
    console.error("SELECTION SAVE ERROR:", err.message);
    res.status(500).json({
      success: false,
      message: "Error saving selection",
      error: err.message
    });
  }
};
