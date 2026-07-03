const router = require("express").Router();
const {
  getAllCategories,
  saveStepTwo
} = require("../controllers/stepTwo.controller");

router.get("/categories", getAllCategories);  
router.post("/save", saveStepTwo);

module.exports = router;
