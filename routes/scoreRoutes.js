const express = require("express");
const router = express.Router();

const { getScoreData } = require("../controllers/scoreController");

router.get("/", getScoreData);

module.exports = router;