const BusinessModelOption = require("../models/BusinessModelOption");
const MarketPositionOption = require("../models/MarketPositionOption");

exports.addBusinessModel = async (req, res) => {
  const option = await BusinessModelOption.create(req.body);
  res.status(201).json(option);
};

exports.addMarketPosition = async (req, res) => {
  const option = await MarketPositionOption.create(req.body);
  res.status(201).json(option);
};
