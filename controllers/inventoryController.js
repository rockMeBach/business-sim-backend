const Inventory = require("../models/InventoryModel");

exports.getInventoryData = async (req, res) => {
  try {
    const round = req.query.round || "R5";

    const data = await Inventory.findOne({ round });

    if (!data) {
      return res.status(404).json({ message: "Inventory data not found" });
    }

    res.json(data);

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};