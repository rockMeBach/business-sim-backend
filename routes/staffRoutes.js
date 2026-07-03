const express = require("express");
const router = express.Router();

const { getStaffData } = require("../controllers/staffController");

router.get("/", getStaffData);

module.exports = router;