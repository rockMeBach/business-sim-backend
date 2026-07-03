const MarketingConfig = require("../models/MarketingConfig");

exports.getMarketingConfig = async (req, res) => {
  try {
    const config = await MarketingConfig.find({ isActive: true });

    res.status(200).json(config);
  } catch (error) {
    res.status(500).json({
      message: "Failed to load marketing config"
    });
  }
};

exports.saveMarketingConfig = async (req, res) => {
  try {
    const { userId, simulationId, roundNumber, marketingData } = req.body;

    if (!userId || !simulationId || !roundNumber || !marketingData) {
      return res.status(400).json({
        message: "Missing or invalid payload"
      });
    }



    return res.json({
      message: "Marketing config saved successfully",
      data: marketingData
    });
  } catch (error) {
    console.error("❌ Marketing Config INTERNAL ERROR:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
  }
};