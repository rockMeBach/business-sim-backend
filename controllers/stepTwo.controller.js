const ProductCategory = require("../models/ProductCategory");
const PlayerProductCategory = require("../models/PlayerProductCategory");
const PlayerStepOne = require("../models/PlayerStepOne");


exports.getAllCategories = async (req, res) => {
  try {
    const { userId } = req.query;

    // Custom categories are visible only to the player who created them —
    // everyone else just sees the admin-seeded (non-custom) ones.
    const filter = userId
      ? { isActive: true, $or: [{ isCustom: { $ne: true } }, { createdByUserId: userId }] }
      : { isActive: true, isCustom: { $ne: true } };

    const categories = await ProductCategory.find(filter);
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch categories" });
  }
};

exports.createCustomCategory = async (req, res) => {
  try {
    const {
      userId,
      name,
      baseCost,
      baseMonthlyDemand,
      pricingTiers,
      segmentDemand,
      localCompetitionIntensity
    } = req.body;

    if (!userId || !name) {
      return res.status(400).json({ message: "userId and name are required" });
    }
    if (baseCost === undefined || baseMonthlyDemand === undefined) {
      return res.status(400).json({ message: "baseCost and baseMonthlyDemand are required" });
    }

    const category = await ProductCategory.create({
      name,
      baseCost,
      baseMonthlyDemand,
      pricingTiers: pricingTiers || {},
      segmentDemand: segmentDemand || {},
      localCompetitionIntensity: localCompetitionIntensity || "med",
      isCustom: true,
      createdByUserId: userId
    });

    res.status(201).json(category);
  } catch (error) {
    console.error("Create custom category error:", error);
    res.status(500).json({ message: "Failed to create category", error: error.message });
  }
};

exports.deleteCustomCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    const category = await ProductCategory.findById(id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }
    if (!category.isCustom || String(category.createdByUserId) !== String(userId)) {
      return res.status(403).json({ message: "You can only remove categories you created" });
    }

    await category.deleteOne();
    res.json({ message: "Category removed" });
  } catch (error) {
    console.error("Delete custom category error:", error);
    res.status(500).json({ message: "Failed to remove category", error: error.message });
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
        pricingTiers: category.pricingTiers,
        warehouseCapacity: c.warehouseCapacity
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