const router = require("express").Router();
const { getDecisions } = require("../controllers/decisions.controller");

// GET /api/decisions?userId=&simulationId=&roundNumber=
// Every saved decision for one player in one round, in a single response.
router.get("/", getDecisions);

module.exports = router;
