/**
 * get-intel.js
 * =============
 * OpenClaw Skill Script: Bayar x402 → Dapatkan Market Intelligence
 * 
 * PENJELASAN:
 * Script ini menggunakan x402 protocol (HTTP 402 Payment Required)
 * untuk membayar sebuah layanan market intelligence.
 * 
 * x402 Flow:
 * 1. Client request → server returns 402 + payment details
 * 2. Client bayar on-chain → send receipt in header
 * 3. Server verifies payment → returns premium data
 * 
 * Untuk demo/testnet, kita simulasi pembayaran dan gunakan 
 * data dari price history + analisis sederhana sebagai "intelligence".
 * 
 * Di production, ini akan connect ke xlm402.com atau service x402 lainnya.
 */
import { loadEnv } from '../env-loader.js';
loadEnv();
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BUDGET_FILE = path.resolve(__dirname, '../../server/budget-state.json');
const PRICE_HISTORY_FILE = path.resolve(__dirname, '../../server/price-history.json');
const BUDGET_LIMIT = parseFloat(process.env.AGENT_BUDGET_USDC || '1.00');
const XLM402_URL = process.env.XLM402_URL || 'https://xlm402.com';

function loadBudget() {
  try {
    if (fs.existsSync(BUDGET_FILE)) {
      return JSON.parse(fs.readFileSync(BUDGET_FILE, 'utf-8'));
    }
  } catch (e) { /* */ }
  return { total: BUDGET_LIMIT, spent: 0, remaining: BUDGET_LIMIT, percentUsed: 0, payments: [] };
}

function saveBudget(budget) {
  fs.mkdirSync(path.dirname(BUDGET_FILE), { recursive: true });
  fs.writeFileSync(BUDGET_FILE, JSON.stringify(budget, null, 2));
}

function generateIntel(prices) {
  // Analyze trend from price history
  if (prices.length < 3) {
    return {
      sentiment: 'NEUTRAL',
      confidence: 0.3,
      analysis: 'Insufficient data for trend analysis. Need more price polls.',
      recommendation: 'Gather more data before trading.'
    };
  }

  const recent = prices.slice(-5);
  const earlier = prices.slice(-10, -5);
  
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const earlierAvg = earlier.length > 0 
    ? earlier.reduce((a, b) => a + b, 0) / earlier.length 
    : recentAvg;
  
  const trendPct = ((recentAvg - earlierAvg) / earlierAvg) * 100;
  
  // Volatility
  const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
  const variance = prices.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / prices.length;
  const volatility = (Math.sqrt(variance) / mean) * 100;
  
  let sentiment, confidence, analysis, recommendation;
  
  if (trendPct > 2) {
    sentiment = 'BULLISH';
    confidence = Math.min(0.9, 0.5 + trendPct / 10);
    analysis = `Strong uptrend detected: +${trendPct.toFixed(2)}%. Price momentum is positive with ${volatility.toFixed(1)}% volatility.`;
    recommendation = 'Consider BUY positions. Trend momentum favors bulls.';
  } else if (trendPct < -2) {
    sentiment = 'BEARISH';
    confidence = Math.min(0.9, 0.5 + Math.abs(trendPct) / 10);
    analysis = `Downtrend detected: ${trendPct.toFixed(2)}%. Price pressure is negative with ${volatility.toFixed(1)}% volatility.`;
    recommendation = 'Consider SELL positions or wait for reversal signals.';
  } else {
    sentiment = 'NEUTRAL';
    confidence = 0.4;
    analysis = `Sideways market: ${trendPct.toFixed(2)}%. Low directional bias with ${volatility.toFixed(1)}% volatility.`;
    recommendation = 'Wait for clearer signals. Range-bound conditions.';
  }

  return { sentiment, confidence, analysis, recommendation };
}

async function main() {
  const budget = loadBudget();
  const cost = 0.05;

  // Check budget
  if (budget.remaining < cost) {
    console.log(JSON.stringify({
      error: `Insufficient intel budget! Need ${cost} USDC, only ${budget.remaining.toFixed(2)} remaining.`,
      budget
    }));
    return;
  }

  // Load price history for analysis
  let prices = [];
  try {
    if (fs.existsSync(PRICE_HISTORY_FILE)) {
      const history = JSON.parse(fs.readFileSync(PRICE_HISTORY_FILE, 'utf-8'));
      prices = history.map(h => h.price);
    }
  } catch (e) { /* */ }

  // Try real x402 service first (if configured)
  let intel;
  let paymentMethod = 'x402 (simulated testnet)';

  try {
    // Attempt x402 call to xlm402.com
    const res = await fetch(`${XLM402_URL}/api/market-intel`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000)
    });
    
    if (res.status === 402) {
      // Real x402 challenge received — log it
      paymentMethod = 'x402 (402 challenge received from xlm402.com)';
      // For testnet, we simulate the payment and use local analysis
      intel = generateIntel(prices);
    } else if (res.ok) {
      const data = await res.json();
      intel = data;
      paymentMethod = 'x402 (xlm402.com)';
    } else {
      intel = generateIntel(prices);
    }
  } catch (e) {
    // Fallback to local analysis
    intel = generateIntel(prices);
  }

  // Update budget
  budget.spent = parseFloat((budget.spent + cost).toFixed(4));
  budget.remaining = parseFloat((budget.total - budget.spent).toFixed(4));
  budget.percentUsed = parseFloat(((budget.spent / budget.total) * 100).toFixed(1));
  budget.payments.push({
    type: 'x402',
    amount: cost,
    service: 'market-intel',
    method: paymentMethod,
    timestamp: new Date().toISOString()
  });
  saveBudget(budget);

  console.log(JSON.stringify({
    success: true,
    payment: {
      protocol: 'x402',
      amount: cost,
      asset: 'USDC',
      status: 'settled',
      method: paymentMethod
    },
    intel,
    dataPoints: prices.length,
    budget: {
      spent: budget.spent,
      remaining: budget.remaining,
      percentUsed: budget.percentUsed
    }
  }));
}

main();
