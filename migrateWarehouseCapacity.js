/**
 * Migrates warehouse capacity from per-category to the pooled, document-level
 * field introduced alongside the shared-warehouse change.
 *
 * Capacity used to be stored once per category
 * (PlayerProductCategory.categories[].warehouseCapacity). It is now a single
 * figure on the document, because one warehouse serves every category and the
 * scoring engine pools total units sold against it.
 *
 * A player who had 5000/4000/3000 across three categories had 12000 units of
 * warehouse in total, so the per-category values are SUMMED. Documents whose
 * per-category values were all empty stay null (uncapped), exactly as before.
 *
 * Without this, existing saved rounds would silently become uncapped — the
 * engine reads the root field only. Per-category values are left in place so
 * the migration is reversible.
 *
 * Usage: node migrateWarehouseCapacity.js [--apply]   (dry-run without --apply)
 */
require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const PlayerProductCategory = require("./models/PlayerProductCategory");

(async () => {
  try {
    await connectDB();
    const apply = process.argv.includes("--apply");
    if (!apply) console.log("DRY RUN — pass --apply to write changes.\n");

    const docs = await PlayerProductCategory.find({});
    let migrated = 0, skipped = 0;

    for (const doc of docs) {
      if (doc.warehouseCapacity != null) {
        skipped++;
        continue; // already migrated
      }

      const values = (doc.categories || [])
        .map((c) => c.warehouseCapacity)
        .filter((v) => typeof v === "number" && !Number.isNaN(v));

      const pooled = values.length ? values.reduce((a, b) => a + b, 0) : null;

      console.log(
        `${doc.userId} round ${doc.roundNumber}: [${values.join(", ") || "none"}] -> ${pooled ?? "null (uncapped)"}`
      );

      if (apply && pooled != null) {
        doc.warehouseCapacity = pooled;
        await doc.save();
      }
      if (pooled != null) migrated++;
    }

    console.log(
      `\n${apply ? "Migrated" : "Would migrate"} ${migrated} document(s); ${skipped} already had a pooled value.`
    );
  } catch (err) {
    console.error("MIGRATION FAILED:", err);
  } finally {
    await mongoose.disconnect();
  }
})();
