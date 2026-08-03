const mongoose = require("mongoose");

const segmentMultiplierSchema = {
  premium: { type: Number, default: 1 },
  standard: { type: Number, default: 1 },
  basic: { type: Number, default: 1 },
  discount: { type: Number, default: 1 }
};

const marketingItemSchema = {
  appliesTo: String,
  cost: Number,
  multiplier: Number,           // legacy/flat field — NOT read by the scoring engine, kept for existing readers
  multiplierBySegment: segmentMultiplierSchema,
  // Only populated for slider-style items (googleAds, facebookAds): the
  // engine computes 1 + (spend * rate / divisor). Absent for flat items,
  // which instead use IF(cost>0, multiplierBySegment[seg], 1).
  sliderConfig: {
    rate: Number,
    divisor: Number
  }
};

const marketingConfigSchema = new mongoose.Schema({

  acquisition: Object,
  retention: Object,
  partnerships: Object,

  marketing: {
    googleAds: marketingItemSchema,
    facebookAds: marketingItemSchema,
    referralProgram: marketingItemSchema,
    firstOrderDiscount: marketingItemSchema,
    influencerMarketing: marketingItemSchema,
    cashbackOption: marketingItemSchema,
    loyaltyProgram: marketingItemSchema,
    pushNotifications: marketingItemSchema,
    emailAndSMS: marketingItemSchema,
    creditCardOffers: marketingItemSchema,
    corporateTieUps: marketingItemSchema,
    housingSociety: marketingItemSchema
  },

  totalInvestmentAverage: {
    appliesTo: String,
    belowAverageMultiplier: Number,        // e.g. 0.9
    atOrAboveAverageMultiplier: Number      // e.g. 1
  }

}, { timestamps: true });

module.exports = mongoose.model("MarketingConfig", marketingConfigSchema);
