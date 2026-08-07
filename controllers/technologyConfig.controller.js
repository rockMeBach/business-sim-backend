const TechnologyConfig = require("../models/TechnologyConfig");
const { WEBSITE_BUDGET_UNIT } = require("../utils/websiteBudget");

exports.getTechnologyConfig = async (req, res) => {
  try {
    const config = await TechnologyConfig.findOne();

    if (!config) {
      return res.status(404).json({
        message: "Technology configuration not found"
      });
    }

    // Served alongside the config so the slider's rupee-per-notch comes from
    // the same constant the P&L charges. The client used to hardcode its own
    // copy in three places, which is exactly how it drifted before.
    res.json({ ...config.toObject(), websiteBudgetUnit: WEBSITE_BUDGET_UNIT });
  } catch (err) {
    console.error("TECH CONFIG ERROR:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};
 