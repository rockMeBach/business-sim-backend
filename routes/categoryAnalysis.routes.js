const express = require("express");
const router = express.Router();
const controller = require("../controllers/categoryAnalysis.controller");

router.get("/:categoryId", controller.getCategoryAnalysis);

module.exports = router;
