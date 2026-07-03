// src/routes/hr.routes.js
const express = require("express");
const { getHRData ,saveHRConfig} = require("../controllers/hr.controller");
const router = express.Router();

router.get("/hr", getHRData);
router.post("/hr/save", saveHRConfig);

module.exports = router;
