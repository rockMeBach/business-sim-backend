const ProductCategory = require("../models/ProductCategory");
const PlayerProductCategory = require("../models/PlayerProductCategory");
const PlayerStepOne = require("../models/PlayerStepOne");


exports.getAllCategories = async (req, res) => {
  try {
    const categories = await ProductCategory.find({ isActive: true });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch categories" });
  }
};

exports.saveStepTwo = async (req, res) => {
  try {
    const { userId, simulationId, roundNumber, categories } = req.body;

    if (!userId || !simulationId || !roundNumber || !Array.isArray(categories)) {
      return res.status(400).json({
        message: "Missing or invalid payload"
      });
    }

    const enrichedCategories = [];

    for (const c of categories) {
      const category = await ProductCategory.findById(c.categoryId);

      if (!category) {
        return res.status(400).json({
          message: `Invalid categoryId: ${c.categoryId}`
        });
      }

      enrichedCategories.push({
        categoryId: c.categoryId,
        enabled: c.enabled,
        baseCost: category.baseCost,
        pricingTiers: category.pricingTiers
      });
    }

    const saved = await PlayerProductCategory.findOneAndUpdate(
      { userId, simulationId, roundNumber },
      { categories: enrichedCategories },
      { upsert: true, new: true }
    );

    return res.json({
      message: "STEP-2 saved successfully",
      data: saved
    });

  } catch (error) {
    console.error("❌ STEP-2 INTERNAL ERROR:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
  }
};