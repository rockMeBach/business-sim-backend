
const router = require("express").Router();
const CategoryAnalysis = require("../models/Useranalysis");

router.get("/:category/:tier", async (req, res) => {
  const { category, tier } = req.params;

  const data = await CategoryAnalysis.findOne({
    categoryName: category,
  });

  if (!data || !data.tiers[tier]) {
    return res.status(404).json({ message: "Data not found" });
  }

  res.json(data.tiers[tier]);
})

module.exports = router;
