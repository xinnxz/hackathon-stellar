/**
 * run-analysis.js
 * ================
 * OpenClaw Skill Script: Jalankan 4 Technical Indicators + Confluence
 * 
 * PENJELASAN:
 * Script ini membaca price history yang dikumpulkan dari MPP polls,
 * lalu menjalankan 4 indikator teknikal:
 * 
 * 1. EMA Cross — Exponential Moving Average crossover (fast vs slow)
 * 2. RSI — Relative Strength Index (overbought/oversold)
 * 3. Bollinger Bands — Volatility bands (price position)
 * 4. VWAP — Volume Weighted Average Price
 * 
 * Kemudian hitung "confluence" — berapa banyak indikator setuju.
 * Butuh ≥3 dari 4 setuju untuk generate sinyal trading.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PRICE_HISTORY_FILE = path.resolve(__dirname, '../../server/price-history.json');

// ═══════════════════════════════════
// Indicator Functions (dari server/indicators.js)
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

function analyzeEMA(prices) {
  if (prices.length < 10) return { signal: 'HOLD', reason: 'Need 10+ prices for EMA', value: null };
  const emaFast = calcEMA(prices, 5);
  const emaSlow = calcEMA(prices, 10);
  const diff = ((emaFast - emaSlow) / emaSlow) * 100;
  
  if (diff > 0.3) return { signal: 'BUY', reason: `Fast EMA above slow by ${diff.toFixed(2)}%`, value: parseFloat(diff.toFixed(2)) };
  if (diff < -0.3) return { signal: 'SELL', reason: `Fast EMA below slow by ${Math.abs(diff).toFixed(2)}%`, value: parseFloat(diff.toFixed(2)) };
  return { signal: 'HOLD', reason: `EMAs within range (${diff.toFixed(2)}%)`, value: parseFloat(diff.toFixed(2)) };
}

function analyzeRSI(prices, period = 14) {
  if (prices.length < period + 1) {
    // Use shorter period if not enough data
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
  
  if (rsi < 30) return { signal: 'BUY', reason: `RSI ${rsi.toFixed(1)} — oversold`, value: parseFloat(rsi.toFixed(1)) };
  if (rsi > 70) return { signal: 'SELL', reason: `RSI ${rsi.toFixed(1)} — overbought`, value: parseFloat(rsi.toFixed(1)) };
  return { signal: 'HOLD', reason: `RSI ${rsi.toFixed(1)} — neutral`, value: parseFloat(rsi.toFixed(1)) };
}

function analyzeBB(prices) {
  if (prices.length < 5) return { signal: 'HOLD', reason: 'Need 5+ prices for BB', value: null };
  const period = Math.min(20, prices.length);
  const slice = prices.slice(-period);
  const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
  const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / slice.length;
  const std = Math.sqrt(variance);
  
  const upper = mean + 2 * std;
  const lower = mean - 2 * std;
  const current = prices[prices.length - 1];
  const position = ((current - lower) / (upper - lower)) * 100;
  
  if (current <= lower) return { signal: 'BUY', reason: `Price at lower BB (${position.toFixed(0)}%)`, value: parseFloat(position.toFixed(1)) };
  if (current >= upper) return { signal: 'SELL', reason: `Price at upper BB (${position.toFixed(0)}%)`, value: parseFloat(position.toFixed(1)) };
  return { signal: 'HOLD', reason: `Price within bands (${position.toFixed(0)}%)`, value: parseFloat(position.toFixed(1)) };
}

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
  
  if (diff < -1) return { signal: 'BUY', reason: `Price ${Math.abs(diff).toFixed(2)}% below VWAP`, value: parseFloat(diff.toFixed(2)) };
  if (diff > 1) return { signal: 'SELL', reason: `Price ${diff.toFixed(2)}% above VWAP`, value: parseFloat(diff.toFixed(2)) };
  return { signal: 'HOLD', reason: `Price near VWAP (${diff.toFixed(2)}%)`, value: parseFloat(diff.toFixed(2)) };
}

function calcConfluence(indicators) {
  const signals = Object.values(indicators).map(i => i.signal);
  const votes = { buy: 0, sell: 0, hold: 0 };
  signals.forEach(s => votes[s.toLowerCase()]++);
  
  let signal = 'HOLD';
  let confidence = 0;
  let reason = '';
  
  if (votes.buy >= 3) {
    signal = 'BUY';
    confidence = votes.buy / 4;
    reason = `${votes.buy}/4 indicators signal BUY`;
  } else if (votes.sell >= 3) {
    signal = 'SELL';
    confidence = votes.sell / 4;
    reason = `${votes.sell}/4 indicators signal SELL`;
  } else {
    confidence = Math.max(votes.buy, votes.sell) / 4;
    reason = `No consensus: ${votes.buy}B/${votes.sell}S/${votes.hold}H`;
  }
  
  return { signal, confidence, votes, reason };
}

// ═══════════════════════════════════
// Main
// ═══════════════════════════════════

function main() {
  // Load price history
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

  // Calculate confluence
  const confluence = calcConfluence(indicators);

  console.log(JSON.stringify({
    success: true,
    currentPrice: prices[prices.length - 1],
    dataPoints: prices.length,
    indicators,
    confluence,
    timestamp: new Date().toISOString()
  }));
}

main();
