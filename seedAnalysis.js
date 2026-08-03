/**
 * Seeds the Analysis-page reporting collections. Same gap as Results: the
 * Analysis tab reads these two collections but nothing in the app ever
 * writes to them, so every category/segment 404s.
 *
 * Confusing naming inherited from the existing model files - not renamed
 * here to avoid touching unrelated code:
 *   models/CategoryAnalysis.js  -> mongoose model "ProductCategoryAnalysis"
 *                                  (collection productcategoryanalyses, keyed by category ObjectId)
 *   models/Useranalysis.js      -> mongoose model "CategoryAnalysis"
 *                                  (collection categoryanalyses, keyed by categoryName string)
 *
 * Builds plausible per-category, per-segment numbers from each
 * ProductCategory's own pricingTiers/baseCost/localCompetitionIntensity so
 * categories don't all look identical. Upserts by key, safe to re-run.
 */
require("dotenv").config();
const connectDB = require("./config/db");

const ProductCategory = require("./models/ProductCategory");
const ProductCategoryAnalysis = require("./models/CategoryAnalysis");
const CategoryAnalysis = require("./models/Useranalysis");

const TIERS = ["premium", "standard", "basic", "discount"];

const CAPTURE_RATE = { premium: 0.58, standard: 0.68, basic: 0.72, discount: 0.78 };
const PRICE_MULTIPLIER = { premium: 2.2, standard: 1.6, basic: 1.25, discount: 0.95 };
const QUALITY = { premium: 92, standard: 78, basic: 60, discount: 42 };
const LOCAL_COMPETITION = { less: 0.9, med: 1.0, high: 1.1, veryHigh: 1.2 };
const COMPETITOR_NAMES = ["Team Alpha", "Team Beta", "Team Gamma"];

function buildSegmentStats(category) {
  const stats = {};
  for (const tier of TIERS) {
    const totalDemand = category.pricingTiers?.[tier] || 0;
    const yourSales = Math.round(totalDemand * CAPTURE_RATE[tier]);
    const share = totalDemand ? +((yourSales / totalDemand) * 100).toFixed(1) : 0;
    const price = Math.round((category.baseCost || 0) * PRICE_MULTIPLIER[tier]);
    stats[tier] = { totalDemand, yourSales, share, price, quality: QUALITY[tier] };
  }
  return stats;
}

function buildProductCategoryAnalysis(category, stats) {
  const segments = TIERS.map((tier) => ({
    name: tier,
    share: stats[tier].share,
    yourSales: stats[tier].yourSales,
    totalDemand: stats[tier].totalDemand,
  }));

  const positioning = TIERS.map((tier) => ({
    segment: tier,
    price: stats[tier].price,
    quality: stats[tier].quality,
    bubbleSize: stats[tier].totalDemand,
  }));

  const avgMarketShare = +(TIERS.reduce((sum, t) => sum + stats[t].share, 0) / TIERS.length).toFixed(1);
  const avgMultiplier = +(TIERS.reduce((sum, t) => sum + PRICE_MULTIPLIER[t], 0) / TIERS.length).toFixed(2);
  const totalSales = TIERS.reduce((sum, t) => sum + stats[t].yourSales, 0);
  const totalScore = Math.round(avgMarketShare * 10 + avgMultiplier * 20);

  return {
    category: category._id,
    kpis: { totalScore, avgMultiplier, avgMarketShare, totalSales },
    segments,
    positioning,
  };
}

function buildTierAnalysis(category, tier, stats) {
  const s = stats[tier];
  const priceMultiplier = PRICE_MULTIPLIER[tier];
  const localCompetition = LOCAL_COMPETITION[category.localCompetitionIntensity] || 1.0;

  const breakdown = [
    { multiplier: +priceMultiplier.toFixed(2), keyIndicator: "Pricing Competitiveness", achievedPoints: Math.round(s.share * 0.6), totalScore: Math.round(s.share * 0.6 * priceMultiplier) },
    { multiplier: 1.08, keyIndicator: "Marketing Reach", achievedPoints: Math.round(s.quality * 0.5), totalScore: Math.round(s.quality * 0.5 * 1.08) },
    { multiplier: 1.05, keyIndicator: "Delivery Speed", achievedPoints: Math.round(s.share * 0.4), totalScore: Math.round(s.share * 0.4 * 1.05) },
    { multiplier: 1.1, keyIndicator: "Product Quality", achievedPoints: Math.round(s.quality * 0.6), totalScore: Math.round(s.quality * 0.6 * 1.1) },
  ];

  const coreScore = +((s.share * 3 + s.quality) / 2).toFixed(1);
  const multiplierOnCoreScore = +(priceMultiplier / 1.5).toFixed(2);
  const totalScore = Math.round(coreScore * multiplierOnCoreScore);

  const multipliers = [
    { title: "Technology Investment", description: "Boost from mobile app / tech stack adoption", value: 1.05 },
    { title: "Marketing Spend", description: "Impact of ad spend on demand capture", value: 1.08 },
    { title: "Sourcing Quality", description: "Supplier sustainability rating multiplier", value: 0.98 },
  ];

  const competitors = COMPETITOR_NAMES.map((name, i) => ({
    name,
    score: Math.round(totalScore * (0.85 + i * 0.1)),
  }));

  const directDemand = Math.round(s.totalDemand * 0.8);
  const substituteDemand = s.totalDemand - directDemand;

  return {
    coreScore,
    breakdown,
    multiplierOnCoreScore,
    multipliers,
    totalScore,
    competitors,
    localCompetition,
    market: {
      marketShare: s.share,
      totalMarketSize: s.totalDemand,
      yourSales: s.yourSales,
      directDemand,
      substituteDemand,
    },
  };
}

(async () => {
  try {
    await connectDB();

    const categories = await ProductCategory.find({});
    if (!categories.length) {
      console.log("No ProductCategory documents found — run seed.py first.");
      process.exit(0);
    }

    for (const category of categories) {
      const stats = buildSegmentStats(category);

      await ProductCategoryAnalysis.findOneAndUpdate(
        { category: category._id },
        buildProductCategoryAnalysis(category, stats),
        { upsert: true, new: true }
      );

      const tiers = {};
      for (const tier of TIERS) tiers[tier] = buildTierAnalysis(category, tier, stats);

      await CategoryAnalysis.findOneAndUpdate(
        { categoryName: category.name },
        { categoryName: category.name, tiers },
        { upsert: true, new: true }
      );
    }

    console.log("Analysis data seeded for categories:", categories.map((c) => c.name).join(", "));
    process.exit(0);
  } catch (err) {
    console.error("Failed to seed analysis data:", err);
    process.exit(1);
  }
})();
