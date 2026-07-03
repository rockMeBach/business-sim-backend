const router = require("express").Router();
const { getDeliveryConfig } = require("../controllers/deliveryConfig.controller");

router.get("/", getDeliveryConfig);

module.exports = router;
