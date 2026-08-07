const { SEGMENTS } = require("./segments");

/**
 * The weekly operating cycle inside a monthly round.
 *
 * A round is one month for money; the warehouse runs on a week. Market share
 * awards a player demand for the whole round, which is spread across
 * weeksPerRound weeks and then pushed through four gates in order:
 *
 *   1. demand      — this week's share of what the market awarded
 *   2. supply      — what the supplier actually delivers, given lead time and
 *                    reliability. Nothing arrives instantly.
 *   3. warehouse   — receipts are limited by FREE SPACE (capacity minus stock
 *                    already held), not by throughput. Stock persists.
 *   4. delivery    — own riders carry what they can; the rest goes to a third
 *                    party at a per-order fee. Riders are a cost boundary,
 *                    not a wall.
 *
 * Rules that the brief left open, decided here:
 *
 *   - Unmet demand is LOST, never queued. This is quick commerce; a customer
 *     who can't be served in minutes buys elsewhere.
 *   - Unsold stock CARRIES OVER, week to week and round to round. Without
 *     that, "is there space in the warehouse" is not a question anyone can
 *     ask — you'd only ever be capping throughput.
 *   - Warehouse capacity caps stock HELD at any moment, which is what a
 *     warehouse physically does.
 *   - Exceeding rider capacity costs money rather than losing the sale,
 *     because third-party delivery already exists in this game as the
 *     expensive overflow option.
 *
 * SUPPLY SCHEDULE
 *
 * Over the whole round the supplier commits roundDemand * steadyStateRate —
 * reliability decides the total, exactly as the old monthly model did. Lead
 * time decides WHEN it lands:
 *
 *   weeks 1..L      a partial trickle, weeklyDemand * steadyState * rampUp
 *                   (rampUpFulfillmentRate is what the config already calls
 *                   the fraction met before the first real delivery)
 *   weeks L+1..N    everything still owed, spread evenly over the weeks left
 *
 * The catch-up matters: it deliberately arrives FASTER than it can be sold,
 * which is the whole reason a warehouse is a constraint at all. A one-week
 * lead time flows smoothly and needs little space; a three-week lead time
 * dumps most of the month's stock into the final week and needs somewhere to
 * put it. Ship more than the shelves hold and the surplus is refused — the
 * supplier doesn't hold it for you.
 *
 * An earlier draft had the supplier ship exactly the week's demand and no
 * more. That can never build stock, so the warehouse and inventory gates
 * could never bind and the whole chain collapsed back to a throughput cap.
 */
function buildSupplySchedule({ weeks, weeklyDemand, deliveryTimeWeeks, steadyStateRate, rampUpRate }) {
  const leadWeeks = Math.min(Math.max(0, Math.round(deliveryTimeWeeks) || 0), weeks);
  const roundCommitment = weeklyDemand * weeks * steadyStateRate;
  const trickle = weeklyDemand * steadyStateRate * rampUpRate;

  const remainingWeeks = weeks - leadWeeks;
  const owedAfterLead = Math.max(0, roundCommitment - trickle * leadWeeks);
  const catchUp = remainingWeeks > 0 ? owedAfterLead / remainingWeeks : 0;

  return Array.from({ length: weeks }, (_, i) => (i + 1 <= leadWeeks ? trickle : catchUp));
}

/**
 * @param perCategory   [{ categoryName, segments: { premium: { expectedSale }, ... } }]
 *                      MUTATED in place: actualSold / wastedDemand / revenue / cogs
 *                      / grossProfit are written back per segment.
 * @param openingInventory units carried in from the previous round.
 * @param warehouseCapacity units of stock the warehouse holds (per week); null = unlimited.
 * @param riderWeeklyCapacity units own riders can deliver per week.
 * @param thirdPartyCostPerOrder rupees per order the third party carries.
 * @returns totals, the per-week series, and closing inventory.
 */
