/**
 * run-analysis.js
 * ================
 * V3: Professional Trading Engine — Smart Money Concepts
 * 
 * STRATEGI: Adaptive Mean-Reversion with Phase Detection
 * ========================================================
 * 
 * KONSEP INTI (seperti trader profesional 15+ tahun):
 * 
 * 1. PHASE DETECTION (Wyckoff Method)
 *    - Deteksi apakah market di fase ACCUMULATION, MARKUP, atau DISTRIBUTION
 *    - Gunakan price position relatif terhadap moving average
 * 
 * 2. KEY LEVELS (Support & Resistance)
 *    - Support: Local minimum dari 30 data terakhir
 *    - Resistance: Local maximum dari 30 data terakhir  
 *    - Mean: SMA20 sebagai gravitational anchor
 * 
 * 3. ENTRY RULES — Hanya masuk di HIGH-PROBABILITY zones:
 *    - BUY: Harga di bawah SMA20 + RSI oversold + dekat support
 *    - SELL: Harga di atas SMA20 + RSI overbought + dekat resistance
 * 
 * 4. EXIT RULES — Profit-target based:
 *    - Take Profit: +2% dari entry (atau di resistance/support)
 *    - Stop Loss: -1.5% dari entry
 *    - Risk:Reward = 1:1.33 minimum
 * 
 * 5. POSITION SIZING:
 *    - Confidence 100% (4/4) → 200 XLM
 *    - Confidence 75% (3/4) → 100 XLM
 *    - Less → NO TRADE
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PRICE_HISTORY_FILE = path.resolve(__dirname, '../../server/price-history.json');
const TRADE_STATE_FILE = path.resolve(__dirname, '../../server/trade-state.json');

// ═══════════════════════════════════════
// UTILITY: Statistical Functions
// ═══════════════════════════════════════

function calcSMA(prices, period) {
  if (prices.length < period) return prices.reduce((a,b) => a+b, 0) / prices.length;
  const slice = prices.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function calcEMA(prices, period) {
  if (prices.length < period) return prices[prices.length - 1];
  const k = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
  }
  return ema;
}

function calcRSI(prices, period = 8) {
  if (prices.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = prices.length - period; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }
  if (losses === 0) return 100;
  const rs = (gains / period) / (losses / period);
  return 100 - (100 / (1 + rs));
}

function calcBollingerBands(prices, period = 20, multiplier = 2) {
  const p = Math.min(period, prices.length);
  const slice = prices.slice(-p);
  const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
  const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / slice.length;
  const std = Math.sqrt(variance);
  return { upper: mean + multiplier * std, middle: mean, lower: mean - multiplier * std, std };
}

function findSupport(prices, lookback = 30) {
  const slice = prices.slice(-Math.min(lookback, prices.length));
  return Math.min(...slice);
}

function findResistance(prices, lookback = 30) {
  const slice = prices.slice(-Math.min(lookback, prices.length));
  return Math.max(...slice);
}

// ═══════════════════════════════════════
// INDICATOR 1: EMA Cross (Trend Direction)
// ═══════════════════════════════════════
function analyzeEMA(prices) {
  if (prices.length < 15) return { signal: 'HOLD', reason: 'Insufficient data', value: null };
  const emaFast = calcEMA(prices, 5);
  const emaSlow = calcEMA(prices, 15);
  const diff = ((emaFast - emaSlow) / emaSlow) * 100;
  
  if (diff > 0.15) return { signal: 'BUY', reason: `EMA5 > EMA15 by ${diff.toFixed(3)}%`, value: parseFloat(diff.toFixed(3)) };
  if (diff < -0.15) return { signal: 'SELL', reason: `EMA5 < EMA15 by ${Math.abs(diff).toFixed(3)}%`, value: parseFloat(diff.toFixed(3)) };
  return { signal: 'HOLD', reason: `EMAs converged (${diff.toFixed(3)}%)`, value: parseFloat(diff.toFixed(3)) };
}

// ═══════════════════════════════════════
// INDICATOR 2: RSI (Momentum Extremes)
// ═══════════════════════════════════════
function analyzeRSI(prices) {
  const rsi = calcRSI(prices, 8);
  if (rsi < 35) return { signal: 'BUY', reason: `RSI ${rsi.toFixed(1)} — oversold`, value: parseFloat(rsi.toFixed(1)) };
  if (rsi > 65) return { signal: 'SELL', reason: `RSI ${rsi.toFixed(1)} — overbought`, value: parseFloat(rsi.toFixed(1)) };
  return { signal: 'HOLD', reason: `RSI ${rsi.toFixed(1)} — neutral`, value: parseFloat(rsi.toFixed(1)) };
}

// ═══════════════════════════════════════
// INDICATOR 3: Bollinger Bands (Volatility Extremes)
// ═══════════════════════════════════════
function analyzeBB(prices) {
  if (prices.length < 10) return { signal: 'HOLD', reason: 'Insufficient data', value: null };
  const bb = calcBollingerBands(prices, 20, 2.0);
  const current = prices[prices.length - 1];
  const position = bb.std > 0 ? ((current - bb.lower) / (bb.upper - bb.lower)) * 100 : 50;
  
  if (current <= bb.lower) return { signal: 'BUY', reason: `At lower BB (${position.toFixed(0)}%)`, value: parseFloat(position.toFixed(1)) };
  if (current >= bb.upper) return { signal: 'SELL', reason: `At upper BB (${position.toFixed(0)}%)`, value: parseFloat(position.toFixed(1)) };
  return { signal: 'HOLD', reason: `Within bands (${position.toFixed(0)}%)`, value: parseFloat(position.toFixed(1)) };
}

// ═══════════════════════════════════════
// INDICATOR 4: Price vs SMA20 (Mean Reversion)
// ═══════════════════════════════════════
function analyzeMeanReversion(prices) {
  if (prices.length < 5) return { signal: 'HOLD', reason: 'Insufficient data', value: null };
  const sma = calcSMA(prices, 20);
  const current = prices[prices.length - 1];
  const deviation = ((current - sma) / sma) * 100;
  
  // Price significantly below mean = BUY opportunity (reversion up)
  if (deviation < -2.0) return { signal: 'BUY', reason: `${Math.abs(deviation).toFixed(2)}% below SMA20 — undervalued`, value: parseFloat(deviation.toFixed(2)) };
  // Price significantly above mean = SELL opportunity (reversion down)
  if (deviation > 2.0) return { signal: 'SELL', reason: `${deviation.toFixed(2)}% above SMA20 — overvalued`, value: parseFloat(deviation.toFixed(2)) };
  return { signal: 'HOLD', reason: `Near SMA20 (${deviation.toFixed(2)}%)`, value: parseFloat(deviation.toFixed(2)) };
}

// ═══════════════════════════════════════
// PHASE DETECTION (Wyckoff Simplified)
// ═══════════════════════════════════════
function detectPhase(prices) {
  if (prices.length < 15) return { phase: 'UNKNOWN', momentum: 0 };
  
  const sma20 = calcSMA(prices, 20);
  const current = prices[prices.length - 1];
  const rsi = calcRSI(prices, 8);
  
  // Short-term momentum (5 ticks)
  const recent5 = prices.slice(-5);
  const momentum5 = ((recent5[recent5.length - 1] - recent5[0]) / recent5[0]) * 100;
  
  // Medium-term momentum (15 ticks) 
  const recent15 = prices.slice(-15);
  const momentum15 = ((recent15[recent15.length - 1] - recent15[0]) / recent15[0]) * 100;
  
  let phase;
  if (current < sma20 && rsi < 40 && momentum5 < -0.5) {
    phase = 'ACCUMULATION'; // Price dropping, getting oversold → BUY ZONE
  } else if (current > sma20 && momentum5 > 1.0 && momentum15 > 0) {
    phase = 'MARKUP'; // Strong uptrend → HOLD or BUY on dips
  } else if (current > sma20 && rsi > 60 && Math.abs(momentum5) < 0.5) {
    phase = 'DISTRIBUTION'; // Price high and stalling → SELL ZONE
  } else if (current > sma20 && momentum5 < -0.5) {
    phase = 'MARKDOWN'; // Starting to drop from high → SELL if haven't
  } else {
    phase = 'RANGING'; // No clear direction
  }
  
  return { phase, momentum5, momentum15 };
}

// ═══════════════════════════════════════
// CONFLUENCE ENGINE V3 — Professional
// ═══════════════════════════════════════
function calcConfluence(indicators, prices) {
  const signals = Object.values(indicators).map(i => i.signal);
  const votes = { buy: 0, sell: 0, hold: 0 };
  signals.forEach(s => votes[s.toLowerCase()]++);
  
  // Market context
  const phaseInfo = detectPhase(prices);
  const current = prices[prices.length - 1];
  const support = findSupport(prices, 30);
  const resistance = findResistance(prices, 30);
  const sma20 = calcSMA(prices, 20);
  
  // Distance to key levels
  const distToSupport = ((current - support) / support) * 100;
  const distToResistance = ((resistance - current) / current) * 100;
  
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
  let positionSize = 0; // XLM amount to trade
  
  // ═══════════════════════════════════════
  // DECISION TREE
  // ═══════════════════════════════════════
  
  if (currentPosition) {
    // ═══ HAVE POSITION — Manage Exit ═══
    const entry = currentPosition.entryPrice;
    const side = currentPosition.side;
    
    if (side === 'BUY') {
      const pnlPct = ((current - entry) / entry) * 100;
      
      // Take Profit: +2% or at resistance
      if (pnlPct >= 2.0) {
        signal = 'SELL'; confidence = 0.95; positionSize = currentPosition.amount;
        reason = `🎯 TAKE PROFIT: +${pnlPct.toFixed(2)}% (target +2%)`;
      }
      // Near resistance with profit 
      else if (pnlPct > 0.5 && distToResistance < 0.5) {
        signal = 'SELL'; confidence = 0.85; positionSize = currentPosition.amount;
        reason = `📊 Near resistance with +${pnlPct.toFixed(2)}% profit`;
      }
      // Indicators flip + profit
      else if (pnlPct > 0.3 && votes.sell >= 3) {
        signal = 'SELL'; confidence = 0.8; positionSize = currentPosition.amount;
        reason = `📉 ${votes.sell}/4 SELL + profit +${pnlPct.toFixed(2)}%`;
      }
      // Stop Loss: -1.5%
      else if (pnlPct <= -1.5) {
        signal = 'SELL'; confidence = 0.95; positionSize = currentPosition.amount;
        reason = `🛑 STOP LOSS: ${pnlPct.toFixed(2)}% (limit -1.5%)`;
      }
      // Hold
      else {
        reason = `📈 Holding BUY — P&L: ${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}% | TP: +2.0% | SL: -1.5%`;
      }
    }
    else if (side === 'SELL') {
      const pnlPct = ((entry - current) / entry) * 100;
      
      // Take Profit: +2%
      if (pnlPct >= 2.0) {
        signal = 'BUY'; confidence = 0.95; positionSize = currentPosition.amount;
        reason = `🎯 TAKE PROFIT: +${pnlPct.toFixed(2)}% (target +2%)`;
      }
      // Near support with profit
      else if (pnlPct > 0.5 && distToSupport < 0.5) {
        signal = 'BUY'; confidence = 0.85; positionSize = currentPosition.amount;
        reason = `📊 Near support with +${pnlPct.toFixed(2)}% profit`;
      }
      // Indicators flip + profit
      else if (pnlPct > 0.3 && votes.buy >= 3) {
        signal = 'BUY'; confidence = 0.8; positionSize = currentPosition.amount;
        reason = `📈 ${votes.buy}/4 BUY + profit +${pnlPct.toFixed(2)}%`;
      }
      // Stop Loss: -1.5%
      else if (pnlPct <= -1.5) {
        signal = 'BUY'; confidence = 0.95; positionSize = currentPosition.amount;
        reason = `🛑 STOP LOSS: ${pnlPct.toFixed(2)}% (limit -1.5%)`;
      }
      else {
        reason = `📉 Holding SELL — P&L: ${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}% | TP: +2.0% | SL: -1.5%`;
      }
    }
  } else {
    // ═══ NO POSITION — Look for Entry ═══
    
    // IDEAL BUY: Price below SMA, near support, multiple indicators agree
    if (votes.buy >= 3 && (phaseInfo.phase === 'ACCUMULATION' || current < sma20)) {
      signal = 'BUY';
      confidence = votes.buy === 4 ? 1.0 : 0.75;
      positionSize = votes.buy === 4 ? 200 : 100;
      reason = `${votes.buy}/4 BUY in ${phaseInfo.phase} | Near support ($${support.toFixed(5)})`;
    }
    // IDEAL SELL: Price above SMA, near resistance, multiple indicators agree
    else if (votes.sell >= 3 && (phaseInfo.phase === 'DISTRIBUTION' || current > sma20)) {
      signal = 'SELL';
      confidence = votes.sell === 4 ? 1.0 : 0.75;
      positionSize = votes.sell === 4 ? 200 : 100;
      reason = `${votes.sell}/4 SELL in ${phaseInfo.phase} | Near resistance ($${resistance.toFixed(5)})`;
    }
    // No clear setup
    else {
      confidence = Math.max(votes.buy, votes.sell) / 4;
      reason = `⏳ ${phaseInfo.phase}: ${votes.buy}B/${votes.sell}S/${votes.hold}H — waiting for setup`;
    }
  }
  
  return {
    signal, confidence, votes, reason, positionSize,
    phase: phaseInfo.phase,
    keyLevels: {
      support: parseFloat(support.toFixed(5)),
      resistance: parseFloat(resistance.toFixed(5)),
      sma20: parseFloat(sma20.toFixed(5)),
      current: parseFloat(current.toFixed(5))
    },
    risk: currentPosition ? undefined : {
      entry: current.toFixed(5),
      stopLoss: signal === 'BUY' ? (current * 0.985).toFixed(5) : (current * 1.015).toFixed(5),
      takeProfit: signal === 'BUY' ? (current * 1.02).toFixed(5) : (current * 0.98).toFixed(5),
      riskReward: '1:1.33'
    },
    hasPosition: !!currentPosition
  };
}

// ═══════════════════════════════════════
// Main
// ═══════════════════════════════════════
function main() {
  if (!fs.existsSync(PRICE_HISTORY_FILE)) {
    console.log(JSON.stringify({ error: 'No price history. Run /stellar-poll-price first.' }));
    return;
  }

  const history = JSON.parse(fs.readFileSync(PRICE_HISTORY_FILE, 'utf-8'));
  if (history.length < 5) {
    console.log(JSON.stringify({ error: `Only ${history.length} data points. Need 5+.` }));
    return;
  }

  const prices = history.map(h => h.price);

  // Run all 4 indicators
  const indicators = {
    ema: analyzeEMA(prices),
    rsi: analyzeRSI(prices),
    bb: analyzeBB(prices),
    meanReversion: analyzeMeanReversion(prices) // Replaced VWAP with mean-reversion
  };

  const confluence = calcConfluence(indicators, prices);

  const result = {
    success: true,
    currentPrice: prices[prices.length - 1],
    dataPoints: prices.length,
    indicators,
    confluence,
    timestamp: new Date().toISOString()
  };

  // Save for on-chain audit
  const ANALYSIS_STATE_FILE = path.resolve(__dirname, '../../server/analysis-state.json');
  try {
    fs.writeFileSync(ANALYSIS_STATE_FILE, JSON.stringify(result, null, 2));
  } catch (e) { /* best effort */ }

  console.log(JSON.stringify(result));
}

main();
