/**
 * Recomputes totalCost / breakdown / kpis on every saved PlayerStepEight from
 * the player's stored `marketing` selections.
 *
 * The step-eight controller used to charge nothing for checkbox channels (it
 * only read a cost off the request payload, which those channels never send)
 * and silently dropped four channels whose names didn't match the config
 * (cashbackOption, emailAndSMS, corporateTieUps, housingSociety). Both are
 * fixed now, but existing documents still hold the old figures — and the
 * scoring engine reads the STORED totalCost, so re-running the scorer alone
 * would keep using the understated numbers.
 *
 * The player's raw `marketing` selections were always saved correctly, so this
 * simply re-derives the costed fields from them. It never changes what the
 * player chose.
 *
 * Usage: node backfillMarketingCosts.js [--apply]   (dry-run without --apply)
 */
require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const MarketingConfig = require("./models/MarketingConfig");
const PlayerStepEight = require("./models/PlayerStepEight");
const User = require("./models/User");

// Mirrors CHANNELS in controllers/stepEight.controller.js.
const CHANNELS = [
  ["acquisition", "googleAds", "budget", "acquisition", "conversionBoost"],
  ["acquisition", "facebookAds", "budget", "acquisition", "conversionBoost"],
  ["acquisition", "referralProgram", null, "acquisition", "conversionBoost"],
  ["acquisition", "firstOrderDiscount", null, "acquisition", "conversionBoost"],
  ["acquisition", "influencerMarketing", null, "brandTrust", "revenueBoost"],
  ["retention", "cashbackOption", null, "retention", "retentionBoost"],
  ["retention", "loyaltyProgram", null, "retention", "retentionBoost"],
  ["retention", "pushNotifications", null, "retention", "retentionBoost"],
  ["retention", "emailAndSMS", null, "retention", "conversionBoost"],
  ["partnerships", "creditCardOffers", null, "revenue", "revenueBoost"],
  ["partnerships", "corporateTieUps", null, "revenue", "revenueBoost"],
  ["partnerships", "housingSociety", null, "revenue", "revenueBoost"]
].map(([group, key, budgetFrom, kpi, boost]) => ({ group, key, budgetFrom, kpi, boost }));

const defaultSegments = () => ({ premium: 1, standard: 1, basic: 1, discount: 1 });

function recompute(marketing, config) {
  const groups = {
    acquisition: marketing?.acquisition || {},
    retention: marketing?.retention || {},
    partnerships: marketing?.partnerships || {}
  };

  let totalCost = 0;
  const kpis = { acquisition: 0, retention: 0, revenue: 0, brandTrust: 0 };
  const breakdown = { acquisition: {}, retention: {}, partnerships: {} };

  for (const { group, key, budgetFrom, kpi, boost } of CHANNELS) {
    const selection = groups[group][key];
    if (!selection?.enabled) continue;

    const channelConfig = config.marketing?.[key] || {};
    const cost = budgetFrom
      ? Number(selection[budgetFrom] ?? channelConfig.cost ?? 0)
      : Number(channelConfig.cost ?? 0);

    totalCost += cost;
    breakdown[group][key] = {
      cost,
      multiplierBySegment: channelConfig.multiplierBySegment || defaultSegments()
    };

    const boostValue = config[group]?.[key]?.[boost] || 0;
    kpis[kpi] += budgetFrom ? (cost / 100000) * boostValue : boostValue;
  }

  return { totalCost, kpis, breakdown };
}

(async () => {
  try {
    await connectDB();
    const apply = process.argv.includes("--apply");
    if (!apply) console.log("DRY RUN — pass --apply to write changes.\n");

    const config = await MarketingConfig.findOne();
    if (!config) throw new Error("MarketingConfig not found — nothing to recompute against.");

    const docs = await PlayerStepEight.find({});
    let changed = 0;

    for (const doc of docs) {
      const result = recompute(doc.marketing, config);
      const before = doc.totalCost || 0;
      if (result.totalCost === before) continue;

      const user = await User.findById(doc.userId).select("username");
      const enabled = ["acquisition", "retention", "partnerships"]
        .flatMap((g) => Object.keys(result.breakdown[g]));

      console.log(
        `${(user?.username || doc.userId).toString().padEnd(10)} round ${doc.roundNumber}: ` +
        `${before.toLocaleString("en-IN")} -> ${result.totalCost.toLocaleString("en-IN")}` +
        `   [${enabled.join(", ") || "none enabled"}]`
      );

      if (apply) {
        doc.totalCost = result.totalCost;
        doc.kpis = result.kpis;
        doc.breakdown = result.breakdown;
        await doc.save();
      }
      changed++;
    }

    console.log(
      `\n${apply ? "Updated" : "Would update"} ${changed} of ${docs.length} step-eight document(s).`
    );
    if (changed && apply) {
      console.log("Re-run scoring (POST /api/scoring/calculate-round) so results pick this up.");
    }
  } catch (err) {
    console.error("BACKFILL FAILED:", err);
  } finally {
    await mongoose.disconnect();
  }
})();
