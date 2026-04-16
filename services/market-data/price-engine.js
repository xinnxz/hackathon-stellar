/**
 * price-engine.js
 * ===============
 * Smart Controlled Price Engine — Realistic Market Simulator
 * 
 * PENJELASAN:
 * Bukan sine wave bodoh. Engine ini menghasilkan pola harga yang:
 * 1. Terlihat NATURAL — seperti chart tradingview sungguhan
 * 2. Memiliki TREND — agent bisa identifikasi dan profit
 * 3. Ada VOLATILITY — indikator teknikal bisa bekerja
 * 4. Random enough — tidak ada pola yang terlalu obvious
 * 
 * MARKET PHASES:
 * - ACCUMULATION: Harga turun pelan, lalu sideways (BUY zone)
 * - BREAKOUT: Harga naik tajam dengan volume tinggi
 * - RALLY: Harga naik konsisten (HOLD zone)
 * - DISTRIBUTION: Harga peak, mulai choppy (SELL zone)
 * - CORRECTION: Harga turun tajam, reset cycle
 * 
 * Setiap phase memiliki panjang random untuk menambah realism.
 */

// ═══ Configuration ═══
let BASE_PRICE = 0.13;          // Starting price
let MIN_PRICE = 0.09;           // Hard floor
let MAX_PRICE = 0.19;           // Hard ceiling
const MAX_AMPLITUDE = 0.04;       // Max swing dari base

// ═══ State ═══
let currentPrice = BASE_PRICE;

import https from 'https';

function initRealPrice() {
  https.get('https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        if (json && json.stellar && json.stellar.usd) {
          const realPrice = json.stellar.usd;
          BASE_PRICE = realPrice;
          MIN_PRICE = realPrice * 0.7;
          MAX_PRICE = realPrice * 1.3;
          currentPrice = realPrice;
          console.log(`\n[Market Engine] 📡 Synced mock base with real-time XLM price: $${realPrice}`);
        }
      } catch (e) {}
    });
  }).on('error', () => {
    console.log('\n[Market Engine] ⚠️ Failed to fetch real XLM price, using fallback $0.13');
  });
}

initRealPrice();
let trend = 0;           // Current momentum (-1 to +1)
let volatility = 0.002;  // Current volatility
let phase = 'ACCUMULATION';
let phaseStep = 0;
let phaseLength = 8;
let cycleCount = 0;

const priceHistory = [];
const volumeHistory = [];

// ═══ Phase Definitions ═══
const PHASES = {
  ACCUMULATION: {
    trend: -0.3,        // Slight downtrend
    volatility: 0.003,  // Low vol
    volume: 80000,
    nextPhase: 'BREAKOUT',
    minSteps: 4,
    maxSteps: 7
  },
  BREAKOUT: {
    trend: 0.8,          // Strong uptrend
    volatility: 0.006,   // Higher vol
    volume: 250000,
    nextPhase: 'RALLY',
    minSteps: 2,
    maxSteps: 4
  },
  RALLY: {
    trend: 0.5,          // Steady uptrend
    volatility: 0.004,   // Moderate vol
    volume: 180000,
    nextPhase: 'DISTRIBUTION',
    minSteps: 5,
    maxSteps: 9
  },
  DISTRIBUTION: {
    trend: 0.1,          // Flat/slightly up
    volatility: 0.005,   // Choppy
    volume: 200000,
    nextPhase: 'CORRECTION',
    minSteps: 3,
    maxSteps: 6
  },
  CORRECTION: {
    trend: -0.6,         // Sharp downtrend
    volatility: 0.007,   // High vol
    volume: 220000,
    nextPhase: 'ACCUMULATION',
    minSteps: 3,
    maxSteps: 5
  }
};

/**
 * generatePrice()
 * 
 * PENJELASAN ALGORITMA:
 * 1. Cek apakah perlu ganti phase
 * 2. Hitung trend component: arah utama pergerakan
 * 3. Hitung noise component: random walk realistis
 * 4. Combine + clamp ke min/max range
 * 5. Tambah mean reversion kalau terlalu jauh dari base
 * 
 * Hasilnya: harga yang terlihat natural, ada trend jelas,
 * tapi tidak terlalu predictable.
 */
function generatePrice() {
  const phaseConfig = PHASES[phase];
  
  // Check phase transition
  phaseStep++;
  if (phaseStep >= phaseLength) {
    const oldPhase = phase;
    phase = phaseConfig.nextPhase;
    phaseStep = 0;
    phaseLength = PHASES[phase].minSteps + 
      Math.floor(Math.random() * (PHASES[phase].maxSteps - PHASES[phase].minSteps + 1));
    cycleCount++;
  }
  
  // ═══ Price Movement ═══
  
  // 1. Trend component: drift berdasarkan phase
  const trendForce = phaseConfig.trend * phaseConfig.volatility;
  
  // 2. Noise component: random walk
  const noise = (Math.random() - 0.5) * 2 * phaseConfig.volatility;
  
  // 3. Mean reversion: tarik kembali ke BASE kalau terlalu jauh
  const distFromBase = currentPrice - BASE_PRICE;
  const meanReversion = -distFromBase * 0.03;
  
  // 4. Momentum (slight autocorrelation untuk realism)  
  trend = trend * 0.7 + (trendForce + noise) * 0.3;
  
  // 5. Combine all forces
  const priceChange = trend + meanReversion + noise * 0.5;
  currentPrice += priceChange;
  
  // 6. Hard bounds
  currentPrice = Math.max(MIN_PRICE, Math.min(MAX_PRICE, currentPrice));
  currentPrice = parseFloat(currentPrice.toFixed(6));
  
  // 7. Volume (higher during breakout/correction)
  const baseVol = phaseConfig.volume;
  const volNoise = Math.floor(Math.random() * baseVol * 0.5);
  const volume = baseVol + volNoise;
  
  return { price: currentPrice, volume };
}

/**
 * getMarketData()
 * Return complete market data snapshot.
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
    phase,
    cycle: cycleCount
  };
}

/**
 * resetEngine()
 */
export function resetEngine() {
  currentPrice = BASE_PRICE;
  trend = 0;
  volatility = 0.002;
  phase = 'ACCUMULATION';
  phaseStep = 0;
  phaseLength = 8;
  cycleCount = 0;
  priceHistory.length = 0;
  volumeHistory.length = 0;
}
