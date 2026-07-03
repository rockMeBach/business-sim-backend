// utils/monthlyDemand.js
exports.calculateMonthlyDemand = (
  baseDemand,
  inventoryRange,
  quickCommerceModel,
  marketPositions
) => {
  let demand = baseDemand;

  // 🔹 Inventory impact
  if (inventoryRange === "0-500") demand *= 0.7;
  if (inventoryRange === "500-1000") demand *= 1.0;
  if (inventoryRange === "1000-1500") demand *= 1.3;

  // 🔹 Quick Commerce Model impact
  if (quickCommerceModel === "10-min") demand *= 1.4;
  if (quickCommerceModel === "15-20-min") demand *= 1.2;
  if (quickCommerceModel === "30-min") demand *= 1.0;
  if (quickCommerceModel === "hybrid") demand *= 1.1;

  // 🔹 Market Positioning impact
  if (marketPositions.includes("Premium Urban")) demand *= 1.2;
  if (marketPositions.includes("Mass Market")) demand *= 1.0;
  if (marketPositions.includes("Value/Discount")) demand *= 0.9;

  return Math.round(demand);
};
