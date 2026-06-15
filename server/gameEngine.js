/**
 * Generates a crash point using a house-edge weighted distribution.
 * Uses an exponential distribution biased toward lower multipliers,
 * giving the "house" a slight edge while allowing large wins.
 */
function generateCrashPoint() {
  // Use exponential distribution: more crashes near 1x, rare crashes at 10x+
  const r = Math.random();
  // Inverse CDF of exponential with lambda=0.5 — median around 1.4x
  const raw = -Math.log(1 - r) / 0.5 + 1;
  // Clamp between 1.00 and 20.00
  return Number(Math.min(Math.max(raw, 1.0), 20.0).toFixed(2));
}

module.exports = { generateCrashPoint };