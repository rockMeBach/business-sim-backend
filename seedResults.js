/**
 * Seeds the Results-page reporting collections (Income, Trend, IncomeStatement,
 * Balance, CashFlow, Inventory, Staff, Score) which have no writer anywhere in
 * the app — the Results tabs only ever GET these, nothing ever POSTs to them.
 * Without this, every Results tab shows "No Data Found" / spins on "Loading...".
 *
 * Upserts by `round`, so this is safe to re-run.
 */
require("dotenv").config();
const connectDB = require("./config/db");

const Income = require("./models/IncomeModel");
const Trend = require("./models/TrendModel");
const IncomeStatement = require("./models/IncomeStatementModel");
const Balance = require("./models/BalanceModel");
const CashFlow = require("./models/CashFlowModel");
const Inventory = require("./models/InventoryModel");
const Staff = require("./models/StaffModel");
const Score = require("./models/ScoreModel");

const ROUNDS = ["R1", "R2", "R3", "R4", "R5"];

(async () => {
  try {
    await connectDB();

    // ---- Income (cards) — one doc per round ----
    const incomeByRound = {
      R1: { netTurnover: 4.85, grossMargin: 42.6, totalCosts: 185.3, retainedProfit: 0.68, netTurnoverChange: 12.4, grossMarginChange: 3.2, totalCostsChange: -5.1, retainedProfitChange: 8.9 },
      R2: { netTurnover: 5.23, grossMargin: 43.8, totalCosts: 198.1, retainedProfit: 0.74, netTurnoverChange: 7.8, grossMarginChange: 2.8, totalCostsChange: 6.9, retainedProfitChange: 8.8 },
      R3: { netTurnover: 5.51, grossMargin: 44.5, totalCosts: 205.4, retainedProfit: 0.81, netTurnoverChange: 5.4, grossMarginChange: 1.6, totalCostsChange: 3.7, retainedProfitChange: 9.5 },
      R4: { netTurnover: 6.12, grossMargin: 45.9, totalCosts: 219.7, retainedProfit: 0.93, netTurnoverChange: 11.1, grossMarginChange: 3.1, totalCostsChange: 7.0, retainedProfitChange: 14.8 },
      R5: { netTurnover: 6.78, grossMargin: 47.2, totalCosts: 231.5, retainedProfit: 1.05, netTurnoverChange: 10.8, grossMarginChange: 2.8, totalCostsChange: 5.4, retainedProfitChange: 12.9 },
    };
    for (const round of ROUNDS) {
      await Income.findOneAndUpdate({ round }, { round, ...incomeByRound[round] }, { upsert: true, new: true });
    }

    // ---- Trend — Trend.find() returns ALL docs, used directly as chart data ----
    const trendByRound = {
      R1: { revenue: 48500000, profitability: 6800000 },
      R2: { revenue: 52300000, profitability: 7400000 },
      R3: { revenue: 55100000, profitability: 8100000 },
      R4: { revenue: 61200000, profitability: 9300000 },
      R5: { revenue: 67800000, profitability: 10500000 },
    };
    for (const round of ROUNDS) {
      await Trend.findOneAndUpdate({ round }, { round, ...trendByRound[round] }, { upsert: true, new: true });
    }

    // ---- IncomeStatement — one doc per round ----
    const statementByRound = {
      R1: { netTurnover: 4.85, costOfSales: 2.10, grossMargin: 2.75, salesCosts: 28.5, locationCosts: 15.2, rentalCosts: 22.0, remuneration: 45.8, socialSecurity: 9.6, educationCosts: 4.2, otherCosts: 12.1, sumCosts: 137.4, retainedProfit: 0.68 },
      R2: { netTurnover: 5.23, costOfSales: 2.24, grossMargin: 2.99, salesCosts: 30.6, locationCosts: 15.9, rentalCosts: 22.0, remuneration: 48.1, socialSecurity: 10.1, educationCosts: 4.6, otherCosts: 13.0, sumCosts: 144.3, retainedProfit: 0.74 },
      R3: { netTurnover: 5.51, costOfSales: 2.32, grossMargin: 3.19, salesCosts: 31.9, locationCosts: 16.5, rentalCosts: 22.5, remuneration: 50.0, socialSecurity: 10.5, educationCosts: 4.9, otherCosts: 13.5, sumCosts: 149.8, retainedProfit: 0.81 },
      R4: { netTurnover: 6.12, costOfSales: 2.51, grossMargin: 3.61, salesCosts: 34.4, locationCosts: 17.6, rentalCosts: 23.0, remuneration: 53.9, socialSecurity: 11.3, educationCosts: 5.3, otherCosts: 14.6, sumCosts: 160.1, retainedProfit: 0.93 },
      R5: { netTurnover: 6.78, costOfSales: 2.69, grossMargin: 4.09, salesCosts: 37.2, locationCosts: 18.8, rentalCosts: 23.5, remuneration: 58.2, socialSecurity: 12.2, educationCosts: 5.8, otherCosts: 15.8, sumCosts: 171.5, retainedProfit: 1.05 },
    };
    for (const round of ROUNDS) {
      await IncomeStatement.findOneAndUpdate({ round }, { round, ...statementByRound[round] }, { upsert: true, new: true });
    }

    // ---- Balance — R1 only (numbers are internally consistent: assets = equity + debt) ----
    await Balance.findOneAndUpdate(
      { round: "R1" },
      {
        round: "R1",
        summary: { totalAssets: 68500000, ownersEquity: 42000000, totalDebt: 26500000, solvency: 61.3 },
        assets: {
          fixed: [
            { label: "Warehouses & Equipment", value: 22000000 },
            { label: "Vehicles", value: 8500000 },
          ],
          current: [
            { label: "Inventory", value: 15200000 },
            { label: "Receivables", value: 9800000 },
          ],
          cash: { label: "Cash & Bank", value: 13000000 },
        },
        liabilities: {
          equity: [
            { label: "Share Capital", value: 30000000 },
            { label: "Retained Earnings", value: 12000000 },
          ],
          nonCurrent: [{ label: "Long-term Loans", value: 12500000 }],
          current: [
            { label: "Trade Payables", value: 8000000 },
            { label: "Short-term Debt", value: 6000000 },
          ],
        },
        fundingStructure: [
          { name: "Equity", value: 42000000, color: "#3b82f6" },
          { name: "Long-term Debt", value: 12500000, color: "#10b981" },
          { name: "Short-term Debt", value: 14000000, color: "#f59e0b" },
        ],
      },
      { upsert: true, new: true }
    );

    // ---- CashFlow — R1 only ----
    await CashFlow.findOneAndUpdate(
      { round: "R1" },
      {
        round: "R1",
        summary: { totalIncome: 52000000, totalExpenses: 45500000, netCashFlow: 6500000 },
        trend: [
          { round: "R1", value: 6500000 },
          { round: "R2", value: 7200000 },
          { round: "R3", value: 8100000 },
          { round: "R4", value: 9400000 },
          { round: "R5", value: 10800000 },
        ],
      },
      { upsert: true, new: true }
    );

    // ---- Inventory — R1 only ----
    const weeklyData = [
      { week: "Week 1", demand: 2200, sales: 2100, inventory: 5000 },
      { week: "Week 2", demand: 2350, sales: 2300, inventory: 4700 },
      { week: "Week 3", demand: 2600, sales: 2000, inventory: 4100 },
      { week: "Week 4", demand: 2450, sales: 2400, inventory: 4050 },
      { week: "Week 5", demand: 2700, sales: 2650, inventory: 4000 },
      { week: "Week 6", demand: 2900, sales: 2300, inventory: 3400 },
      { week: "Week 7", demand: 2500, sales: 2450, inventory: 3350 },
      { week: "Week 8", demand: 2600, sales: 2000, inventory: 2750 },
    ];
    await Inventory.findOneAndUpdate(
      { round: "R1" },
      {
        round: "R1",
        summary: { totalDemand: 20300, totalSales: 18200, fulfillment: 89.7, stockouts: 3 },
        weeklyData,
      },
      { upsert: true, new: true }
    );

    // ---- Staff — R1 only ----
    await Staff.findOneAndUpdate(
      { round: "R1" },
      {
        round: "R1",
        summary: { totalStaff: 42, motivation: 78.5, education: 65.2, workload: 82.1 },
        workforceData: [
          { round: "R1", stayed: 35, newStaff: 8, external: 4, leftStaff: 3 },
          { round: "R2", stayed: 38, newStaff: 6, external: 5, leftStaff: 2 },
          { round: "R3", stayed: 41, newStaff: 5, external: 4, leftStaff: 3 },
          { round: "R4", stayed: 43, newStaff: 7, external: 3, leftStaff: 2 },
          { round: "R5", stayed: 46, newStaff: 6, external: 3, leftStaff: 1 },
        ],
        indicatorsData: [
          { round: "R1", workload: 82.1, motivation: 78.5, education: 65.2 },
          { round: "R2", workload: 80.4, motivation: 80.2, education: 67.9 },
          { round: "R3", workload: 78.9, motivation: 81.6, education: 70.3 },
          { round: "R4", workload: 76.2, motivation: 83.4, education: 73.1 },
          { round: "R5", workload: 74.8, motivation: 85.0, education: 76.4 },
        ],
      },
      { upsert: true, new: true }
    );

    // ---- Score — R1 only (achievedTotal/progressTotal sum from their rows; totalScore = achieved + progress) ----
    await Score.findOneAndUpdate(
      { round: "R1" },
      {
        round: "R1",
        totalScore: 672,
        previousScore: 615,
        achievedTotal: 410,
        progressTotal: 262,
        achievedRows: [
          { target: "Revenue Growth", desc: "Achieve 10%+ revenue growth", maxPoints: 100, achieved: true, points: 100 },
          { target: "Customer Satisfaction", desc: "Maintain 4.5+ rating", maxPoints: 100, achieved: true, points: 90 },
          { target: "Cost Control", desc: "Keep costs under budget", maxPoints: 100, achieved: false, points: 40 },
          { target: "Market Share", desc: "Expand into 2 new zones", maxPoints: 100, achieved: true, points: 100 },
          { target: "Sustainability Score", desc: "Reach 4+ star sourcing", maxPoints: 100, achieved: true, points: 80 },
        ],
        progressRows: [
          { target: "Inventory Turnover", desc: "Target turnover ratio", min: "2x", max: "6x", currentTarget: "4.2x", points: 70 },
          { target: "Employee Retention", desc: "Staff retention rate", min: "60%", max: "95%", currentTarget: "83%", points: 65 },
          { target: "Solvency Ratio", desc: "Maintain healthy solvency", min: "40%", max: "80%", currentTarget: "61%", points: 75 },
          { target: "Delivery SLA", desc: "On-time delivery rate", min: "70%", max: "98%", currentTarget: "89%", points: 52 },
        ],
        profitChart: [
          { round: "R1", actual: 6800000, target: 6000000 },
          { round: "R2", actual: 7400000, target: 6500000 },
          { round: "R3", actual: 8100000, target: 7000000 },
          { round: "R4", actual: 9300000, target: 7500000 },
          { round: "R5", actual: 10500000, target: 8000000 },
        ],
        educationChart: [
          { round: "R1", actual: 65.2, target: 60 },
          { round: "R2", actual: 67.9, target: 63 },
          { round: "R3", actual: 70.3, target: 66 },
          { round: "R4", actual: 73.1, target: 69 },
          { round: "R5", actual: 76.4, target: 72 },
        ],
        solvencyChart: [
          { round: "R1", actual: 61.3, target: 55 },
          { round: "R2", actual: 62.8, target: 57 },
          { round: "R3", actual: 64.1, target: 59 },
          { round: "R4", actual: 65.9, target: 61 },
          { round: "R5", actual: 67.4, target: 63 },
        ],
      },
      { upsert: true, new: true }
    );

    console.log("Results data seeded for rounds:", ROUNDS.join(", "));
    process.exit(0);
  } catch (err) {
    console.error("Failed to seed results data:", err);
    process.exit(1);
  }
})();
