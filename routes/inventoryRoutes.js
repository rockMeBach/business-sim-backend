const express = require("express");
const router = express.Router();

const { getInventoryData } = require("../controllers/inventoryController");

router.get("/", getInventoryData);

module.exports = router;