const express = require("express");
const router = express.Router();

const {
  calculateStepFour,
  saveStepFour
} = require("../controllers/stepFour.controller");

router.post("/calculate", calculateStepFour);
router.post("/save", saveStepFour);

module.exports = router;
