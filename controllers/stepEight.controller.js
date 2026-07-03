const MarketingConfig = require("../models/MarketingConfig");
const PlayerStepEight = require("../models/PlayerStepEight");

/* ================= PURE CALCULATION ================= */
async function calculateMarketing(marketing) {
  const config = await MarketingConfig.findOne();
  if (!config) throw new Error("Config not found");

  const { acquisition = {}, retention = {}, partnerships = {} } = marketing;

  let totalCost = 0;

  const kpis = {
    acquisition: 0,
    retention: 0,
    revenue: 0,
    brandTrust: 0
  };

  // 🔥 cost + segment multipliers (DISPLAY ONLY)
  const breakdown = {
    acquisition: {},
    retention: {},
    partnerships: {}
  };

  /* ================= ACQUISITION ================= */

  if (acquisition.googleAds?.enabled) {
    const cost = Number(acquisition.googleAds.budget || 0);
    totalCost += cost;

    breakdown.acquisition.googleAds = {
      cost,
      multiplierBySegment:
        config.marketing?.googleAds?.multiplierBySegment || defaultSegments()
    };

    kpis.acquisition +=
      (cost / 100000) *
      (config.acquisition?.googleAds?.conversionBoost || 0);
  }

  if (acquisition.facebookAds?.enabled) {
    const cost = Number(acquisition.facebookAds.budget || 0);
    totalCost += cost;

    breakdown.acquisition.facebookAds = {
      cost,
      multiplierBySegment:
        config.marketing?.facebookAds?.multiplierBySegment || defaultSegments()
    };

    kpis.acquisition +=
      (cost / 100000) *
      (config.acquisition?.facebookAds?.conversionBoost || 0);
  }

  if (acquisition.referralProgram?.enabled) {
    const cost = Number(acquisition.referralProgram.costPerUser || 0);
    totalCost += cost;

    breakdown.acquisition.referralProgram = {
      cost,
      multiplierBySegment:
        config.marketing?.referralProgram?.multiplierBySegment || defaultSegments()
    };

    kpis.acquisition +=
      config.acquisition?.referralProgram?.conversionBoost || 0;
  }

  if (acquisition.firstOrderDiscount?.enabled) {
    breakdown.acquisition.firstOrderDiscount = {
      cost: 0,
      multiplierBySegment:
        config.marketing?.firstOrderDiscount?.multiplierBySegment || defaultSegments()
    };

    kpis.acquisition +=
      config.acquisition?.firstOrderDiscount?.conversionBoost || 0;
  }

  if (acquisition.influencerMarketing?.enabled) {
    const cost = Number(acquisition.influencerMarketing.budget || 0);
    totalCost += cost;

    breakdown.acquisition.influencerMarketing = {
      cost,
      multiplierBySegment:
        config.marketing?.influencerMarketing?.multiplierBySegment || defaultSegments()
    };

    kpis.brandTrust +=
      config.acquisition?.influencerMarketing?.revenueBoost || 0;
  }

  /* ================= RETENTION ================= */

  if (retention.cashbackCoupons?.enabled) {
    const cost = Number(retention.cashbackCoupons.cost || 0);
    totalCost += cost;

    breakdown.retention.cashbackCoupons = {
      cost,
      multiplierBySegment:
        config.marketing?.cashbackOption?.multiplierBySegment || defaultSegments()
    };

    kpis.retention +=
      config.retention?.cashbackCoupons?.retentionBoost || 0;
  }

  if (retention.loyaltyProgram?.enabled) {
    const cost = Number(retention.loyaltyProgram.cost || 0);
    totalCost += cost;

    breakdown.retention.loyaltyProgram = {
      cost,
      multiplierBySegment:
        config.marketing?.loyaltyProgram?.multiplierBySegment || defaultSegments()
    };

    kpis.retention +=
      config.retention?.loyaltyProgram?.retentionBoost || 0;
  }

  if (retention.pushNotifications?.enabled) {
    const cost = Number(retention.pushNotifications.cost || 0);
    totalCost += cost;

    breakdown.retention.pushNotifications = {
      cost,
      multiplierBySegment:
        config.marketing?.pushNotifications?.multiplierBySegment || defaultSegments()
    };

    kpis.retention +=
      config.retention?.pushNotifications?.retentionBoost || 0;
  }

  if (retention.emailSms?.enabled) {
    const cost = Number(retention.emailSms.budget || 0);
    totalCost += cost;

    breakdown.retention.emailSms = {
      cost,
      multiplierBySegment:
        config.marketing?.emailAndSMS?.multiplierBySegment || defaultSegments()
    };

    kpis.retention +=
      config.retention?.emailSms?.conversionBoost || 0;
  }

  /* ================= PARTNERSHIPS ================= */

  if (partnerships.creditCardOffers?.enabled) {
    breakdown.partnerships.creditCardOffers = {
      cost: 0,
      multiplierBySegment:
        config.marketing?.creditCardOffers?.multiplierBySegment || defaultSegments()
    };

    kpis.revenue +=
      config.partnerships?.creditCardOffers?.revenueBoost || 0;
  }

  if (partnerships.corporateTieups?.enabled) {
    breakdown.partnerships.corporateTieups = {
      cost: 0,
      multiplierBySegment:
        config.marketing?.corporateTieUps?.multiplierBySegment || defaultSegments()
    };

    kpis.revenue +=
      config.partnerships?.corporateTieups?.revenueBoost || 0;
  }

  if (partnerships.housingComplexes?.enabled) {
    const cost = Number(partnerships.housingComplexes.cost || 0);
    totalCost += cost;

    breakdown.partnerships.housingComplexes = {
      cost,
      multiplierBySegment:
        config.marketing?.housingSociety?.multiplierBySegment || defaultSegments()
    };

    kpis.revenue +=
      config.partnerships?.housingComplexes?.revenueBoost || 0;
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
    breakdown: result.breakdown   // 🔥 ADD THIS
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
