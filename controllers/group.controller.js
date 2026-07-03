const Group = require("../models/Group");

exports.createGroup = async (req, res) => {
  const { name, simulationId } = req.body;
  const group = await Group.create({ name, simulationId });
  res.json(group);
};

exports.getGroupsBySimulation = async (req, res) => {
  const { simulationId } = req.params;
  const groups = await Group.find({ simulationId }).select("_id name");
  res.json(groups);
};
