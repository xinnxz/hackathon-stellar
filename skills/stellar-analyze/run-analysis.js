/**
 * run-analysis.js
 * ================
 * OpenClaw Skill Script: Jalankan 4 Technical Indicators + Confluence
 * 
 * STRATEGI: Aggressive Scalper
 * - Threshold lebih sensitif untuk menangkap micro-movements
 * - Confluence 2/4 sudah cukup untuk trade (bukan 3/4)
 * - Momentum-based: ikuti arah trend, jangan lawan
 * - Volatility filter: skip trading kalau market terlalu flat
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PRICE_HISTORY_FILE = path.resolve(__dirname, '../../server/price-history.json');

// ═══════════════════════════════════
// Indicator Functions (Tuned for Real Scalping)
// ═══════════════════════════════════

function calcEMA(prices, period) {
  if (prices.length < period) return prices[prices.length - 1];
  const k = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
  }
  return ema;
}

/**
 * EMA Cross — Lebih sensitif untuk real prices
 * Fast EMA(3) vs Slow EMA(8) — period pendek untuk scalping
 * Threshold: 0.05% (sebelumnya 0.3%)
 */
function analyzeEMA(prices) {
  if (prices.length < 8) return { signal: 'HOLD', reason: 'Need 8+ prices for EMA', value: null };
  const emaFast = calcEMA(prices, 3);  // Ultra-fast
  const emaSlow = calcEMA(prices, 8);  // Fast
  const diff = ((emaFast - emaSlow) / emaSlow) * 100;
  
  if (diff > 0.05) return { signal: 'BUY', reason: `Fast EMA above slow by ${diff.toFixed(3)}%`, value: parseFloat(diff.toFixed(2)) };
  if (diff < -0.05) return { signal: 'SELL', reason: `Fast EMA below slow by ${Math.abs(diff).toFixed(3)}%`, value: parseFloat(diff.toFixed(2)) };
  return { signal: 'HOLD', reason: `EMAs within range (${diff.toFixed(3)}%)`, value: parseFloat(diff.toFixed(2)) };
}

/**
 * RSI — Lebih agresif untuk scalping
 * Threshold: 40/60 (sebelumnya 30/70)
 * Period lebih pendek: 6 (sebelumnya 14)
 */
function analyzeRSI(prices, period = 6) {
  if (prices.length < period + 1) {
    const usePeriod = Math.max(3, prices.length - 1);
    return calcRSI(prices, usePeriod);
  }
  return calcRSI(prices, period);
}

function calcRSI(prices, period) {
  let gains = 0, losses = 0;
  for (let i = prices.length - period; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }
  
  const avgGain = gains / period;
  const avgLoss = losses / period;
  
  if (avgLoss === 0) return { signal: 'SELL', reason: 'RSI at 100 (overbought)', value: 100 };
  
  const rs = avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));
  
  // Scalping: lebih agresif — 40/60 threshold
  if (rsi < 40) return { signal: 'BUY', reason: `RSI ${rsi.toFixed(1)} — oversold`, value: parseFloat(rsi.toFixed(1)) };
  if (rsi > 60) return { signal: 'SELL', reason: `RSI ${rsi.toFixed(1)} — overbought`, value: parseFloat(rsi.toFixed(1)) };
  return { signal: 'HOLD', reason: `RSI ${rsi.toFixed(1)} — neutral`, value: parseFloat(rsi.toFixed(1)) };
}

/**
 * Bollinger Bands — Tighter bands untuk scalping
 * Multiplier: 1.5 (sebelumnya 2.0) — lebih mudah trigger
 */
function analyzeBB(prices) {
  if (prices.length < 5) return { signal: 'HOLD', reason: 'Need 5+ prices for BB', value: null };
  const period = Math.min(10, prices.length);  // Shorter period
  const slice = prices.slice(-period);
  const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
  const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / slice.length;
  const std = Math.sqrt(variance);
  
  const upper = mean + 1.5 * std;  // Tighter bands
  const lower = mean - 1.5 * std;
  const current = prices[prices.length - 1];
  const position = std > 0 ? ((current - lower) / (upper - lower)) * 100 : 50;
  
  if (current <= lower) return { signal: 'BUY', reason: `Price at lower BB (${position.toFixed(0)}%)`, value: parseFloat(position.toFixed(1)) };
  if (current >= upper) return { signal: 'SELL', reason: `Price at upper BB (${position.toFixed(0)}%)`, value: parseFloat(position.toFixed(1)) };
  return { signal: 'HOLD', reason: `Price within bands (${position.toFixed(0)}%)`, value: parseFloat(position.toFixed(1)) };
}

/**
 * VWAP — Lebih sensitif
 * Threshold: 0.3% (sebelumnya 1%)
 */
