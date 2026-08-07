/**
 * Rewrites PricingDecision.categories[].qualityPrice / finalSellingPrice from
 * demand-derived figures to real per-unit prices.
 *
 * Both were computed off baseMonthlyDemand — a unit count — so Mobile stored
 * a "buying price" of 4,340 purely because its demand was 3,100. Per unit it
 * should be baseUnitPrice(1200) * cpMult, then * marginMultiplier, which is
 * what the scoring engine actually charges and earns per unit.
 *
 * The engine derives its own prices from PricingConfig and never read these
 * fields, so scores don't move — but the exported workbook does read them.
 *
 * Usage: node migratePricingUnitPrices.js [--apply]     (dry run by default)
 */
require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const PricingConfig = require("./models/PricingConfig");
const User = require("./models/User");

(async () => {
  try {
    await connectDB();
    const apply = process.argv.includes("--apply");
    const collection = mongoose.connection.db.collection("pricingdecisions");

    const config = await PricingConfig.findOne();
    const baseUnitPrice = config?.baseUnitPrice || 0;
    if (!baseUnitPrice) throw new Error("PricingConfig.baseUnitPrice missing — cannot derive prices.");
    console.log(`baseUnitPrice = ₹${baseUnitPrice}${apply ? "" : "   [DRY RUN — pass --apply to write]"}\n`);

    const docs = await collection.find({}).toArray();
    let changed = 0;

    for (const doc of docs) {
      const user = await User.findById(doc.userId);
      const rows = [];

      const categories = (doc.categories || []).map((cat) => {
        const cpMult =
          config.qualityTiers?.get(String(cat.qualityLevel))?.cpMult ?? cat.qualityMultiplier ?? 1;
        const margin = typeof cat.marginMultiplier === "number" ? cat.marginMultiplier : 1;
        const qualityPrice = Math.round(baseUnitPrice * cpMult);
        const finalSellingPrice = Math.round(qualityPrice * margin);

        rows.push(
          `      ${String(cat.name).padEnd(8)} buy ₹${Math.round(cat.qualityPrice || 0)} -> ₹${qualityPrice}` +
          `   sell ₹${Math.round(cat.finalSellingPrice || 0)} -> ₹${finalSellingPrice}`
        );

        return { ...cat, qualityMultiplier: cpMult, qualityPrice, finalSellingPrice };
      });

      console.log(`  ${user?.username || "?"} round ${doc.round}`);
      rows.forEach((r) => console.log(r));

      if (apply) await collection.updateOne({ _id: doc._id }, { $set: { categories } });
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
