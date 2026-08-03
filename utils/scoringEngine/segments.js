// Shared segment key list, in the order used throughout the scoring engine.
const SEGMENTS = ["premium", "standard", "basic", "discount"];

function forEachSegment(fn) {
  const result = {};
  for (const segment of SEGMENTS) {
    result[segment] = fn(segment);
  }
  return result;
}

module.exports = { SEGMENTS, forEachSegment };
