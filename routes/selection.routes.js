
const router = require("express").Router();
const { saveSelection } = require("../controllers/selection.controller");

router.post("/save", saveSelection);

module.exports = router;
