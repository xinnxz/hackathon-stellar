/**
 * indicators.js
 * =============
 * 4 Technical Indicators + Confluence Scoring System
 * 
 * PENJELASAN DETAIL:
 * Ini adalah "otak quant" dari trading agent kita.
 * Menggunakan 4 indikator teknikal yang masing-masing "voting" BUY/SELL/HOLD.
 * Trade hanya dieksekusi jika 3 dari 4 indikator SETUJU (confluence).
 * 
 * INDIKATOR:
 * 1. EMA Crossover  → Trend detection (arah pasar)
 * 2. RSI            → Momentum (overbought/oversold)
 * 3. Bollinger Bands → Volatility (harga di atas/bawah band)
 * 4. VWAP           → Fair value (harga vs rata-rata berbobot volume)
 */

/**
 * EMA (Exponential Moving Average)
 * 
 * PENJELASAN:
 * EMA memberi bobot lebih besar pada harga terbaru.
 * Rumus: EMA_today = Price * k + EMA_yesterday * (1 - k)
 * dimana k = 2 / (period + 1)
 * 
 * Kita pakai 2 EMA:
 * - EMA-Fast (period 5) → cepat bereaksi
 * - EMA-Slow (period 12) → lebih smooth
 * 
 * Signal:
 * - Fast > Slow → trend NAIK → BUY
 * - Fast < Slow → trend TURUN → SELL
 */
function calculateEMA(prices, period) {
  if (prices.length < period) return null;
  
  const k = 2 / (period + 1);  // Smoothing factor
  
  // Initial SMA sebagai starting point
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  
  // Calculate EMA for remaining prices
  for (let i = period; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
  }
  
  return ema;
}

export function emaSignal(prices) {
  const emaFast = calculateEMA(prices, 5);   // Fast: 5-period
  const emaSlow = calculateEMA(prices, 12);  // Slow: 12-period
  
  if (emaFast === null || emaSlow === null) {
    return { signal: 'HOLD', value: { fast: null, slow: null }, reason: 'Insufficient data' };
  }
  
  const crossover = emaFast - emaSlow;
  let signal = 'HOLD';
  let reason = '';
  
  if (crossover > 0.0005) {
    signal = 'BUY';
    reason = `EMA-Fast(${emaFast.toFixed(4)}) > EMA-Slow(${emaSlow.toFixed(4)}) → Bullish trend`;
  } else if (crossover < -0.0005) {
    signal = 'SELL';
    reason = `EMA-Fast(${emaFast.toFixed(4)}) < EMA-Slow(${emaSlow.toFixed(4)}) → Bearish trend`;
  } else {
    reason = `EMA-Fast ≈ EMA-Slow → No clear trend`;
  }
  
  return { signal, value: { fast: emaFast, slow: emaSlow, crossover }, reason };
}

/**
 * RSI (Relative Strength Index)
 * 
 * PENJELASAN:
 * RSI mengukur kekuatan pergerakan harga (0-100).
 * 
 * Rumus:
 * 1. Hitung gains (kenaikan) dan losses (penurunan)
 * 2. Average Gain = rata-rata kenaikan 14 periode
 * 3. Average Loss = rata-rata penurunan 14 periode
 * 4. RS = Average Gain / Average Loss
 * 5. RSI = 100 - (100 / (1 + RS))
 * 
 * Signal:
 * - RSI < 30 → OVERSOLD (terlalu murah) → BUY
 * - RSI > 70 → OVERBOUGHT (terlalu mahal) → SELL
 * - 30-70    → NEUTRAL → HOLD
 */
