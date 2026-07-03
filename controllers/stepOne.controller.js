const BusinessModelOption = require("../models/BusinessModelOption");
const MarketPositionOption = require("../models/MarketPositionOption");
const PlayerStepOne = require("../models/PlayerStepOne");

exports.getStepOneOptions = async (req, res) => {
  try {
    const businessModels = await BusinessModelOption.find({ isActive: true });
    const marketPositions = await MarketPositionOption.find({ isActive: true });

    res.json({
      businessModels,
      marketPositions
    });
  } catch (error) {
    console.error("Get step one options error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.saveStepOne = async (req, res) => {
  try {
    const { userId, simulationId, businessModelId, marketPositionIds } = req.body;

    if (!userId || !simulationId) {
      return res.status(400).json({ message: "userId and simulationId are required" });
    }

    if (!businessModelId) {
      return res.status(400).json({ message: "Business Model is required" });
    }

    if (!marketPositionIds || !Array.isArray(marketPositionIds) || marketPositionIds.length === 0) {
      return res.status(400).json({ message: "At least one Market Position is required" });
    }

    const stepOne = await PlayerStepOne.findOneAndUpdate(
      { userId, simulationId },
      {
        businessModelId,
        marketPositionIds
      },
      { upsert: true, new: true }
    );

    res.status(200).json({
      message: "STEP 1 saved successfully",
      stepOne
    });
  } catch (error) {
    console.error("Save step one error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};