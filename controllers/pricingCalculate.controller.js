const PricingConfig = require("../models/PricingConfig"); 
const ProductCategory = require("../models/ProductCategory");

exports. calculatePricingImpact = async (req, res) => {
  const { categories, selectedFeatures } = req.body;
  // categories = [{ categoryId, qualityLevel, price }]

  const config = await PricingConfig.findOne();
  if (!config) {
    return res.status(404).json({ message: "Config not found" });
  }

  let totalRevenue = 0;
  let totalCost = 0;

  const results = [];

  for (const c of categories) {
    const category = await ProductCategory.findById(c.categoryId);
    if (!category) continue;

    const baseCost =
      config.baseCostPerCategory.get(category.name) || 0;

    const multiplier =
      config.qualityMultipliers.get(String(c.qualityLevel)) || 1;

    const unitCost = baseCost * multiplier;
    const demand = category.baseMonthlyDemand;

    const revenue = c.price * demand;
    const cost = unitCost * demand;

    totalRevenue += revenue;
    totalCost += cost;

    results.push({
      category: category.name,
      demand,
      unitCost,
      sellingPrice: c.price,
      marginPercent: Math.round(((revenue - cost) / revenue) * 100)
    });
  }

  res.json({
    totalRevenue,
    totalCost,
    overallMargin: Math.round(
      ((totalRevenue - totalCost) / totalRevenue) * 100
    ),
    perCategory: results
  });
};
