/**
 * Recomputes PlayerStepFour.totalMonthlyCost so it no longer contains the
 * third-party delivery charge.
 *
 * Step 4 used to bill third-party delivery on (whole market's monthly demand −
 * own fleet capacity), which is the same number for every player regardless of
 * how much they actually sold — a flat ~₹2.7L tax dressed up as a variable
 * cost. The scoring engine now raises that bill itself, from units genuinely
 * shipped beyond the own fleet each week
 * (utils/scoringEngine/weeklyFulfillment.js), so leaving the old figure in the
 * stored total would charge it twice.
 *
 * Costs are re-derived by re-running the delivery calculator over each
 * document's own saved inputs, so this reflects the real formula rather than
 * subtracting a guess.
 *
 * Usage: node migrateStepFourThirdParty.js [--apply]   (dry run by default)
 */
require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const PlayerStepFour = require("./models/PlayerStepFour");
const DeliveryConfig = require("./models/DeliveryConfig");
const ProductCategory = require("./models/ProductCategory");
const User = require("./models/User");
const { calculateDeliveryImpact } = require("./utils/deliveryImpactCalculator");

(async () => {
  try {
    await connectDB();
    const apply = process.argv.includes("--apply");
    if (!apply) console.log("DRY RUN — pass --apply to write changes.\n");

    const config = await DeliveryConfig.findOne();
    const categories = await ProductCategory.find({ isActive: true }, "baseMonthlyDemand");
    const estimatedMonthlyDemand = categories.reduce((sum, c) => sum + (c.baseMonthlyDemand || 0), 0);

    let changed = 0;
    for (const doc of await PlayerStepFour.find({})) {
      const result = calculateDeliveryImpact({
        config,
        deliveryFleet: doc.deliveryFleet?.toObject?.() ?? doc.deliveryFleet ?? {},
        logisticsOptimization: doc.logisticsOptimization?.toObject?.() ?? doc.logisticsOptimization ?? {},
        estimatedMonthlyDemand
      });

      const stored = Number(doc.totalMonthlyCost) || 0;
      const recomputed = result.totalCost;
      if (Math.round(stored) === Math.round(recomputed)) continue;

      const user = await User.findById(doc.userId).select("username");
      console.log(
        `  ${(user?.username || doc.userId).toString().padEnd(10)} round ${doc.roundNumber}: ` +
        `₹${stored.toLocaleString("en-IN")} -> ₹${recomputed.toLocaleString("en-IN")}` +
        `   (removed ₹${(stored - recomputed).toLocaleString("en-IN")} of estimated third-party)`
      );

      if (apply) {
        doc.totalMonthlyCost = recomputed;
        await doc.save();
      }
      changed++;
    }

    console.log(`\n${apply ? "Updated" : "Would update"} ${changed} document(s).`);
    if (apply) console.log("Re-run scoring so results pick this up.");
  } catch (err) {
    console.error("ERROR:", err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
