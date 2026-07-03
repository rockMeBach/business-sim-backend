const ProductCategory = require("../models/ProductCategory");

exports.getPricingCategories = async (req, res) => {
  try {
    const categories = await ProductCategory.find({ isActive: true });

    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({
      message: "Failed to load pricing categories"
    });
  }
};
