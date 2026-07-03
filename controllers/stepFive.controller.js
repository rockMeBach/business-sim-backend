const TechnologyConfig = require("../models/TechnologyConfig");
const PlayerStepFive = require("../models/PlayerStepFive");

/* =========================================================
   CALCULATE STEP FIVE
   - cost calculated
   - multiplier shown separately
   - NO multiplier application
   ========================================================= */
exports.calculateStepFive = async (req, res) => {
  try {
    const config = await TechnologyConfig.findOne();
    if (!config) {
      return res.status(404).json({ message: "Technology config not found" });
    }

    const { customerFacing = {}, operations = {} } = req.body;

    const breakdown = {
      customerFacing: {},
      operations: {}
    };

    let totalTechnologyCost = 0;

    /* ================= KPIs ================= */
    const kpis = {
      customerFacing: {
        conversion: 0,
        basketSize: 0
      },
      operations: {
        wasteReduction: 0,
        decisionQuality: 0
      }
    };

    /* ================= CUSTOMER FACING ================= */

    if (customerFacing.mobileApp) {
      const item = config.customerFacing.mobileApp;
      breakdown.customerFacing.mobileApp = {
        cost: item.cost,
        multiplierBySegment: item.multiplierBySegment
      };
      totalTechnologyCost += item.cost;
      kpis.customerFacing.conversion += 10;
    }

    if (customerFacing.voiceOrdering) {
      const item = config.customerFacing.voiceOrdering;
      breakdown.customerFacing.voiceOrdering = {
        cost: item.cost,
        multiplierBySegment: item.multiplierBySegment
      };
      totalTechnologyCost += item.cost;
      kpis.customerFacing.conversion += 3;
    }

    if (customerFacing.websiteDevelopment) {
      const item = config.customerFacing.websiteDevelopment;
      breakdown.customerFacing.websiteDevelopment = {
        cost: item.cost,
        multiplierBySegment: item.multiplierBySegment
      };
      totalTechnologyCost += item.cost;
      kpis.customerFacing.conversion += 5;
    }

    /* ================= OPERATIONS ================= */

    if (operations.darkStoreSystem) {
      const item = config.operations.darkStoreSystem;
      breakdown.operations.darkStoreSystem = {
        cost: item.cost,
        multiplierBySegment: item.multiplierBySegment
      };
      totalTechnologyCost += item.cost;
      kpis.operations.decisionQuality += 10;
    }

    if (operations.riderApp) {
      const item = config.operations.riderApp;
      breakdown.operations.riderApp = {
        cost: item.cost,
        multiplierBySegment: item.multiplierBySegment
      };
      totalTechnologyCost += item.cost;
      kpis.operations.decisionQuality += 5;
    }

    if (operations.demandForecastingAI) {
      const item = config.operations.demandForecastingAI;
      breakdown.operations.demandForecastingAI = {
        cost: item.cost,
        multiplierBySegment: item.multiplierBySegment
      };
      totalTechnologyCost += item.cost;
      kpis.operations.wasteReduction += item.wasteReductionPercent;
    }

    if (operations.dynamicPricing) {
      const item = config.operations.dynamicPricing;
      breakdown.operations.dynamicPricing = {
        cost: item.cost,
        multiplierBySegment: item.multiplierBySegment
      };
      totalTechnologyCost += item.cost;
      kpis.customerFacing.basketSize += 10;
    }

    if (operations.supplyChainAnalytics) {
      const item = config.operations.supplyChainAnalytics;
      breakdown.operations.supplyChainAnalytics = {
        cost: item.cost,
        multiplierBySegment: item.multiplierBySegment
      };
      totalTechnologyCost += item.cost;
      kpis.operations.decisionQuality += 15;
    }

    return res.json({
      technologyBreakdown: breakdown,   // 🔥 cost & multiplier separate
      totalTechnologyCost,               // 🔥 base cost sum only
      kpis
    });

  } catch (err) {
    console.error("STEP-5 CALC ERROR:", err);
    res.status(500).json({ message: "Calculation failed" });
  }
};

