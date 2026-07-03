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
  multiplier: Number,
  multiplierBySegment: segmentMultiplierSchema
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
    multiplier: Number,
    cost: Number
  }

}, { timestamps: true });

module.exports = mongoose.model("MarketingConfig", marketingConfigSchema);
