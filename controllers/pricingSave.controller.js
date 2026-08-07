const PricingDecision = require("../models/PricingDecision");
const PricingConfig = require("../models/PricingConfig");

exports.savePricingDecision = async (req, res) => {
  const { userId, simulationId, round, categories, selectedFeatures, rdInvestment } = req.body;

  if (!Array.isArray(categories) || categories.length === 0) {
    return res.status(400).json({ message: "No categories provided" });
  }

  // Recompute both prices from config rather than trusting the client's
  // figures. qualityPrice used to arrive as baseMonthlyDemand * qualityMult —
  // a unit count scaled by a price multiplier — and this controller derived
  // finalSellingPrice from it, so both stored prices were quantities. Per
  // unit: buying = baseUnitPrice * cpMult, selling = buying * marginMultiplier,
  // which is exactly what the scoring engine charges and earns
  // (utils/scoringEngine/qualityPricing.js: spMultBase = cpMult * spMult).
  const pricingConfig = await PricingConfig.findOne();
  const baseUnitPrice = pricingConfig?.baseUnitPrice || 0;

  const correctedCategories = categories.map(cat => {
    const cpMult =
      pricingConfig?.qualityTiers?.get(String(cat.qualityLevel))?.cpMult ??
      cat.qualityMultiplier ??
      1;
    const margin = typeof cat.marginMultiplier === "number" ? cat.marginMultiplier : 1;
    const qualityPrice = baseUnitPrice * cpMult;

    return {
      ...cat,
      qualityMultiplier: cpMult,
      qualityPrice: Math.round(qualityPrice),
      finalSellingPrice: Math.round(qualityPrice * margin)
    };
  });

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

