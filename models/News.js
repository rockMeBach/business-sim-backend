const mongoose = require("mongoose");

const newsSchema = new mongoose.Schema({
  title: { type: String, required: true },
  summary: String,
  content: String,
  source: String,
  readTime: Number,
  publishDate: Date,

  impactType: {
    type: String,
    enum: ["positive", "negative", "neutral"],
    default: "neutral"
  },

  tags: [
    {
      type: String,
      enum: ["negative-impact", "dark-stores", "delivery-fleet", "operations"]
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model("News", newsSchema);
