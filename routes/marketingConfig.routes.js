const router = require("express").Router();
const MarketingConfig = require("../models/MarketingConfig");

router.get("/", async (req, res) => {
  try {
    const config = await MarketingConfig.findOne();
    if (!config) {
      return res.status(404).json({ message: "Marketing config not found" });
    }
    res.json(config);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
                