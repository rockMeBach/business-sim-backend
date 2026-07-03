const router = require("express").Router();
const { createGroup,getGroupsBySimulation } = require("../controllers/group.controller");

router.post("/create", createGroup);
router.get("/by-simulation/:simulationId", getGroupsBySimulation);


module.exports = router;