/* =========================================================
   SAVE STEP FIVE
   ========================================================= */
exports.saveStepFive = async (req, res) => {
  try {
    const {
      userId,
      simulationId,
      roundNumber,
      customerFacing = {},
      operations = {}
    } = req.body;

    if (!userId || !simulationId || !roundNumber) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const config = await TechnologyConfig.findOne();
    if (!config) {
      return res.status(500).json({ message: "Technology config missing" });
    }

    /* ===== RE-CALCULATE (SAME AS calculateStepFive) ===== */
    const breakdown = {
      customerFacing: {},
      operations: {}
    };

    let totalTechnologyCost = 0;

    const kpis = {
      customerFacing: { conversion: 0, basketSize: 0 },
      operations: { wasteReduction: 0, decisionQuality: 0 }
    };

    /* -------- CUSTOMER FACING -------- */
    if (customerFacing.mobileApp) {
      const item = config.customerFacing.mobileApp;
      breakdown.customerFacing.mobileApp = {
        cost: item.cost,
        multiplierBySegment: item.multiplierBySegment
      };
      totalTechnologyCost += item.cost;
      kpis.customerFacing.conversion += 10;
    }

    if (customerFacing.voiceOrdering) {
      const item = config.customerFacing.voiceOrdering;
      breakdown.customerFacing.voiceOrdering = {
        cost: item.cost,
        multiplierBySegment: item.multiplierBySegment
      };
      totalTechnologyCost += item.cost;
      kpis.customerFacing.conversion += 3;
    }

    if (customerFacing.websiteDevelopment) {
      const item = config.customerFacing.websiteDevelopment;
      breakdown.customerFacing.websiteDevelopment = {
        cost: item.cost,
        multiplierBySegment: item.multiplierBySegment
      };
      totalTechnologyCost += item.cost;
      kpis.customerFacing.conversion += 5;
    }

    /* -------- OPERATIONS -------- */
    if (operations.darkStoreSystem) {
      const item = config.operations.darkStoreSystem;
      breakdown.operations.darkStoreSystem = {
        cost: item.cost,
        multiplierBySegment: item.multiplierBySegment
      };
      totalTechnologyCost += item.cost;
      kpis.operations.decisionQuality += 10;
    }

    if (operations.riderApp) {
      const item = config.operations.riderApp;
      breakdown.operations.riderApp = {
        cost: item.cost,
        multiplierBySegment: item.multiplierBySegment
      };
      totalTechnologyCost += item.cost;
      kpis.operations.decisionQuality += 5;
    }

    if (operations.demandForecastingAI) {
      const item = config.operations.demandForecastingAI;
      breakdown.operations.demandForecastingAI = {
        cost: item.cost,
        multiplierBySegment: item.multiplierBySegment
      };
      totalTechnologyCost += item.cost;
      kpis.operations.wasteReduction += item.wasteReductionPercent;
    }

    if (operations.dynamicPricing) {
      const item = config.operations.dynamicPricing;
      breakdown.operations.dynamicPricing = {
        cost: item.cost,
        multiplierBySegment: item.multiplierBySegment
      };
      totalTechnologyCost += item.cost;
      kpis.customerFacing.basketSize += 10;
    }

    if (operations.supplyChainAnalytics) {
      const item = config.operations.supplyChainAnalytics;
      breakdown.operations.supplyChainAnalytics = {
        cost: item.cost,
        multiplierBySegment: item.multiplierBySegment
      };
      totalTechnologyCost += item.cost;
      kpis.operations.decisionQuality += 15;
    }

    /* ===== SAVE SNAPSHOT ===== */
    const saved = await PlayerStepFive.findOneAndUpdate(
      { userId, simulationId, roundNumber },
      {
        customerFacing,
        operations,
        technologyBreakdown: breakdown,
        totalTechnologyCost,
        kpis
      },
      { upsert: true, new: true }
    );

    res.json({
      message: "STEP-5 saved successfully",
      data: saved
    });

  } catch (err) {
    console.error("STEP-5 SAVE ERROR:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};
 
