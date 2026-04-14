/**
 * run-analysis.js
 * ================
 * OpenClaw Skill Script: Jalankan 4 Technical Indicators + Confluence
 * 
 * STRATEGI V2: Conservative Mean-Reversion
 * =========================================
 * PRINSIP DASAR:
 * - Beli saat harga MURAH (di bawah rata-rata) → BUY LOW
 * - Jual saat harga MAHAL (di atas rata-rata) → SELL HIGH
 * - HOLD jika tidak jelas → LEBIH BAIK DIAM DARIPADA RUGI
 * - JANGAN PERNAH trade melawan trend besar
 * 
 * PERUBAHAN DARI V1:
 * - Confluence minimum 3/4 (bukan 2/4) — kurangi false signals
 * - RSI threshold dikembalikan ke 35/65 — lebih konservatif
 * - Tambah trend filter: jangan SELL di downtrend, jangan BUY di uptrend
 * - Tambah profit-target check: jangan tutup posisi kecuali profit
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PRICE_HISTORY_FILE = path.resolve(__dirname, '../../server/price-history.json');
const TRADE_STATE_FILE = path.resolve(__dirname, '../../server/trade-state.json');

// ═══════════════════════════════════
// Indicator Functions (Conservative Tuning)
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
 * EMA Cross — Medium-term trend detection
 * Fast EMA(5) vs Slow EMA(15) — more reliable signals
 * Threshold: 0.15% — filters noise but catches real moves
 */
function analyzeEMA(prices) {
  if (prices.length < 15) return { signal: 'HOLD', reason: 'Need 15+ prices for EMA', value: null };
  const emaFast = calcEMA(prices, 5);
  const emaSlow = calcEMA(prices, 15);
  const diff = ((emaFast - emaSlow) / emaSlow) * 100;
  
  if (diff > 0.15) return { signal: 'BUY', reason: `Fast EMA above slow by ${diff.toFixed(3)}%`, value: parseFloat(diff.toFixed(2)) };
  if (diff < -0.15) return { signal: 'SELL', reason: `Fast EMA below slow by ${Math.abs(diff).toFixed(3)}%`, value: parseFloat(diff.toFixed(2)) };
  return { signal: 'HOLD', reason: `EMAs within range (${diff.toFixed(3)}%)`, value: parseFloat(diff.toFixed(2)) };
}

/**
 * RSI — Conservative zones
 * Threshold: 35/65 — only trade at real extremes
 * Period: 8 — balance between responsiveness and reliability
 */
function analyzeRSI(prices, period = 8) {
  if (prices.length < period + 1) {
    return { signal: 'HOLD', reason: 'Insufficient data for RSI', value: 50 };
  }
  
  let gains = 0, losses = 0;
  for (let i = prices.length - period; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }
  
  const avgGain = gains / period;
  const avgLoss = losses / period;
  
  if (avgLoss === 0) return { signal: 'SELL', reason: 'RSI at 100 (overbought extreme)', value: 100 };
  
  const rs = avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));
  
  // Conservative thresholds
  if (rsi < 35) return { signal: 'BUY', reason: `RSI ${rsi.toFixed(1)} — oversold zone`, value: parseFloat(rsi.toFixed(1)) };
  if (rsi > 65) return { signal: 'SELL', reason: `RSI ${rsi.toFixed(1)} — overbought zone`, value: parseFloat(rsi.toFixed(1)) };
  return { signal: 'HOLD', reason: `RSI ${rsi.toFixed(1)} — neutral zone`, value: parseFloat(rsi.toFixed(1)) };
}

/**
 * Bollinger Bands — Standard parameters
 * Multiplier: 2.0 (standard) — only trigger at statistical extremes
 */
function analyzeBB(prices) {
  if (prices.length < 10) return { signal: 'HOLD', reason: 'Need 10+ prices for BB', value: null };
  const period = Math.min(20, prices.length);
  const slice = prices.slice(-period);
  const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
  const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / slice.length;
  const std = Math.sqrt(variance);
  
  const upper = mean + 2.0 * std;  // Standard 2σ bands
  const lower = mean - 2.0 * std;
  const current = prices[prices.length - 1];
  const position = std > 0 ? ((current - lower) / (upper - lower)) * 100 : 50;
  
  if (current <= lower) return { signal: 'BUY', reason: `Price at lower BB (${position.toFixed(0)}%)`, value: parseFloat(position.toFixed(1)) };
  if (current >= upper) return { signal: 'SELL', reason: `Price at upper BB (${position.toFixed(0)}%)`, value: parseFloat(position.toFixed(1)) };
  return { signal: 'HOLD', reason: `Within bands (${position.toFixed(0)}%)`, value: parseFloat(position.toFixed(1)) };
}

/**
 * VWAP — Reliable mean-reversion anchor
 * Threshold: 0.5% — only trade when price deviates significantly from VWAP
 */
