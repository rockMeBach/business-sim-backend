const MarketingConfig = require("../models/MarketingConfig");
const PlayerStepEight = require("../models/PlayerStepEight");

/**
 * Every marketing channel, keyed by the SAME name the config and the frontend
 * use. This replaced a hand-written if-block per channel, which had drifted
 * into two bugs:
 *
 *   1. Four blocks tested names that exist nowhere else — cashbackCoupons,
 *      emailSms, corporateTieups, housingComplexes — while the config and the
 *      client send cashbackOption, emailAndSMS, corporateTieUps and
 *      housingSociety. Those four channels could never match, so enabling them
 *      recorded no cost and no breakdown entry at all.
 *   2. Cost was only ever read off the request payload (.budget/.cost/
 *      .costPerUser). Checkbox channels carry no such field, so they resolved
 *      to Number(undefined || 0) === 0, and firstOrderDiscount /
 *      creditCardOffers were hardcoded to 0 outright — silently zeroing real
 *      six-figure spend.
 *
 * `budgetFrom` marks the slider channels, where the player picks the spend;
 * everything else is charged its flat config cost.
 */
const CHANNELS = [
  // group          key                    budgetFrom   kpi            boost
  ["acquisition",  "googleAds",           "budget",    "acquisition", "conversionBoost"],
  ["acquisition",  "facebookAds",         "budget",    "acquisition", "conversionBoost"],
  ["acquisition",  "referralProgram",     null,        "acquisition", "conversionBoost"],
  ["acquisition",  "firstOrderDiscount",  null,        "acquisition", "conversionBoost"],
  ["acquisition",  "influencerMarketing", null,        "brandTrust",  "revenueBoost"],
  ["retention",    "cashbackOption",      null,        "retention",   "retentionBoost"],
  ["retention",    "loyaltyProgram",      null,        "retention",   "retentionBoost"],
  ["retention",    "pushNotifications",   null,        "retention",   "retentionBoost"],
  ["retention",    "emailAndSMS",         null,        "retention",   "conversionBoost"],
  ["partnerships", "creditCardOffers",    null,        "revenue",     "revenueBoost"],
  ["partnerships", "corporateTieUps",     null,        "revenue",     "revenueBoost"],
  ["partnerships", "housingSociety",      null,        "revenue",     "revenueBoost"]
].map(([group, key, budgetFrom, kpi, boost]) => ({ group, key, budgetFrom, kpi, boost }));

/* ================= PURE CALCULATION ================= */
async function calculateMarketing(marketing) {
  const config = await MarketingConfig.findOne();
  if (!config) throw new Error("Config not found");

  const groups = {
    acquisition: marketing.acquisition || {},
    retention: marketing.retention || {},
    partnerships: marketing.partnerships || {}
  };

  let totalCost = 0;

  const kpis = {
    acquisition: 0,
    retention: 0,
    revenue: 0,
    brandTrust: 0
  };

  // Cost + segment multipliers, surfaced for display.
  const breakdown = {
    acquisition: {},
    retention: {},
    partnerships: {}
  };

  for (const { group, key, budgetFrom, kpi, boost } of CHANNELS) {
    const selection = groups[group][key];
    if (!selection?.enabled) continue;

    const channelConfig = config.marketing?.[key] || {};

    // Slider channels are charged what the player set; the rest are charged
    // the config's flat cost for that channel.
    const cost = budgetFrom
      ? Number(selection[budgetFrom] ?? channelConfig.cost ?? 0)
      : Number(channelConfig.cost ?? 0);

    totalCost += cost;

    breakdown[group][key] = {
      cost,
      multiplierBySegment: channelConfig.multiplierBySegment || defaultSegments()
    };

    const boostValue = config[group]?.[key]?.[boost] || 0;
    // Paid-ad reach scales with spend (per ₹1 lakh); flat channels contribute
    // their boost once.
    kpis[kpi] += budgetFrom ? (cost / 100000) * boostValue : boostValue;
  }

  return { totalCost, kpis, breakdown };
}

/* ================= CALCULATE API ================= */
exports.calculateStepEight = async (req, res) => {
  try {
    const result = await calculateMarketing(req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

/* ================= SAVE API ================= */
exports.saveStepEight = async (req, res) => {
  try {
    const { userId, simulationId, roundNumber, ...marketing } = req.body;

    const result = await calculateMarketing(marketing);

    const saved = await PlayerStepEight.findOneAndUpdate(
      { userId, simulationId, roundNumber },
      {
        marketing,
        totalCost: result.totalCost,
        kpis: result.kpis,
        breakdown: result.breakdown
      },
      { upsert: true, new: true }
    );

    res.json({
      message: "STEP-8 saved successfully",
      data: saved
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

/* ================= HELPERS ================= */
function defaultSegments() {
  return {
    premium: 1,
    standard: 1,
    basic: 1,
    discount: 1
  };
}
