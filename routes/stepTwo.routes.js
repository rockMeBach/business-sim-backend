const router = require("express").Router();
const {
  getAllCategories,
  saveStepTwo,
  createCustomCategory,
  deleteCustomCategory
} = require("../controllers/stepTwo.controller");

router.get("/categories", getAllCategories);
router.post("/categories/custom", createCustomCategory);
router.delete("/categories/custom/:id", deleteCustomCategory);
router.post("/save", saveStepTwo);

module.exports = router;
