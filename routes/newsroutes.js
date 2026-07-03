const express = require("express");
const router = express.Router();

const {
  createNews,
  getAllNews,
  getNewsByTag,
  getSingleNews
} = require("../controllers/newsController");

// Create
router.post("/", createNews);

// Page 1
router.get("/", getAllNews);

// Filter buttons
router.get("/tag/:tag", getNewsByTag);

// Page 2
router.get("/:id", getSingleNews);

module.exports = router;
