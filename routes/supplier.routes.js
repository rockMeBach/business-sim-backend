
const router = require("express").Router();
const Supplier = require("../models/Supplier");

router.get("/", async (req, res) => {
  try {
    const suppliers = await Supplier.find();
    res.json(suppliers);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
