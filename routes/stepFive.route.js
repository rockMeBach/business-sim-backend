const router = require("express").Router();
const {
  calculateStepFive,
  saveStepFive
} = require("../controllers/stepFive.controller");

router.post("/calculate", calculateStepFive);
router.post("/save", saveStepFive);

module.exports = router;
