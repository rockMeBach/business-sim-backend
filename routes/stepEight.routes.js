const router = require("express").Router();
const {
  calculateStepEight,
  saveStepEight
} = require("../controllers/stepEight.controller");

router.post("/calculate", calculateStepEight);
router.post("/save", saveStepEight);

module.exports = router;
