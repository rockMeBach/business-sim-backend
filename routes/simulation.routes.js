const router = require("express").Router();
const { createSimulation,getAllSimulations } = require("../controllers/simulation.controller");

router.post("/create", createSimulation);
router.get("/list", getAllSimulations);


module.exports = router;
