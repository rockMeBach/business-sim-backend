const PricingConfig = require("../models/PricingConfig");
const Feature = require("../models/Feature");

exports.getPricingConfig = async (req, res) => {
  try {
    const config = await PricingConfig.findOne();
    const features = await Feature.find();

    if (!config) {
      return res.status(404).json({ message: "Pricing config not found" });
    }

    // ⭐ derive allowed quality levels from config
    const maxBaseQuality = config.maxBaseQuality || 5;

    const allowedQualityLevels = Array.from(
      { length: maxBaseQuality },
      (_, i) => i + 1
    );

    res.json({
      config,
      features,
      quality: {
        maxBaseQuality,
        allowedQualityLevels
      }
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to load pricing config"
    });
  }
};
