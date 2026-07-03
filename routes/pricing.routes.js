const express = require("express");
const { getPricingConfig } = require("../controllers/pricingConfig.controller.js");
const { calculatePricingImpact } = require("../controllers/pricingCalculate.controller.js");
const { savePricingDecision } = require("../controllers/pricingSave.controller.js");
const { getPricingCategories } = require("../controllers/pricingCategories.controller");

const router = express.Router();

router.get("/config", getPricingConfig);
router.post("/calculate", calculatePricingImpact);
router.post("/save", savePricingDecision);
router.get("/categories", getPricingCategories);

module.exports = router;
 