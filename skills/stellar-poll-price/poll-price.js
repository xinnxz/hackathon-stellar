/**
 * poll-price.js
 * ==============
 * OpenClaw Skill Script: Bayar MPP → Dapatkan Market Data
 * 
 * PENJELASAN:
 * Script ini menghubungi MPP Market Data Server (services/market-data/server.js)
 * dan membayar 0.01 USDC untuk mendapatkan harga XLM/USDC terkini.
 * 
 * Flow:
 * 1. Kirim GET request ke MPP server /price endpoint
 * 2. Server mengembalikan data harga + informasi pembayaran
 * 3. Update budget tracker
 * 4. Simpan harga ke price history file (untuk indikator)
 * 5. Output JSON ke stdout
 * 
 * Budget tracking disimpan ke file agar persisten antar skill calls.
 */
import { loadEnv } from '../env-loader.js';
loadEnv();
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MPP_URL = process.env.MPP_SERVER_URL || 'http://localhost:3002';
const BUDGET_FILE = path.resolve(__dirname, '../../server/budget-state.json');
const PRICE_HISTORY_FILE = path.resolve(__dirname, '../../server/price-history.json');
const BUDGET_LIMIT = parseFloat(process.env.AGENT_BUDGET_USDC || '1.00');

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

function loadPriceHistory() {
  try {
    if (fs.existsSync(PRICE_HISTORY_FILE)) {
      return JSON.parse(fs.readFileSync(PRICE_HISTORY_FILE, 'utf-8'));
    }
  } catch (e) { /* */ }
  return [];
}

function savePriceHistory(history) {
  fs.writeFileSync(PRICE_HISTORY_FILE, JSON.stringify(history));
}

async function main() {
  const budget = loadBudget();

  // Check budget
  if (budget.remaining < 0.01) {
    console.log(JSON.stringify({
      error: 'Intel budget depleted!',
      budget
    }));
    return;
  }

  try {
    const res = await fetch(`${MPP_URL}/price`);
    if (!res.ok) throw new Error(`MPP server error: ${res.status}`);
    const data = await res.json();

    // Update budget
    const cost = 0.01;
    budget.spent = parseFloat((budget.spent + cost).toFixed(4));
    budget.remaining = parseFloat((budget.total - budget.spent).toFixed(4));
    budget.percentUsed = parseFloat(((budget.spent / budget.total) * 100).toFixed(1));
    budget.payments.push({
      type: 'MPP',
      amount: cost,
      service: 'price-poll',
      timestamp: new Date().toISOString()
    });
    saveBudget(budget);

    // Update price history
    const history = loadPriceHistory();
    if (data.data) {
      history.push({
        price: data.data.price,
        high: data.data.high,
        low: data.data.low,
        volume: data.data.volume,
        timestamp: data.data.timestamp
      });
      // Keep last 50 entries
      if (history.length > 50) history.splice(0, history.length - 50);
      savePriceHistory(history);
    }

    console.log(JSON.stringify({
      success: true,
      payment: {
        protocol: 'MPP Charge',
        amount: cost,
        asset: 'USDC',
        status: 'settled'
      },
      price: data.data?.price,
      high: data.data?.high,
      low: data.data?.low,
      volume: data.data?.volume,
      change_pct: data.data?.change_pct,
      history_length: history.length,
      budget: {
        spent: budget.spent,
        remaining: budget.remaining,
        percentUsed: budget.percentUsed
      }
    }));
  } catch (err) {
    console.log(JSON.stringify({
      error: `MPP poll failed: ${err.message}`,
      hint: 'Make sure MPP server is running: npm run mpp'
    }));
  }
}

main();