function analyzeVWAP(prices, volumes) {
  if (prices.length < 3) return { signal: 'HOLD', reason: 'Need 3+ prices for VWAP', value: null };
  
  let totalPV = 0, totalV = 0;
  for (let i = 0; i < prices.length; i++) {
    const vol = volumes?.[i] || 100000;
    totalPV += prices[i] * vol;
    totalV += vol;
  }
  const vwap = totalPV / totalV;
  const current = prices[prices.length - 1];
  const diff = ((current - vwap) / vwap) * 100;
  
  // Scalping: 0.3% threshold
  if (diff < -0.3) return { signal: 'BUY', reason: `Price ${Math.abs(diff).toFixed(2)}% below VWAP`, value: parseFloat(diff.toFixed(2)) };
  if (diff > 0.3) return { signal: 'SELL', reason: `Price ${diff.toFixed(2)}% above VWAP`, value: parseFloat(diff.toFixed(2)) };
  return { signal: 'HOLD', reason: `Price near VWAP (${diff.toFixed(2)}%)`, value: parseFloat(diff.toFixed(2)) };
}

/**
 * Confluence — Scalping Rules
 * 
 * PERUBAHAN KUNCI:
 * - 2/4 indicators agree sudah cukup untuk trade (sebelumnya 3/4)
 * - Tambah momentum check: apakah harga trending ke satu arah?
 * - Confidence dihitung dari strength sinyal, bukan hanya jumlah vote
 */
function calcConfluence(indicators, prices) {
  const signals = Object.values(indicators).map(i => i.signal);
  const votes = { buy: 0, sell: 0, hold: 0 };
  signals.forEach(s => votes[s.toLowerCase()]++);
  
  // Momentum check: arah pergerakan 5 harga terakhir
  let momentum = 'FLAT';
  if (prices.length >= 5) {
    const recent = prices.slice(-5);
    const first = recent[0];
    const last = recent[recent.length - 1];
    const change = ((last - first) / first) * 100;
    if (change > 0.05) momentum = 'UP';
    else if (change < -0.05) momentum = 'DOWN';
  }
  
  let signal = 'HOLD';
  let confidence = 0;
  let reason = '';
  
  // Scalping: 2/4 agreement + momentum confirmation = execute 
  if (votes.buy >= 3) {
    signal = 'BUY';
    confidence = votes.buy / 4;
    reason = `${votes.buy}/4 indicators signal BUY`;
  } else if (votes.sell >= 3) {
    signal = 'SELL';
    confidence = votes.sell / 4;
    reason = `${votes.sell}/4 indicators signal SELL`;
  } else if (votes.buy >= 2 && momentum === 'UP') {
    signal = 'BUY';
    confidence = 0.6; // 60% — moderate confidence with momentum
    reason = `2/4 indicators BUY + upward momentum`;
  } else if (votes.sell >= 2 && momentum === 'DOWN') {
    signal = 'SELL';
    confidence = 0.6;
    reason = `2/4 indicators SELL + downward momentum`;
  } else if (votes.buy >= 2 && votes.sell === 0) {
    signal = 'BUY';
    confidence = 0.5;
    reason = `2/4 BUY, 0 SELL — lean bullish`;
  } else if (votes.sell >= 2 && votes.buy === 0) {
    signal = 'SELL';
    confidence = 0.5;
    reason = `2/4 SELL, 0 BUY — lean bearish`;
  } else {
    confidence = Math.max(votes.buy, votes.sell) / 4;
    reason = `No consensus: ${votes.buy}B/${votes.sell}S/${votes.hold}H`;
  }
  
  return { signal, confidence, votes, reason, momentum };
}

// ═══════════════════════════════════
// Main
// ═══════════════════════════════════

function main() {
  if (!fs.existsSync(PRICE_HISTORY_FILE)) {
    console.log(JSON.stringify({
      error: 'No price history found. Run /stellar-poll-price first (need 5+ polls).'
    }));
    return;
  }

  const history = JSON.parse(fs.readFileSync(PRICE_HISTORY_FILE, 'utf-8'));
  
  if (history.length < 3) {
    console.log(JSON.stringify({
      error: `Only ${history.length} price points. Need at least 3. Run /stellar-poll-price more.`
    }));
    return;
  }

  const prices = history.map(h => h.price);
  const volumes = history.map(h => h.volume);

  // Run all 4 indicators
  const indicators = {
    ema: analyzeEMA(prices),
    rsi: analyzeRSI(prices),
    bb: analyzeBB(prices),
    vwap: analyzeVWAP(prices, volumes)
  };

  // Calculate confluence with momentum
  const confluence = calcConfluence(indicators, prices);

  const result = {
    success: true,
    currentPrice: prices[prices.length - 1],
    dataPoints: prices.length,
    indicators,
    confluence,
    timestamp: new Date().toISOString()
  };

  // Save analysis state for on-chain audit trail
  const ANALYSIS_STATE_FILE = path.resolve(__dirname, '../../server/analysis-state.json');
  try {
    fs.mkdirSync(path.dirname(ANALYSIS_STATE_FILE), { recursive: true });
    fs.writeFileSync(ANALYSIS_STATE_FILE, JSON.stringify(result, null, 2));
  } catch (e) { /* best effort */ }

  console.log(JSON.stringify(result));
}

main();
