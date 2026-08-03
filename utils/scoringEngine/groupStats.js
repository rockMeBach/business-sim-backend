// Cross-player statistics needed by rows 32/64 (competitive average), row 70
// (corporate-spend min/max), and rows 77/81 (group-relative sigmoid score).
// Computed once per round by the orchestrator from every player in the group.

function average(values) {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

// Matches Excel's STDEV.S (sample standard deviation, n-1 denominator).
function sampleStdev(values) {
  if (values.length < 2) return 0;
  const avg = average(values);
  const variance = values.reduce((sum, v) => sum + (v - avg) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function sigmoid(value, avg, stdev) {
  if (!stdev) return 50;
  return 100 / (1 + Math.exp(-((value - avg) / stdev)));
}

function minMax(values) {
  if (!values.length) return { min: 0, max: 0 };
  return { min: Math.min(...values), max: Math.max(...values) };
}

module.exports = { average, sampleStdev, sigmoid, minMax };
