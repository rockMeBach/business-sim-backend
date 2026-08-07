/**
 * Scores one cohort's round and persists PlayerRoundResult docs — the same
 * work POST /api/scoring/calculate-round does, but runnable without the
 * server and with a readable summary of what the engine produced.
 *
 * Usage: node scoreCohort.js ["Cohort A"] [roundNumber]
 */
require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("./config/db");

const Simulation = require("./models/Simulation");
const Group = require("./models/Group");
const User = require("./models/User");
const PricingDecision = require("./models/PricingDecision");
const PlayerStepOne = require("./models/PlayerStepOne");
const MarketPositionOption = require("./models/MarketPositionOption");
const PlayerRoundResult = require("./models/PlayerRoundResult");
const { computeRoundScores } = require("./utils/scoringEngine");

const SIMULATION_NAME = "QuickCommerce Round 1";
const inLakhs = (n) => `${(Number(n || 0) / 100000).toFixed(2)}L`;

(async () => {
  try {
    await connectDB();

    const cohortName = process.argv[2] || "Cohort A";
    const roundNumber = Number(process.argv[3]) || 1;

    const simulation = await Simulation.findOne({ name: SIMULATION_NAME });
    if (!simulation) throw new Error(`Simulation "${SIMULATION_NAME}" not found.`);

    const group = await Group.findOne({ name: cohortName, simulationId: simulation._id });
    if (!group) throw new Error(`Group "${cohortName}" not found.`);

    const users = await User.find({ groupId: group._id.toString() }).select("_id username");
    console.log(`\n${cohortName} — round ${roundNumber} — ${users.length} player(s)\n`);

    // Who actually played? Pricing is the last of the 8 sections.
    const submitted = [];
    for (const u of users) {
      const p = await PricingDecision.findOne({ userId: u._id, simulationId: simulation._id, round: roundNumber });
      console.log(`  ${u.username.padEnd(12)} submitted=${!!p}`);
      if (p) submitted.push(u.username);
    }
    if (!submitted.length) throw new Error("No player has submitted pricing for this round — nothing to score.");

    const positionOptions = await MarketPositionOption.find({});
    const positionName = new Map(positionOptions.map((o) => [String(o._id), o.name]));

    const results = await computeRoundScores(simulation._id, group._id, roundNumber);

    await Promise.all(
      results.map((r) =>
        PlayerRoundResult.findOneAndUpdate(
          { simulationId: simulation._id, groupId: group._id, roundNumber, userId: r.user._id },
          {
            userId: r.user._id,
            simulationId: simulation._id,
            groupId: group._id,
            roundNumber,
            perCategory: r.perCategory,
            totalRevenue: r.totalRevenue,
            totalCogs: r.totalCogs,
            totalGrossProfit: r.totalGrossProfit,
            turnoverBonus: r.turnoverBonus,
            totalOperatingProfit: r.totalOperatingProfit,
            costBreakdown: r.costBreakdown,
            openingInventory: r.openingInventory,
            closingInventory: r.closingInventory,
            thirdPartyOrders: r.thirdPartyOrders,
            weeklyFulfillment: r.weeklyFulfillment,
            score: r.score,
            rank: r.rank,
            computedAt: new Date()
          },
          { upsert: true, new: true }
        )
      )
    );

    console.log(`\n=== Standings ===\n`);
    for (const r of results.sort((a, b) => a.rank - b.rank)) {
      const stepOne = await PlayerStepOne.findOne({
        userId: r.user._id, simulationId: simulation._id, roundNumber
      });
      const chose = (stepOne?.marketPositionIds || []).map((id) => positionName.get(String(id))).filter(Boolean);

      const scoredSegs = new Set();
      for (const cat of r.perCategory) {
        for (const [seg, s] of Object.entries(cat.segments || {})) if (s.qualifies) scoredSegs.add(seg);
      }

      console.log(`#${r.rank}  ${r.user.username}   score=${Number(r.score).toFixed(2)}`);
      console.log(`     revenue=${inLakhs(r.totalRevenue)}  cogs=${inLakhs(r.totalCogs)}  gross=${inLakhs(r.totalGrossProfit)}  bonus=${inLakhs(r.turnoverBonus)}  operating=${inLakhs(r.totalOperatingProfit)}`);
      console.log(`     positioning chosen=[${chose.join(", ") || "none"}]  scored in=[${[...scoredSegs].join(", ") || "none"}]`);
      const cb = r.costBreakdown || {};
      console.log(`     costs: ${Object.entries(cb).map(([k, v]) => `${k}=${inLakhs(v)}`).join("  ")}`);
      console.log(`     inventory: opening=${Math.round(r.openingInventory)} closing=${Math.round(r.closingInventory)}  3P orders=${Math.round(r.thirdPartyOrders)}`);
      for (const w of r.weeklyFulfillment || []) {
        console.log(`       wk${w.week}: demand=${Math.round(w.demand)} received=${Math.round(w.received)} refused=${Math.round(w.refusedForSpace)} sold=${Math.round(w.sold)} own=${Math.round(w.ownFleetDelivered)} 3P=${Math.round(w.thirdPartyDelivered)} lost=${Math.round(w.unmetDemand)} stock=${Math.round(w.closingInventory)}`);
      }
      for (const cat of r.perCategory) {
        const active = Object.entries(cat.segments || {}).filter(([, s]) => s.qualifies);
        if (!active.length) { console.log(`       ${cat.categoryName}: no competing segment`); continue; }
        console.log(`       ${cat.categoryName}: ${active
          .map(([seg, s]) => `${seg} share=${(s.marketShare * 100).toFixed(1)}% units=${Math.round(s.expectedSale)}`)
          .join(" | ")}`);
      }
      console.log("");
    }
  } catch (err) {
    console.error("ERROR:", err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
})();
