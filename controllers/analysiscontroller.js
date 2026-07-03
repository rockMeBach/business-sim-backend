const CategoryAnalysis = require("../models/Useranalysis");

/**
 * GET analysis for a category + tier
 * Example:
 * GET /api/analysis/Food/premium
 */
exports.getCategoryTierAnalysis = async (req, res) => {
  try {
    const { categoryName, tier } = req.params;

    // validate tier
    const allowedTiers = ["premium", "standard", "basic", "discount"];
    if (!allowedTiers.includes(tier)) {
      return res.status(400).json({ message: "Invalid tier" });
    }

    // find category analysis
    const analysis = await CategoryAnalysis.findOne({
      categoryName,
    });

    if (!analysis) {
      return res.status(404).json({ message: "Category not found" });
    }

    const tierData = analysis.tiers[tier];

    if (!tierData) {
      return res.status(404).json({ message: "Tier data not found" });
    }

    // return ONLY selected tier data
    return res.json({
      categoryName,
      tier,
      analysis: tierData,
    });
  } catch (error) {
    console.error("Analysis fetch error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
