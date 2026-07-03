const mongoose = require("mongoose");

const featureSchema = new mongoose.Schema({
  key: { type: String, unique: true },
  name: String,
  cost: Number,
  benefit: String,
  dependsOn: [String]
});

module.exports=mongoose.model("Feature", featureSchema);