function runWeeklyFulfillment({
  perCategory,
  weeksPerRound = 4,
  openingInventory = 0,
  warehouseCapacity,
  riderWeeklyCapacity = 0,
  thirdPartyCostPerOrder = 0,
  deliveryTimeWeeks = 0,
  steadyStateRate = 1,
  rampUpRate = 1,
  qualityPricing,
  unitCostBasis
}) {
  const weeks = Math.max(1, Math.round(weeksPerRound) || 4);
  const cogsUnitCost = unitCostBasis ?? qualityPricing.baseUnitPrice;
  const unitPrice = qualityPricing.spMultBase * qualityPricing.baseUnitPrice;
  const unitCost = qualityPricing.cpMult * cogsUnitCost;

  // Flatten to a list of demand cells so a week's sales can be split back
  // across every category+segment in proportion to what each one asked for.
  const cells = [];
  for (const cat of perCategory) {
    for (const segment of SEGMENTS) {
      const seg = cat.segments[segment];
      seg.actualSold = 0;
      seg.wastedDemand = 0;
      cells.push({ seg, weeklyDemand: (seg.expectedSale || 0) / weeks });
    }
  }
  const weeklyDemandTotal = cells.reduce((sum, c) => sum + c.weeklyDemand, 0);

  const schedule = buildSupplySchedule({
    weeks,
    weeklyDemand: weeklyDemandTotal,
    deliveryTimeWeeks,
    steadyStateRate,
    rampUpRate
  });

  let inventory = Math.max(0, openingInventory);
  let thirdPartyOrders = 0;
  const weekly = [];

  for (let week = 1; week <= weeks; week++) {
    const offered = schedule[week - 1];
    const freeSpace = warehouseCapacity == null ? Infinity : Math.max(0, warehouseCapacity - inventory);
    const received = Math.min(offered, freeSpace);
    const refused = offered - received; // supplier had it; there was nowhere to put it

    const available = inventory + received;
    const sold = Math.min(available, weeklyDemandTotal);

    const ownFleetDelivered = Math.min(sold, riderWeeklyCapacity);
    const thirdPartyDelivered = sold - ownFleetDelivered;
    thirdPartyOrders += thirdPartyDelivered;

    inventory = available - sold;
    const unmet = weeklyDemandTotal - sold;

    // Split this week's sales back over the cells proportionally.
    const share = weeklyDemandTotal > 0 ? sold / weeklyDemandTotal : 0;
    for (const cell of cells) {
      const cellSold = cell.weeklyDemand * share;
      cell.seg.actualSold += cellSold;
      cell.seg.wastedDemand += cell.weeklyDemand - cellSold;
    }

    weekly.push({
      week,
      demand: weeklyDemandTotal,
      // Carried on every row so the Analysis table can show what the limits
      // were that week without re-deriving them from other documents.
      warehouseCapacity: warehouseCapacity == null ? null : warehouseCapacity,
      riderCapacity: riderWeeklyCapacity,
      supplyRate: weeklyDemandTotal > 0 ? offered / weeklyDemandTotal : 0,
      received,
      refusedForSpace: refused,
      sold,
      ownFleetDelivered,
      thirdPartyDelivered,
      unmetDemand: unmet,
      closingInventory: inventory
    });
  }

  let totalRevenue = 0, totalCogs = 0, totalGrossProfit = 0;
  for (const cat of perCategory) {
    for (const segment of SEGMENTS) {
      const seg = cat.segments[segment];
      seg.expectedRevenue = seg.actualSold * unitPrice;
      seg.cogs = seg.actualSold * unitCost;
      seg.grossProfit = seg.expectedRevenue - seg.cogs;
      totalRevenue += seg.expectedRevenue;
      totalCogs += seg.cogs;
      totalGrossProfit += seg.grossProfit;
    }
  }

  return {
    totalRevenue,
    totalCogs,
    totalGrossProfit,
    thirdPartyOrders,
    thirdPartyCost: thirdPartyOrders * thirdPartyCostPerOrder,
    closingInventory: inventory,
    weekly
  };
}

module.exports = { runWeeklyFulfillment, buildSupplySchedule };
