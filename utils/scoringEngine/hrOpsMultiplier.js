const { forEachSegment } = require("./segments");

/**
 * Sums this player's corporate-team headcount * average role salary,
 * mirroring controllers/stepNine.controller.js's calculateGroup() logic —
 * used both as the HR step's cost input and for the group-relative
 * "Corporate Team Size" min/max comparison (Excel row 70).
 */
function computeCorporateTeamSpend(operationsStaffingConfig, stepNineDoc) {
  const corporateTeam = stepNineDoc?.corporateTeam;
  const roleConfigs = operationsStaffingConfig?.corporateTeam;
  if (!corporateTeam || !roleConfigs) return 0;

  let spend = 0;
  for (const [role, count] of Object.entries(corporateTeam)) {
    const roleCfg = roleConfigs[role];
    if (!roleCfg || typeof count !== "number") continue;
    const avgSalary = (roleCfg.salary.min + roleCfg.salary.max) / 2;
    spend += count * avgSalary;
  }
  return spend;
}

/**
 * HR/Ops step multiplier (Excel Step 6, row 68 PRODUCT(V70:V72)). Applied
 * uniformly across all 4 segments — the workbook doesn't split HR by
 * segment. Tolerates a missing PlayerStepNine doc (neutral 1.0) — this is
 * the expected state until every player in a group has submitted Step 9.
 *
 * @param groupMinMaxCorporateSpend {{min: number, max: number}} across the
 *   whole group for this round (computed once by the orchestrator).
 */
function computeHROpsStepMultiplier(hrOpsConfig, operationsStaffingConfig, stepNineDoc, groupMinMaxCorporateSpend) {
  if (!hrOpsConfig || !stepNineDoc) {
    return forEachSegment(() => 1);
  }

  const corporateSpend = computeCorporateTeamSpend(operationsStaffingConfig, stepNineDoc);
  const { min, max } = groupMinMaxCorporateSpend || { min: corporateSpend, max: corporateSpend };
  const { minSpendMultiplier, midSpendMultiplier, maxSpendMultiplier } = hrOpsConfig.corporateTeamSize || {};

  let corporateTeamMultiplier = midSpendMultiplier ?? 1;
  if (corporateSpend === min) corporateTeamMultiplier = minSpendMultiplier ?? corporateTeamMultiplier;
  else if (corporateSpend === max) corporateTeamMultiplier = maxSpendMultiplier ?? corporateTeamMultiplier;

  const { rate, divisor } = hrOpsConfig.educationBudgetPerRider || {};
  const educationSpend = stepNineDoc.educationBudgetPerRider || 0;
  const educationMultiplier = divisor ? 1 + (educationSpend * rate) / divisor : 1;

  // The player now picks this percentage directly (Step 6 "Bonus per
  // Employee"), so it's read as-is. It used to be stored in rupees and
  // divided back out by ridersPerCity * riderCostPerMonth, which silently
  // banded everyone at 0% whenever those two didn't match the payroll the
  // rupee figure was actually based on. Stored as 0-20; bands are 0-1.
  const riderBonusPercent = (stepNineDoc.riderBonusPercent || 0) / 100;
  // Mirrors Excel row 72's nested IF exactly: IF(x < low.maxPercent, low,
  // IF(x > high.minPercent, high, mid)) — an exact boundary value (e.g.
  // 0.05) must fall into the middle band, not the low one a plain
  // min<=x<=max Array.find() would match first since low/mid overlap there.
  const bands = [...(hrOpsConfig.riderBonusBudgetBands || [])].sort((a, b) => a.minPercent - b.minPercent);
  const [lowBand, midBand, highBand] = bands;
  let riderBonusMultiplier = midBand?.multiplier ?? 1;
  if (lowBand && riderBonusPercent < lowBand.maxPercent) riderBonusMultiplier = lowBand.multiplier;
  else if (highBand && riderBonusPercent > highBand.minPercent) riderBonusMultiplier = highBand.multiplier;

  const total = corporateTeamMultiplier * educationMultiplier * riderBonusMultiplier;
  return forEachSegment(() => total);
}

module.exports = { computeCorporateTeamSpend, computeHROpsStepMultiplier };
