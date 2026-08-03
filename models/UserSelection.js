const mongoose = require("mongoose");

const selectionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  simulationId: { type: mongoose.Schema.Types.ObjectId, ref: "Simulation", required: true },
  roundNumber: { type: Number, required: true },
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: "SourcingSupplier", required: true }
}, { timestamps: true });

module.exports= mongoose.model("UserSelection", selectionSchema);
