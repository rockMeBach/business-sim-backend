const Simulation = require("../models/Simulation");

exports.createSimulation = async (req, res) => {
  const { name, totalRounds } = req.body;

  if (!totalRounds || totalRounds < 1) {
    return res.status(400).json({ message: "totalRounds must be >= 1" });
  }

  const rounds = [];
  for (let i = 1; i <= totalRounds; i++) {
    rounds.push({
      roundNumber: i,
      name: `Round ${i}`
    });
  }

  const simulation = await Simulation.create({
    name,
    totalRounds,
    rounds
  });

  res.status(201).json(simulation);
};

exports.getAllSimulations = async (req, res) => {
  const sims = await Simulation.find().select("_id name");
  res.json(sims);
};

