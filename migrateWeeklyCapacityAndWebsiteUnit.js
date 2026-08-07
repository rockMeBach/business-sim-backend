/**
 * Two redefinitions applied to already-played rounds:
 *
 * 1. Warehouse capacity is now WEEKLY, not monthly. Stored figures were
 *    entered as a monthly total, so they're divided by weeksPerRound to keep
 *    the throughput each player actually intended. Left as-is they would
 *    silently quadruple every warehouse.
 *
 * 2. One website-budget notch is now ₹35,000 instead of ₹1,00,000. The notch
 *    count the player chose stands; only the price per notch changes, so
 *    totalTechnologyCost is repriced. Only documents whose stored total still
 *    equals items + budget x OLD_UNIT are touched, so this is safe to re-run.
 *
 * Usage: node migrateWeeklyCapacityAndWebsiteUnit.js [--apply]   (dry run by default)
 */
require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const PlayerProductCategory = require("./models/PlayerProductCategory");
const PlayerStepFive = require("./models/PlayerStepFive");
const SupplierReliabilityConfig = require("./models/SupplierReliabilityConfig");
const User = require("./models/User");
const { WEBSITE_BUDGET_UNIT } = require("./utils/websiteBudget");

const OLD_WEBSITE_UNIT = 100000;

function breakdownSum(doc) {
  const groups = doc.technologyBreakdown || {};
  let total = 0;
  for (const group of ["customerFacing", "operations"]) {
    for (const item of Object.values(groups[group] || {})) total += Number(item?.cost) || 0;
  }
  return total;
}

const nameOf = async (userId) =>
  (await User.findById(userId).select("username"))?.username || String(userId);

(async () => {
  try {
    await connectDB();
    const apply = process.argv.includes("--apply");
    if (!apply) console.log("DRY RUN — pass --apply to write changes.\n");

    const weeksPerRound = (await SupplierReliabilityConfig.findOne())?.weeksPerRound || 4;

    console.log(`--- Warehouse capacity: monthly -> weekly (/${weeksPerRound}) ---`);
    let capacityChanged = 0;
    for (const doc of await PlayerProductCategory.find({})) {
      const monthly = Number(doc.warehouseCapacity);
      if (!Number.isFinite(monthly) || monthly <= 0) continue;

      const weekly = Math.round(monthly / weeksPerRound);
      console.log(`  ${(await nameOf(doc.userId)).padEnd(10)} round ${doc.roundNumber}: ${monthly}/month -> ${weekly}/week`);

      if (apply) {
        doc.warehouseCapacity = weekly;
        await doc.save();
      }
      capacityChanged++;
    }

    console.log(`\n--- Website budget: ₹${OLD_WEBSITE_UNIT} -> ₹${WEBSITE_BUDGET_UNIT} per notch ---`);
    let websiteChanged = 0;
    for (const doc of await PlayerStepFive.find({})) {
      const budget = Number(doc.websiteBudget) || 0;
      if (budget === 0) continue;

      const itemsOnly = breakdownSum(doc);
      const stored = Number(doc.totalTechnologyCost) || 0;
      const expectedOld = itemsOnly + budget * OLD_WEBSITE_UNIT;

      if (Math.round(stored) !== Math.round(expectedOld)) {
        console.log(`  skip ${await nameOf(doc.userId)} round ${doc.roundNumber}: stored ₹${stored} != items+old ₹${expectedOld} — already repriced or diverged`);
        continue;
      }

      const repriced = itemsOnly + budget * WEBSITE_BUDGET_UNIT;
      console.log(`  ${(await nameOf(doc.userId)).padEnd(10)} round ${doc.roundNumber}: ${budget} notch(es)  ₹${stored.toLocaleString("en-IN")} -> ₹${repriced.toLocaleString("en-IN")}`);

      if (apply) {
        doc.totalTechnologyCost = repriced;
        await doc.save();
      }
      websiteChanged++;
    }

    console.log(`\n${apply ? "Updated" : "Would update"} ${capacityChanged} capacity doc(s), ${websiteChanged} technology doc(s).`);
    if (apply) console.log("Re-run scoring so results pick this up.");
  } catch (err) {
    console.error("ERROR:", err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
