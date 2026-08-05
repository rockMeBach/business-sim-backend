/**
 * Seeds the config models added for the Excel-driven scoring engine.
 * Layers on top of whatever seed.py already created — additive only,
 * doesn't touch anything seed.py owns except the two fields
 * (totalInvestmentAverage shape, quality tier data) that changed shape.
 *
 * All literal values below are pulled directly from QuickCommerce_Final.xlsx,
 * sheet "Round1" (cell references noted per block).
 */
require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("./config/db");

const SourcingMultiplierConfig = require("./models/SourcingMultiplierConfig");
const SupplierReliabilityConfig = require("./models/SupplierReliabilityConfig");
const LocalCompetitionConfig = require("./models/LocalCompetitionConfig");
const HROpsMultiplierConfig = require("./models/HROpsMultiplierConfig");
const ScoringConstantsConfig = require("./models/ScoringConstantsConfig");
const PricingConfig = require("./models/PricingConfig");
const MarketingConfig = require("./models/MarketingConfig");
const TechnologyConfig = require("./models/TechnologyConfig");
const ProductCategory = require("./models/ProductCategory");

function sampleStdev(values) {
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - avg) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

(async () => {
  try {
    await connectDB();

    // Rows 38-47.
    await SourcingMultiplierConfig.findOneAndUpdate({}, {
      sustainabilityBands: [
        { minStars: 4.75, maxStars: 5.01, premiumMultiplier: 1.2, massMultiplier: 1.1 },
        { minStars: 4.25, maxStars: 4.75, premiumMultiplier: 1.1, massMultiplier: 1.1 },
        { minStars: 3.75, maxStars: 4.25, premiumMultiplier: 1.0, massMultiplier: 1.1 },
        { minStars: 3.25, maxStars: 3.75, premiumMultiplier: 0.95, massMultiplier: 1.0 },
        { minStars: 0, maxStars: 3.25, premiumMultiplier: 0.9, massMultiplier: 0.95 }
      ]
    }, { upsert: true });

    // "Supplier" sheet (separate tab), rows 8-9: star rating -> weekly
    // fulfillment-% band. Bands below 4 stars aren't given in the sheet
    // (its worked example only used 4-5 star suppliers) — extrapolated at
    // the same ~5-point-per-half-star spacing to cover seed.py's full
    // supplier roster (reliability 3-5 stars).
    await SupplierReliabilityConfig.findOneAndUpdate({}, {
      reliabilityBands: [
        { minStars: 4.75, maxStars: 5.01, fulfillmentRate: 0.975 },  // 5* -> 95-100%
        { minStars: 4.25, maxStars: 4.75, fulfillmentRate: 0.925 },  // 4.5* -> 90-95%
        { minStars: 3.75, maxStars: 4.25, fulfillmentRate: 0.875 },  // 4* -> 85-90%
        { minStars: 3.25, maxStars: 3.75, fulfillmentRate: 0.825 },  // 3.5* -> 80-85% (extrapolated)
        { minStars: 0, maxStars: 3.25, fulfillmentRate: 0.775 }      // <=3* -> 75-80% (extrapolated)
      ],
      weeksPerRound: 4, // one round = one month, matching the engine's monthly demand/costs
      rampUpFulfillmentRate: 0.55
    }, { upsert: true });

    // Rows 157-160, columns B-E (uniform across segments in the workbook).
    const uniform = (v) => ({ premium: v, standard: v, basic: v, discount: v });
    await LocalCompetitionConfig.findOneAndUpdate({}, {
      intensityLevels: {
        less: uniform(0.2),
        med: uniform(0.25),
        high: uniform(0.3),
        veryHigh: uniform(0.35)
      }
    }, { upsert: true });

    // Rows 70-73.
    await HROpsMultiplierConfig.findOneAndUpdate({}, {
      corporateTeamSize: { minSpendMultiplier: 0.95, midSpendMultiplier: 1.03, maxSpendMultiplier: 1.08 },
      educationBudgetPerRider: { rate: 0.05, divisor: 50000 },
      // Rows 72-73: bands on the chosen PERCENTAGE (0.05/0.1 thresholds from
      // C73/D73), not the resulting rupee amount — the engine back-derives
      // the percentage from the stored rupee budget before banding.
      riderBonusBudgetBands: [
        { label: "low", minPercent: 0, maxPercent: 0.05, multiplier: 0.9 },
        { label: "mid", minPercent: 0.05, maxPercent: 0.1, multiplier: 1.05 },
        { label: "high", minPercent: 0.1, maxPercent: Infinity, multiplier: 1.15 }
      ]
    }, { upsert: true });

    // Row 85 (Others = Focus 2.65 * New-Player-in-Segment 0.85 * R&D),
    // rows 106-110 (elasticity weights), row 82 (Sigmoid New params),
    // rows 91-94 (Height-Price gate bands).
    // R&D rate/divisor has no Excel reference (the worked example never
    // varied R&D investment) — seeded with a reasonable scale relative to
    // other per-option costs in this game (investing ₹500,000 -> +10%).
    await ScoringConstantsConfig.findOneAndUpdate({}, {
      focusMultiplier: 2.65,
      newPlayerInSegmentMultiplier: 0.85,
      rdInvestment: { rate: 0.1, divisor: 500000 },
      sellingPriceWeight: { premium: 0.1, standard: 0.3, basic: 0.5, discount: 0.9 },
      competitiveQualityWeight: { premium: 0.8, standard: 0.6, basic: 0.4, discount: 0.2 },
      actualQualityWeight: { premium: 0.9, standard: 0.6, basic: 0.3, discount: 0.1 },
      heightPriceWeight: { premium: 0.2, standard: 0.5, basic: 0.6, discount: 0.8 },
      heightPriceSigmoid: { m0: 3.2, k: 0.8 },
      heightPriceGateBands: {
        premium: { min: 80, max: 98 },
        standard: { min: 65, max: 85 },
        basic: { min: 40, max: 70 },
        discount: { min: 20, max: 50 }
      }
    }, { upsert: true });

    // Rows 96-103 (quality tiers 1-7, CP Mult) + D78 (base unit price) +
    // sigmoid params for the STATIC lookup table (avg/stdev over 1..7).
    // eligibleSegments mirrors columns B-E of that same table: each quality
    // level only earns SellingPrice/CompetitiveQuality/ActualQuality BASE
    // points in the segments marked there (Height-Price still applies to
    // all 4 segments regardless — see combine.js).
    const qualityTiers = new Map([
      ["1", { cpMult: 1.0, eligibleSegments: ["basic", "discount"] }],
      ["2", { cpMult: 1.2, eligibleSegments: ["basic", "discount"] }],
      ["3", { cpMult: 1.4, eligibleSegments: ["standard", "basic"] }],
      ["4", { cpMult: 1.6, eligibleSegments: ["premium", "standard"] }],
      ["5", { cpMult: 1.8, eligibleSegments: ["premium", "standard"] }],
      ["6", { cpMult: 2.0, eligibleSegments: ["premium", "standard"] }],
      ["7", { cpMult: 2.4, eligibleSegments: ["premium"] }]
    ]);
    await PricingConfig.findOneAndUpdate({}, {
      maxBaseQuality: 7,
      baseUnitPrice: 1200,
      qualityTiers,
      sigmoid: { avg: 4, stdev: sampleStdev([1, 2, 3, 4, 5, 6, 7]) }
    }, { upsert: true });

    // Rows 52-53 slider formulas + row 64 competitive-average term.
    await MarketingConfig.findOneAndUpdate({}, {
      "marketing.googleAds.sliderConfig": { rate: 0.02, divisor: 25000 },
      "marketing.facebookAds.sliderConfig": { rate: 0.02, divisor: 20000 },
      totalInvestmentAverage: {
        appliesTo: "Competitive",
        belowAverageMultiplier: 0.9,
        atOrAboveAverageMultiplier: 1
      }
    }, { upsert: true });

    // Row 31 slider formula + row 32 competitive-average term.
    await TechnologyConfig.findOneAndUpdate({}, {
      "customerFacing.websiteDevelopment.sliderConfig": { rate: 0.03, divisor: 35000 },
      totalInvestmentAverage: {
        appliesTo: "Competitive",
        belowAverageMultiplier: 0.9,
        atOrAboveAverageMultiplier: 1
      }
    }, { upsert: true });

    // Rows 3-5: per-category, per-segment base demand.
    const SEGMENT_DEMAND_BY_CATEGORY = {
      Food: { premium: 600, standard: 1250, basic: 1300, discount: 1800 },
      Mobile: { premium: 700, standard: 800, basic: 700, discount: 900 },
      Clothes: { premium: 200, standard: 500, basic: 700, discount: 1200 }
    };
    const categories = await ProductCategory.find();
    for (const category of categories) {
      const segmentDemand = SEGMENT_DEMAND_BY_CATEGORY[category.name];
      if (!segmentDemand) {
        console.warn(`No segmentDemand literal for category "${category.name}" — skipping.`);
        continue;
      }
      await ProductCategory.updateOne(
        { _id: category._id },
        { segmentDemand, localCompetitionIntensity: "med" }
      );
    }

    console.log("Scoring engine config seed complete.");
  } catch (err) {
    console.error("SEED FAILED:", err);
  } finally {
    await mongoose.disconnect();
  }
})();