export function rsiSignal(prices, period = 14) {
  if (prices.length < period + 1) {
    return { signal: 'HOLD', value: 50, reason: 'Insufficient data for RSI' };
  }
  
  // Calculate price changes
  const changes = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }
  
  // Separate gains and losses
  const recentChanges = changes.slice(-period);
  let avgGain = 0;
  let avgLoss = 0;
  
  for (const change of recentChanges) {
    if (change > 0) avgGain += change;
    else avgLoss += Math.abs(change);
  }
  
  avgGain /= period;
  avgLoss /= period;
  
  // Calculate RSI
  let rsi;
  if (avgLoss === 0) {
    rsi = 100;
  } else {
    const rs = avgGain / avgLoss;
    rsi = 100 - (100 / (1 + rs));
  }
  
  let signal = 'HOLD';
  let reason = '';
  
  if (rsi < 30) {
    signal = 'BUY';
    reason = `RSI(${rsi.toFixed(1)}) < 30 → Oversold, likely to bounce up`;
  } else if (rsi > 70) {
    signal = 'SELL';
    reason = `RSI(${rsi.toFixed(1)}) > 70 → Overbought, likely to drop`;
  } else {
    reason = `RSI(${rsi.toFixed(1)}) in neutral zone (30-70)`;
  }
  
  return { signal, value: parseFloat(rsi.toFixed(1)), reason };
}

/**
 * Bollinger Bands
 * 
 * PENJELASAN:
 * Bollinger Bands terdiri dari 3 garis:
 * - Middle Band = SMA(20) → rata-rata 20 periode
 * - Upper Band = SMA + (2 × Standard Deviation)
 * - Lower Band = SMA - (2 × Standard Deviation)
 * 
 * 95% harga seharusnya berada di antara upper dan lower band.
 * Jika harga menembus band → kemungkinan besar akan kembali.
 * 
 * Signal:
 * - Price ≤ Lower Band → BUY (harga terlalu rendah, akan bouncing)
 * - Price ≥ Upper Band → SELL (harga terlalu tinggi, akan turun)
 * - Di antara → HOLD
 */
