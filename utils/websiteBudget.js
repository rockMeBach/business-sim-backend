/**
 * The website development budget is entered on a slider whose every notch adds
 * ₹35,000 of spend.
 *
 * Kept in one place because three call sites need to agree on it, and they
 * previously didn't: the step-five controller excluded the budget from
 * totalTechnologyCost entirely, the scoring engine read a boolean field and so
 * never applied its multiplier, and the client added its own conversion purely
 * for display. Players were shown a spend they were never charged and which
 * bought them nothing.
 */
const WEBSITE_BUDGET_UNIT = 35000;

/** Slider value (notches) -> rupees. */
function websiteBudgetToRupees(budgetUnits) {
  return (Number(budgetUnits) || 0) * WEBSITE_BUDGET_UNIT;
}

module.exports = { WEBSITE_BUDGET_UNIT, websiteBudgetToRupees };
