require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const { computeRoundScores } = require("./utils/scoringEngine");
const Simulation = require("./models/Simulation");
const Group = require("./models/Group");

(async () => {
  try {
    await connectDB();

    const sim = await Simulation.findOne({ name: "QuickCommerce Round 1" });
    const group = await Group.findOne({ simulationId: sim._id });

    const results = await computeRoundScores(sim._id, group._id, 1);

    console.log(`\n=== Round scores for ${results.length} players ===\n`);
    for (const r of results.sort((a, b) => a.rank - b.rank)) {
      console.log(`#${r.rank}  ${r.user.username}  score=${r.score}  opProfit=${Math.round(r.totalOperatingProfit)}  revenue=${Math.round(r.totalRevenue)}  cogs=${Math.round(r.totalCogs)}`);
      for (const cat of r.perCategory) {
        const segStr = Object.entries(cat.segments)
          .map(([seg, s]) => `${seg}: share=${s.marketShare.toFixed(3)} sale=${s.expectedSale.toFixed(1)} qualifies=${s.qualifies}`)
          .join(" | ");
        console.log(`    ${cat.categoryName}: ${segStr}`);
      }
    }

    // Sanity check: within each category+segment, market shares among
    // enrolled players should sum to <= 1/(1+intensity), never negative,
    // never NaN.
    const bySegmentTotal = {};
    for (const r of results) {
      for (const cat of r.perCategory) {
        for (const [seg, s] of Object.entries(cat.segments)) {
          const key = `${cat.categoryName}:${seg}`;
          bySegmentTotal[key] = (bySegmentTotal[key] || 0) + s.marketShare;
          if (Number.isNaN(s.marketShare) || s.marketShare < 0) {
            console.error(`FAIL: NaN/negative market share at ${key} for ${r.user.username}`);
          }
        }
      }
    }
    console.log("\n=== Market share sums per category:segment (expect <= ~0.8 at Med intensity) ===");
    for (const [key, total] of Object.entries(bySegmentTotal)) {
      console.log(`  ${key}: ${total.toFixed(4)}`);
    }

    const distinctScores = new Set(results.map((r) => r.score)).size;
    console.log(`\nDistinct scores across ${results.length} players: ${distinctScores}`);
    if (distinctScores <= 1) {
      console.error("FAIL: all players got the same score — engine isn't differentiating decisions.");
    }
  } catch (err) {
    console.error("VERIFY FAILED:", err);
  } finally {
    await mongoose.disconnect();
  }
})();
