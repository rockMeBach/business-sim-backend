const router = require("express").Router();
const {
  addBusinessModel,
  addMarketPosition
} = require("../controllers/adminOptions.controller");

router.post("/business-model", addBusinessModel);
router.post("/market-position", addMarketPosition);

module.exports = router;
