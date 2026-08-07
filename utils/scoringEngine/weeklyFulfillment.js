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
 * NOTHING IS DESTROYED. Three things queue instead:
 *
 *   - Unserved demand BACKLOGS. A customer you couldn't serve this week is
 *     still waiting next week, and gets served in proportion to what their
 *     segment is owed. Whatever is still queued when the round ends carries
 *     into the next round.
 *   - Stock the warehouse had no room for stays IN TRANSIT with the supplier
 *     rather than being cancelled, and lands the moment shelf space frees up.
 *   - Unsold stock CARRIES OVER, week to week and round to round.
 *
 *   - Warehouse capacity caps stock HELD at any moment, which is what a
 *     warehouse physically does.
 *   - Exceeding rider capacity costs money rather than losing the sale,
 *     because third-party delivery already exists in this game as the
 *     expensive overflow option.
 *
 * Consequence worth knowing: with a warehouse permanently smaller than
 * demand, backlog and in-transit stock both grow without limit and never
 * clear. That is the model as specified — there is no expiry rule.
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
  openingBacklog = 0,
  openingPendingSupply = 0,
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
  // across every category+segment. Each cell keeps its own backlog, so a
  // segment that went unserved gets first call on next week's stock in
  // proportion to what it is still owed.
  const cells = [];
  for (const cat of perCategory) {
    for (const segment of SEGMENTS) {
      const seg = cat.segments[segment];
      seg.actualSold = 0;
      seg.wastedDemand = 0;
      cells.push({ seg, weeklyDemand: (seg.expectedSale || 0) / weeks, backlog: 0 });
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

  // Backlog carried in from last round is spread over the cells the same way
  // this round's demand is, since the old per-segment split isn't stored.
  if (openingBacklog > 0 && weeklyDemandTotal > 0) {
    for (const cell of cells) {
      cell.backlog = openingBacklog * (cell.weeklyDemand / weeklyDemandTotal);
    }
  }

  let inventory = Math.max(0, openingInventory);
  let pendingSupply = Math.max(0, openingPendingSupply);
  let thirdPartyOrders = 0;
  const weekly = [];

  for (let week = 1; week <= weeks; week++) {
    // This week's shipment joins whatever the supplier is still holding for
    // us. Stock that wouldn't fit isn't cancelled — it stays in transit and
    // comes in as soon as shelf space appears.
    pendingSupply += schedule[week - 1];

    const freeSpace = warehouseCapacity == null ? Infinity : Math.max(0, warehouseCapacity - inventory);
    const received = Math.min(pendingSupply, freeSpace);
    pendingSupply -= received;

    const backlogIn = cells.reduce((sum, c) => sum + c.backlog, 0);
    const demandThisWeek = weeklyDemandTotal + backlogIn;

    const available = inventory + received;
    const sold = Math.min(available, demandThisWeek);

    const ownFleetDelivered = Math.min(sold, riderWeeklyCapacity);
    const thirdPartyDelivered = sold - ownFleetDelivered;
    thirdPartyOrders += thirdPartyDelivered;

    inventory = available - sold;

    // Serve every cell in proportion to what it is owed this week — its fresh
    // demand plus anything still queued from earlier weeks.
    const share = demandThisWeek > 0 ? sold / demandThisWeek : 0;
    for (const cell of cells) {
      const owed = cell.weeklyDemand + cell.backlog;
      const cellSold = owed * share;
      cell.seg.actualSold += cellSold;
      cell.backlog = owed - cellSold;
    }

    weekly.push({
      week,
      demand: weeklyDemandTotal,
      backlogIn,
      totalDemand: demandThisWeek,
      // Carried on every row so the Analysis table can show what the limits
      // were that week without re-deriving them from other documents.
      warehouseCapacity: warehouseCapacity == null ? null : warehouseCapacity,
      riderCapacity: riderWeeklyCapacity,
      supplyRate: weeklyDemandTotal > 0 ? schedule[week - 1] / weeklyDemandTotal : 0,
      received,
      pendingSupply,
      sold,
      ownFleetDelivered,
      thirdPartyDelivered,
      backlogOut: demandThisWeek - sold,
      closingInventory: inventory
    });
  }

  // Nothing was thrown away during the round — what's still queued at the end
  // is what remains unserved, and it carries into the next round.
  const closingBacklog = cells.reduce((sum, c) => sum + c.backlog, 0);
  for (const cell of cells) cell.seg.wastedDemand = cell.backlog;

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
    closingBacklog,
    closingPendingSupply: pendingSupply,
    weekly
  };
}

module.exports = { runWeeklyFulfillment, buildSupplySchedule };
