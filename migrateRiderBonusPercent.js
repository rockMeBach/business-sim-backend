/**
 * Converts PlayerStepNine.riderBonusBudget (rupees) to riderBonusPercent
 * (% of monthly payroll), and folds the resulting cost into totalMonthlyCost.
 *
 * Without this, every already-played round would come back as 0% after the
 * rename — dropping all four Cohort A players into the <5% band (0.9x) and
 * quietly rewriting their scores.
 *
 * The percentage is the stored rupee amount as a share of that round's
 * payroll (totalMonthlyCost, which held salaries only — the bonus was never
 * charged), clamped to the 0-20 range the slider now offers.
 *
 * Usage: node migrateRiderBonusPercent.js [--apply]     (dry run by default)
 */
require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const User = require("./models/User");
const Group = require("./models/Group");

const MAX_PERCENT = 20;

(async () => {
  try {
    await connectDB();
    const apply = process.argv.includes("--apply");
    const collection = mongoose.connection.db.collection("playerstepnines");

    const docs = await collection.find({}).toArray();
    console.log(`${docs.length} PlayerStepNine doc(s)${apply ? "" : "  [DRY RUN — pass --apply to write]"}\n`);

    let changed = 0;
    for (const doc of docs) {
      if (doc.riderBonusPercent != null && doc.riderBonusBudget == null) {
        console.log(`  skip ${doc._id} — already migrated`);
        continue;
      }

      const user = await User.findById(doc.userId);
      const group = user ? await Group.findById(user.groupId) : null;
      const who = `${user?.username || "?"} @ ${group?.name || "?"}`;

      const budget = doc.riderBonusBudget || 0;
      // Salaries only — the bonus was never added in, so this is clean payroll.
      const payroll = doc.totalMonthlyCost || 0;
      const rawPercent = payroll > 0 ? (budget / payroll) * 100 : 0;
      const percent = Math.min(MAX_PERCENT, Math.round(rawPercent * 100) / 100);
      const bonusCost = (payroll * percent) / 100;
      const newTotal = payroll + bonusCost;

      const clamped = rawPercent > MAX_PERCENT ? `  (clamped from ${rawPercent.toFixed(2)}%)` : "";
      console.log(
        `  ${who.padEnd(22)} ₹${budget} / ₹${payroll} payroll -> ${percent}%${clamped}` +
        `   bonusCost=₹${Math.round(bonusCost)}  totalMonthlyCost ₹${payroll} -> ₹${Math.round(newTotal)}`
      );

      if (apply) {
        await collection.updateOne(
          { _id: doc._id },
          {
            $set: { riderBonusPercent: percent, totalBonusCost: bonusCost, totalMonthlyCost: newTotal },
            $unset: { riderBonusBudget: "" }
          }
        );
      }
      changed++;
    }

    console.log(`\n${apply ? "Updated" : "Would update"} ${changed} doc(s).`);
  } catch (err) {
    console.error("ERROR:", err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
})();
