/**
 * The website development budget is entered on a 0-100 slider denominated in
 * LAKHS — the control labels its ends "₹0 L" and "₹100 L" — so one slider unit
 * is ₹1,00,000.
 *
 * Kept in one place because three call sites need to agree on it, and they
 * previously didn't: the step-five controller excluded the budget from
 * totalTechnologyCost entirely, the scoring engine read a boolean field and so
 * never applied its multiplier, and the client added its own conversion purely
 * for display. Players were shown a spend they were never charged and which
 * bought them nothing.
 */
const WEBSITE_BUDGET_UNIT = 100000;

/** Slider value (lakhs) -> rupees. */
function websiteBudgetToRupees(budgetInLakhs) {
  return (Number(budgetInLakhs) || 0) * WEBSITE_BUDGET_UNIT;
}

module.exports = { WEBSITE_BUDGET_UNIT, websiteBudgetToRupees };
