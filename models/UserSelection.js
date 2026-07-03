const mongoose = require("mongoose");

const selectionSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier" }
}, { timestamps: true });

module.exports= mongoose.model("UserSelection", selectionSchema);