export function bollingerSignal(prices, period = 20, multiplier = 2) {
  if (prices.length < period) {
    return { signal: 'HOLD', value: { upper: 0, middle: 0, lower: 0 }, reason: 'Insufficient data' };
  }
  
  const recentPrices = prices.slice(-period);
  
  // SMA (Simple Moving Average)
  const sma = recentPrices.reduce((a, b) => a + b, 0) / period;
  
  // Standard Deviation
  const squaredDiffs = recentPrices.map(p => Math.pow(p - sma, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / period;
  const stdDev = Math.sqrt(variance);
  
  // Bands
  const upper = sma + (multiplier * stdDev);
  const lower = sma - (multiplier * stdDev);
  const currentPrice = prices[prices.length - 1];
  
  let signal = 'HOLD';
  let reason = '';
  
  if (currentPrice <= lower) {
    signal = 'BUY';
    reason = `Price($${currentPrice.toFixed(4)}) ≤ Lower Band($${lower.toFixed(4)}) → Oversold`;
  } else if (currentPrice >= upper) {
    signal = 'SELL';
    reason = `Price($${currentPrice.toFixed(4)}) ≥ Upper Band($${upper.toFixed(4)}) → Overbought`;
  } else {
    reason = `Price within bands ($${lower.toFixed(4)} - $${upper.toFixed(4)})`;
  }
  
  return {
    signal,
    value: {
      upper: parseFloat(upper.toFixed(6)),
      middle: parseFloat(sma.toFixed(6)),
      lower: parseFloat(lower.toFixed(6)),
      currentPrice
    },
    reason
  };
}

/**
 * VWAP (Volume Weighted Average Price)
 * 
 * PENJELASAN:
 * VWAP adalah rata-rata harga yang diberi bobot berdasarkan volume.
 * Rumus: VWAP = Σ(Price × Volume) / Σ(Volume)
 * 
 * Artinya: harga rata-rata "sebenarnya" yang diperdagangkan.
 * Jika harga saat ini < VWAP → harga "murah" → BUY
 * Jika harga saat ini > VWAP → harga "mahal" → SELL
 * 
 * Signal:
 * - Price < VWAP → BUY (trading below fair value)
 * - Price > VWAP → SELL (trading above fair value)
 */
export function vwapSignal(prices, volumes) {
  if (!volumes || volumes.length < 5 || prices.length < 5) {
    return { signal: 'HOLD', value: 0, reason: 'Insufficient volume data' };
  }
  
  // Make sure both arrays are same length
  const len = Math.min(prices.length, volumes.length);
  const p = prices.slice(-len);
  const v = volumes.slice(-len);
  
  // VWAP = Σ(P×V) / ΣV
  let sumPV = 0;
  let sumV = 0;
  for (let i = 0; i < len; i++) {
    sumPV += p[i] * v[i];
    sumV += v[i];
  }
  
  const vwap = sumV > 0 ? sumPV / sumV : p[p.length - 1];
  const currentPrice = prices[prices.length - 1];
  const deviation = (currentPrice - vwap) / vwap;
  
  let signal = 'HOLD';
  let reason = '';
  
  if (deviation < -0.005) {
    signal = 'BUY';
    reason = `Price($${currentPrice.toFixed(4)}) < VWAP($${vwap.toFixed(4)}) → Below fair value`;
  } else if (deviation > 0.005) {
    signal = 'SELL';
    reason = `Price($${currentPrice.toFixed(4)}) > VWAP($${vwap.toFixed(4)}) → Above fair value`;
  } else {
    reason = `Price ≈ VWAP($${vwap.toFixed(4)}) → At fair value`;
  }
  
  return { signal, value: parseFloat(vwap.toFixed(6)), reason };
}

/**
 * Confluence Scoring
 * ==================
 * Menggabungkan 4 sinyal indikator dan menentukan keputusan final.
 * 
 * ATURAN:
 * - 4/4 indikator agree = 100% confidence → Full position (150 XLM)
 * - 3/4 indikator agree = 75% confidence  → Reduced position (100 XLM)
 * - <3/4 = NO TRADE → HOLD
 * 
 * KENAPA CONFLUENCE?
 * - Satu indikator saja bisa salah (false signal)
 * - Tapi kalau 3-4 indikator sepakat → kemungkinan benar JAUH lebih tinggi
 * - Ini seperti "voting" → demokrasi keputusan trading
 */
export function calculateConfluence(prices, volumes) {
  const ema = emaSignal(prices);
  const rsi = rsiSignal(prices);
  const bb = bollingerSignal(prices);
  const vwap = vwapSignal(prices, volumes);
  
  const indicators = { ema, rsi, bb, vwap };
  
  // Count votes
  const votes = [ema.signal, rsi.signal, bb.signal, vwap.signal];
  const buyVotes = votes.filter(v => v === 'BUY').length;
  const sellVotes = votes.filter(v => v === 'SELL').length;
  const holdVotes = votes.filter(v => v === 'HOLD').length;
  
  let signal = 'HOLD';
  let confidence = 0;
  let size = 0;
  let reason = '';
  
  if (buyVotes >= 3) {
    signal = 'BUY';
    confidence = buyVotes / 4;
    size = buyVotes === 4 ? 150 : 100;
    reason = `${buyVotes}/4 indicators signal BUY → ${buyVotes === 4 ? 'HIGH' : 'MODERATE'} conviction`;
  } else if (sellVotes >= 3) {
    signal = 'SELL';
    confidence = sellVotes / 4;
    size = sellVotes === 4 ? 150 : 100;
    reason = `${sellVotes}/4 indicators signal SELL → ${sellVotes === 4 ? 'HIGH' : 'MODERATE'} conviction`;
  } else {
    confidence = 0;
    size = 0;
    reason = `No confluence: BUY=${buyVotes}, SELL=${sellVotes}, HOLD=${holdVotes} → Waiting`;
  }
  
  return {
    signal,
    confidence,
    suggestedSize: size,
    reason,
    indicators,
    votes: { buy: buyVotes, sell: sellVotes, hold: holdVotes }
  };
}
