const OperationsStaffingConfig = require("../models/OperationsStaffingConfig");
const PlayerStepNine = require("../models/PlayerStepNine");


async function calculateOperationsImpact(payload) {
  const config = await OperationsStaffingConfig.findOne();
  if (!config) throw new Error("Operations staffing config not found");

  let totalCost = 0;
  const kpis = {
    quality: 0,
    speed: 0,
    coverage: 0,
    scalability: 0,
    customerSatisfaction: 0
  };

  const calculateGroup = (groupConfig, groupData, kpiKey) => {
    if (!groupData) return;

    Object.entries(groupData).forEach(([role, count]) => {
      const roleCfg = groupConfig[role];
      if (!roleCfg) return;

      const salary =
        (roleCfg.salary.min + roleCfg.salary.max) / 2;

      totalCost += count * salary;
      kpis[kpiKey] += count * (roleCfg.boost || 0);
    });
  };
  calculateGroup(
    config.darkStoreStaff,
    payload.darkStoreStaff,
    "quality"
  );
  calculateGroup(
    config.deliveryStaff,
    payload.deliveryStaff,
    "coverage"
  );
  calculateGroup(
    config.corporateTeam,
    payload.corporateTeam,
    "scalability"
  );

  // Bonus is a percentage of payroll picked on the HR screen, which computes
  // the rupee figure against the real per-employee salaries it has loaded
  // (this controller only sees headcount buckets and config salary bands, so
  // it can't reproduce that number). Charge what was sent; fall back to
  // applying the percentage to the salary total above when it wasn't.
  const bonusPercent = payload.riderBonusPercent || 0;
  const bonusCost = typeof payload.totalBonusCost === "number"
    ? payload.totalBonusCost
    : (totalCost * bonusPercent) / 100;
  totalCost += bonusCost;

  kpis.speed = Math.floor(kpis.coverage * 0.5);
  kpis.customerSatisfaction = Math.floor(
    kpis.quality * 0.4 + kpis.speed * 0.3
  );

  if (Number.isNaN(totalCost)) {
    throw new Error("Calculation failed: totalCost is NaN");
  }

  return { totalCost, kpis };
}


exports.getOperationsConfig = async (req, res) => {
  const config = await OperationsStaffingConfig.findOne();
  if (!config) {
    return res.status(404).json({ message: "Config not found" });
  }
  res.json(config);
};

exports.calculateStepNine = async (req, res) => {
  try {
    const result = await calculateOperationsImpact(req.body);
    res.json(result);
  } catch (err) {
    console.error("STEP-9 CALC ERROR:", err.message);
    res.status(400).json({ message: err.message });
  }
};

exports.saveStepNine = async (req, res) => {
  try {
    const { userId, simulationId, roundNumber } = req.body;

    const result = await calculateOperationsImpact(req.body);

    const saved = await PlayerStepNine.findOneAndUpdate(
      { userId, simulationId, roundNumber },
      {
        ...req.body,
        totalMonthlyCost: result.totalCost,
        kpis: result.kpis
      },
      { upsert: true, new: true }
    );

    res.json({
      message: "STEP-9 saved successfully",
      data: saved
    });
  } catch (err) {
    console.error("STEP-9 SAVE ERROR:", err.message);
    res.status(400).json({ message: err.message });
  }
};
