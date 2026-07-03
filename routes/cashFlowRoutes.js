const express = require("express");
const router = express.Router();

const { getCashFlowData } = require("../controllers/cashFlowController");

router.get("/", getCashFlowData);

module.exports = router;