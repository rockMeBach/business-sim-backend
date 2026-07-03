const express = require("express");
const router = express.Router();
const teamProfileController = require("../controllers/teamProfileController");

router.post("/create", teamProfileController.createTeamProfile);

module.exports = router;
