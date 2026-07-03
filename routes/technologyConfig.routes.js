const router = require("express").Router();
const {
  getTechnologyConfig
} = require("../controllers/technologyConfig.controller");

router.get("/", getTechnologyConfig);

module.exports = router;
