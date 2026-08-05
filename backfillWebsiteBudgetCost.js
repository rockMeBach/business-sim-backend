/**
 * Adds the website development budget into PlayerStepFive.totalTechnologyCost
 * on rounds saved before the budget was charged.
 *
 * The budget was collected on a 0-100 slider (lakhs), stored, and shown to the
 * player as part of their technology spend — but totalTechnologyCost only ever
 * summed the eight checkbox items, and the scoring engine charges exactly that
 * stored figure. So the money was never billed. Re-running the scorer alone
 * wouldn't help, because it reads the stored total.
 *
 * Detection is deliberately conservative: a document is only updated when its
 * stored total equals the sum of its own breakdown items, i.e. it demonstrably
 * predates the fix. Anything already including the budget is left alone, so
 * this is safe to run more than once.
 *
 * Usage: node backfillWebsiteBudgetCost.js [--apply]   (dry-run without --apply)
 */
require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const PlayerStepFive = require("./models/PlayerStepFive");
const User = require("./models/User");
const { websiteBudgetToRupees } = require("./utils/websiteBudget");

function breakdownSum(doc) {
  const groups = doc.technologyBreakdown || {};
  let total = 0;
  for (const group of ["customerFacing", "operations"]) {
    for (const item of Object.values(groups[group] || {})) {
      total += Number(item?.cost) || 0;
    }
  }
  return total;
}

(async () => {
  try {
    await connectDB();
    const apply = process.argv.includes("--apply");
    if (!apply) console.log("DRY RUN — pass --apply to write changes.\n");

    const docs = await PlayerStepFive.find({});
    let changed = 0, skipped = 0;

    for (const doc of docs) {
      const budget = Number(doc.websiteBudget) || 0;
      const extra = websiteBudgetToRupees(budget);
      const itemsOnly = breakdownSum(doc);
      const stored = Number(doc.totalTechnologyCost) || 0;

      if (budget === 0) { skipped++; continue; }
      if (stored !== itemsOnly) {
        // Already includes the budget (or diverges for another reason).
        console.log(`skip  ${doc.userId} round ${doc.roundNumber}: stored ${stored.toLocaleString("en-IN")} != items ${itemsOnly.toLocaleString("en-IN")} — leaving alone`);
        skipped++;
        continue;
      }

      const user = await User.findById(doc.userId).select("username");
      console.log(
        `${(user?.username || doc.userId).toString().padEnd(10)} round ${doc.roundNumber}: ` +
        `${stored.toLocaleString("en-IN")} -> ${(stored + extra).toLocaleString("en-IN")}` +
        `   (+${budget}L website budget)`
      );

      if (apply) {
        doc.totalTechnologyCost = stored + extra;
        await doc.save();
      }
      changed++;
    }

    console.log(`\n${apply ? "Updated" : "Would update"} ${changed} document(s); ${skipped} unaffected.`);
    if (changed && apply) {
      console.log("Re-run scoring (POST /api/scoring/calculate-round) so results pick this up.");
    }
  } catch (err) {
    console.error("BACKFILL FAILED:", err);
  } finally {
    await mongoose.disconnect();
  }
})();
