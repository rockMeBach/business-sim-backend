const express = require("express");
const router = express.Router();

const { getBalanceData } = require("../controllers/balanceController");

router.get("/", getBalanceData);

module.exports = router;