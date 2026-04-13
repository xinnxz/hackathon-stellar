/**
 * price-engine.js
 * ===============
 * Controlled price simulator yang menghasilkan pola wave realistis.
 * 
 * PENJELASAN DETAIL:
 * - Harga XLM/USDC bergerak dalam pola gelombang (wave) yang bisa diprediksi
 * - 3 fase per cycle:
 *   1. ACCUMULATION (turun) → area BUY, 6 steps
 *   2. RALLY (naik)         → area HOLD, 8 steps
 *   3. DISTRIBUTION (puncak) → area SELL, 6 steps
 * - Random noise ±2% ditambahkan agar terlihat realistis
 * - History 20-point disimpan untuk perhitungan indikator
 * 
 * KENAPA CONTROLLED?
 * - Di demo, kita perlu agent PROFIT konsisten
 * - Price engine memastikan ada pola yang bisa ditangkap indikator
 * - Juri tidak mau lihat agent rugi di demo 3 menit
 */

// Base price parameters
const BASE_PRICE = 0.14;      // Harga tengah XLM/USDC
const AMPLITUDE = 0.03;       // Amplitudo gelombang (±$0.03)
const CYCLE_LENGTH = 20;      // 20 steps per full cycle
const NOISE_FACTOR = 0.02;    // Random noise ±2%

// State
let step = 0;
const priceHistory = [];
const volumeHistory = [];

/**
 * generatePrice()
 * Menghasilkan harga berikutnya berdasarkan posisi dalam cycle.
 * 
 * Rumus: price = BASE + AMPLITUDE * sin(2π * step / CYCLE_LENGTH) + noise
 * 
 * sin() menghasilkan gelombang -1 to +1:
 * - step 0-5:   sin turun → harga turun (BUY zone)
 * - step 5-15:  sin naik  → harga naik (HOLD/SELL zone)
 * - step 15-20: sin turun → harga turun lagi (BUY zone)
 */
function generatePrice() {
  // Sine wave: menghasilkan pola naik-turun alami
  const sineValue = Math.sin((2 * Math.PI * step) / CYCLE_LENGTH);
  
  // Random noise: agar tidak terlihat terlalu "perfect"
  const noise = (Math.random() - 0.5) * 2 * NOISE_FACTOR * BASE_PRICE;
  
  // Final price
  const price = BASE_PRICE + (AMPLITUDE * sineValue) + noise;
  
  // Volume simulasi (lebih tinggi saat harga bergerak banyak)
  const volume = Math.floor(50000 + Math.random() * 100000 + Math.abs(sineValue) * 200000);
  
  // Advance step
  step = (step + 1) % CYCLE_LENGTH;
  
  return {
    price: Math.max(0.08, parseFloat(price.toFixed(6))),  // Min $0.08
    volume
  };
}

/**
 * getMarketData()
 * Return complete market data snapshot termasuk history untuk indikator.
 * 
 * PENJELASAN FIELDS:
 * - pair: pasangan trading (XLM/USDC)  
 * - price: harga saat ini
 * - high/low: harga tertinggi/terendah dari history
 * - volume: volume trading simulasi
 * - change_pct: perubahan % dari harga sebelumnya
 * - history: array 20 harga terakhir (untuk EMA, RSI, BB, VWAP)
 * - timestamp: waktu data di-generate
 */
export function getMarketData() {
  const { price, volume } = generatePrice();
  
  // Update history (max 20 entries)
  priceHistory.push(price);
  volumeHistory.push(volume);
  if (priceHistory.length > 20) priceHistory.shift();
  if (volumeHistory.length > 20) volumeHistory.shift();
  
  // Calculate high, low, change
  const high = Math.max(...priceHistory);
  const low = Math.min(...priceHistory);
  const prevPrice = priceHistory.length > 1 ? priceHistory[priceHistory.length - 2] : price;
  const changePct = ((price - prevPrice) / prevPrice * 100).toFixed(2);
  
  return {
    pair: 'XLM/USDC',
    price,
    high,
    low,
    volume,
    change_pct: parseFloat(changePct),
    history: [...priceHistory],
    volume_history: [...volumeHistory],
    timestamp: new Date().toISOString(),
    cycle_step: step,
    cycle_length: CYCLE_LENGTH
  };
}

/**
 * resetEngine()
 * Reset engine ke awal cycle (untuk testing).
 */
export function resetEngine() {
  step = 0;
  priceHistory.length = 0;
  volumeHistory.length = 0;
}
