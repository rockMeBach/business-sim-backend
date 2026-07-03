const TechnologyConfig = require("../models/TechnologyConfig");

exports.getTechnologyConfig = async (req, res) => {
  try {
    const config = await TechnologyConfig.findOne();

    if (!config) {
      return res.status(404).json({
        message: "Technology configuration not found"
      });
    }

    res.json(config);
  } catch (err) {
    console.error("TECH CONFIG ERROR:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};
 