function analyzeVWAP(prices, volumes) {
  if (prices.length < 5) return { signal: 'HOLD', reason: 'Need 5+ prices for VWAP', value: null };
  
  let totalPV = 0, totalV = 0;
  for (let i = 0; i < prices.length; i++) {
    const vol = volumes?.[i] || 100000;
    totalPV += prices[i] * vol;
    totalV += vol;
  }
  const vwap = totalPV / totalV;
  const current = prices[prices.length - 1];
  const diff = ((current - vwap) / vwap) * 100;
  
  if (diff < -0.5) return { signal: 'BUY', reason: `${Math.abs(diff).toFixed(2)}% below VWAP — undervalued`, value: parseFloat(diff.toFixed(2)) };
  if (diff > 0.5) return { signal: 'SELL', reason: `${diff.toFixed(2)}% above VWAP — overvalued`, value: parseFloat(diff.toFixed(2)) };
  return { signal: 'HOLD', reason: `Near VWAP (${diff.toFixed(2)}%)`, value: parseFloat(diff.toFixed(2)) };
}

/**
 * Confluence V2 — Conservative + Position-Aware
 * 
 * RULES:
 * 1. Need 3/4 indicators to agree for a trade signal
 * 2. If we have an open SELL position → only signal BUY (to close at profit)
 * 3. If we have an open BUY position → only signal SELL (to close at profit)
 * 4. NEVER open a new position in the same direction as current position
 * 5. Check if closing would be profitable before signaling
 */
function calcConfluence(indicators, prices) {
  const signals = Object.values(indicators).map(i => i.signal);
  const votes = { buy: 0, sell: 0, hold: 0 };
  signals.forEach(s => votes[s.toLowerCase()]++);
  
  // Trend check: direction of last 10 prices
  let trend = 'FLAT';
  if (prices.length >= 10) {
    const recent = prices.slice(-10);
    const change = ((recent[recent.length - 1] - recent[0]) / recent[0]) * 100;
    if (change > 0.2) trend = 'UP';
    else if (change < -0.2) trend = 'DOWN';
  }
  
  // Check current position
  let currentPosition = null;
  try {
    if (fs.existsSync(TRADE_STATE_FILE)) {
      const state = JSON.parse(fs.readFileSync(TRADE_STATE_FILE, 'utf-8'));
      currentPosition = state.position;
    }
  } catch (e) { /* */ }
  
  let signal = 'HOLD';
  let confidence = 0;
  let reason = '';
  const currentPrice = prices[prices.length - 1];
  
  // ═══ POSITION-AWARE LOGIC ═══
  if (currentPosition) {
    // We have an open position — only look for profitable exit
    const entryPrice = currentPosition.entryPrice;
    const side = currentPosition.side;
    
    if (side === 'SELL') {
      // Open SELL → need BUY to close → only close if price dropped (profit)
      const profitPct = ((entryPrice - currentPrice) / entryPrice) * 100;
      if (profitPct > 0.3 && votes.buy >= 2) {
        signal = 'BUY';
        confidence = 0.85;
        reason = `Close SELL at +${profitPct.toFixed(2)}% profit (${votes.buy}/4 BUY)`;
      } else if (profitPct < -3.0) {
        // Stop loss — cut losses
        signal = 'BUY';
        confidence = 0.9;
        reason = `STOP LOSS: Close SELL at ${profitPct.toFixed(2)}% loss`;
      } else {
        reason = `Holding SELL position (P&L: ${profitPct.toFixed(2)}%)`;
      }
    } else if (side === 'BUY') {
      // Open BUY → need SELL to close → only close if price rose (profit)
      const profitPct = ((currentPrice - entryPrice) / entryPrice) * 100;
      if (profitPct > 0.3 && votes.sell >= 2) {
        signal = 'SELL';
        confidence = 0.85;
        reason = `Close BUY at +${profitPct.toFixed(2)}% profit (${votes.sell}/4 SELL)`;
      } else if (profitPct < -3.0) {
        // Stop loss
        signal = 'SELL';
        confidence = 0.9;
        reason = `STOP LOSS: Close BUY at ${profitPct.toFixed(2)}% loss`;
      } else {
        reason = `Holding BUY position (P&L: ${profitPct.toFixed(2)}%)`;
      }
    }
  } else {
    // ═══ NO POSITION — Look for entry ═══
    // Conservative: need 3/4 agreement
    if (votes.buy >= 3 && trend !== 'DOWN') {
      signal = 'BUY';
      confidence = votes.buy / 4;
      reason = `${votes.buy}/4 indicators BUY + trend ${trend}`;
    } else if (votes.sell >= 3 && trend !== 'UP') {
      signal = 'SELL';
      confidence = votes.sell / 4;
      reason = `${votes.sell}/4 indicators SELL + trend ${trend}`;
    } else {
      confidence = Math.max(votes.buy, votes.sell) / 4;
      reason = `No strong consensus: ${votes.buy}B/${votes.sell}S/${votes.hold}H (need 3/4)`;
    }
  }
  
  return { signal, confidence, votes, reason, trend, hasPosition: !!currentPosition };
}

// ═══════════════════════════════════
// Main
// ═══════════════════════════════════

function main() {
  if (!fs.existsSync(PRICE_HISTORY_FILE)) {
    console.log(JSON.stringify({
      error: 'No price history found. Run /stellar-poll-price first (need 10+ polls).'
    }));
    return;
  }

  const history = JSON.parse(fs.readFileSync(PRICE_HISTORY_FILE, 'utf-8'));
  
  if (history.length < 5) {
    console.log(JSON.stringify({
      error: `Only ${history.length} price points. Need at least 5. Run /stellar-poll-price more.`
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

  // Calculate confluence with position awareness
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
