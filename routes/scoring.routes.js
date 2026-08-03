const router = require("express").Router();
const { calculateRound, getMyRoundResult, getLeaderboard, getCompetitiveLandscape } = require("../controllers/scoring.controller");

router.post("/calculate-round", calculateRound);
router.get("/my-result", getMyRoundResult);
router.get("/leaderboard", getLeaderboard);
router.get("/competitive-landscape", getCompetitiveLandscape);

module.exports = router;
