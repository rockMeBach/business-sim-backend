const router = require("express").Router();
const {
  getOperationsConfig,
  calculateStepNine,
  saveStepNine
} = require("../controllers/stepNine.controller");

router.get("/operations-staffing-config", getOperationsConfig);
router.post("/step-nine/calculate", calculateStepNine);
router.post("/step-nine/save", saveStepNine);

module.exports = router;
