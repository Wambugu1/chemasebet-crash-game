/**
 * Generates random odds with specific guaranteed odds
 * Guaranteed odds: 1.00x, 2.01x, 15.00x, 100.00x
 */
function generateCrashPoint() {
  const r = Math.random();
  
  // --- GUARANTEED ODDS SECTION ---
  // These odds will appear at specific frequencies
  
  // 5% chance of 1.00x (instant crash)
  if (r < 0.05) {
    return 1.00;
  }
  
  // 10% chance of 2.01x
  if (r < 0.15) {
    return 2.01;
  }
  
  // 5% chance of 15.00x
  if (r < 0.20) {
    return 15.00;
  }
  
  // 3% chance of 100.00x (jackpot)
  if (r < 0.23) {
    return 100.00;
  }
  
  // --- RANDOM ODDS (77% of the time) ---
  // Random odds ranging from 1.00x to 150.00x
  
  const random = Math.random();
  
  // 35% chance of low random odds (1.00x - 2.00x)
  if (random < 0.35) {
    return Number((1 + Math.random() * 1.0).toFixed(2));
  }
  
  // 25% chance of medium random odds (2.00x - 5.00x)
  if (random < 0.60) {
    return Number((2 + Math.random() * 3.0).toFixed(2));
  }
  
  // 15% chance of high random odds (5.00x - 10.00x)
  if (random < 0.75) {
    return Number((5 + Math.random() * 5.0).toFixed(2));
  }
  
  // 10% chance of very high random odds (10.00x - 20.00x)
  if (random < 0.85) {
    return Number((10 + Math.random() * 10.0).toFixed(2));
  }
  
  // 7% chance of extreme random odds (20.00x - 50.00x)
  if (random < 0.92) {
    return Number((20 + Math.random() * 30.0).toFixed(2));
  }
  
  // 5% chance of massive random odds (50.00x - 100.00x)
  if (random < 0.97) {
    return Number((50 + Math.random() * 50.0).toFixed(2));
  }
  
  // 3% chance of insane random odds (100.00x - 150.00x)
  return Number((100 + Math.random() * 50.0).toFixed(2));
}

module.exports = { generateCrashPoint };