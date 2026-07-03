const PricingDecision = require("../models/PricingDecision");
const PricingConfig = require("../models/PricingConfig");

exports.savePricingDecision = async (req, res) => {
  const { userId, simulationId, round, categories, selectedFeatures, rdInvestment } = req.body;

  if (!Array.isArray(categories) || categories.length === 0) {
    return res.status(400).json({ message: "No categories provided" });
  }

  // Fix finalSellingPrice calculation
  const correctedCategories = categories.map(cat => ({
    ...cat,
    finalSellingPrice: Math.round(cat.qualityPrice * cat.marginMultiplier)
  }));

  const saved = await PricingDecision.findOneAndUpdate(
    { userId, simulationId, round },
    {
      userId,
      simulationId,
      round,
      categories: correctedCategories,
      selectedFeatures,
      rdInvestment
    },
    { upsert: true, new: true }
  );

  res.json(saved);
};

