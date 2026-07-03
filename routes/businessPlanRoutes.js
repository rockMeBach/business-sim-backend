const express = require("express");
const router = express.Router();
const controller = require("../controllers/businessPlanController");

// load page data
router.get("/:section", controller.getSection);

// save page data
router.post("/:section", controller.saveSection);

module.exports = router;
