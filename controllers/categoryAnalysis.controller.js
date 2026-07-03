const CategoryAnalysis = require("../models/CategoryAnalysis");
const ProductCategory = require("../models/ProductCategory");

/* GET ANALYSIS FOR SELECTED CATEGORY */
exports.getCategoryAnalysis = async (req, res) => {
  try {
    const { categoryId } = req.params;

    const category = await ProductCategory.findById(categoryId);
    if (!category)
      return res.status(404).json({ message: "Category not found" });

    const analysis = await CategoryAnalysis
      .findOne({ category: categoryId })
      .populate("category", "name");

    if (!analysis)
      return res.status(404).json({ message: "Analysis not found" });

    res.json({
      category: category.name,
      analysis
    });

  } catch (err) {
    console.error("CATEGORY ANALYSIS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};
