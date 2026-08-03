const mongoose = require("mongoose");

// Excel rows 157-160, columns B-E: per-segment percentage applied when
// combining a player's Final Multiplier into their "Local" score, based on
// how intense local competition is for that category (Less/Med/High/VeryHigh).
const segmentPercentSchema = {
  premium: { type: Number, required: true },
  standard: { type: Number, required: true },
  basic: { type: Number, required: true },
  discount: { type: Number, required: true }
};

const localCompetitionConfigSchema = new mongoose.Schema({
  intensityLevels: {
    less: segmentPercentSchema,
    med: segmentPercentSchema,
    high: segmentPercentSchema,
    veryHigh: segmentPercentSchema
  }
}, { timestamps: true });

module.exports = mongoose.model("LocalCompetitionConfig", localCompetitionConfigSchema);
