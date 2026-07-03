const router = require("express").Router();
const {
  getStepOneOptions,
  saveStepOne
} = require("../controllers/stepOne.controller");

router.get("/options", getStepOneOptions);   
router.post("/save", saveStepOne);           

module.exports = router;
