const express = require("express");

const router = express.Router();

const {
  getIncomeData
} = require("../controllers/incomeController");

router.get("/", getIncomeData);

module.exports = router;