/**
 * poll-price.js — Official MPP Client SDK
 * ==========================================
 * OpenClaw Skill: Pay USDC via MPP → Get Market Data
 * 
 * PENJELASAN MPP OFFICIAL FLOW:
 * 1. Mppx.create() patches global fetch to auto-handle 402
 * 2. Agent just fetch() the URL normally
 * 3. mppx intercepts 402, builds Soroban SAC transfer, signs, retries
 * 4. Server verifies + broadcasts TX on-chain
 * 5. Data returned transparently
 * 
 * PAYMENT: USDC via Soroban Smart Asset Contract
 * SDK: @stellar/mpp + mppx (official Stellar docs)
 */
import { loadEnv } from '../env-loader.js';
loadEnv();
import { Keypair } from '@stellar/stellar-sdk';
import { Mppx } from 'mppx/client';
import { stellar } from '@stellar/mpp/charge/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MPP_SERVER = process.env.MPP_SERVER_URL || 'http://localhost:3002';
const AGENT_SECRET = process.env.AGENT_STELLAR_SECRET;
const BUDGET_FILE = path.resolve(__dirname, '../../server/budget-state.json');
const PRICE_HISTORY_FILE = path.resolve(__dirname, '../../server/price-history.json');
const BUDGET_LIMIT = parseFloat(process.env.AGENT_BUDGET_USDC || '1.00');

function loadBudget() {
  try {
    if (fs.existsSync(BUDGET_FILE)) return JSON.parse(fs.readFileSync(BUDGET_FILE, 'utf-8'));
  } catch (e) { /* */ }
  return { total: BUDGET_LIMIT, spent: 0, remaining: BUDGET_LIMIT, percentUsed: 0, payments: [] };
}

function saveBudget(budget) {
  fs.mkdirSync(path.dirname(BUDGET_FILE), { recursive: true });
  fs.writeFileSync(BUDGET_FILE, JSON.stringify(budget, null, 2));
}

function loadPriceHistory() {
  try {
    if (fs.existsSync(PRICE_HISTORY_FILE)) return JSON.parse(fs.readFileSync(PRICE_HISTORY_FILE, 'utf-8'));
  } catch (e) { /* */ }
  return [];
}

function savePriceHistory(history) {
  fs.writeFileSync(PRICE_HISTORY_FILE, JSON.stringify(history, null, 2));
}

async function main() {
  const budget = loadBudget();
  const cost = 0.01; // budget cost in USDC equivalent

  if (budget.remaining < cost) {
    console.log(JSON.stringify({
      error: `Budget exhausted! Need ${cost}, only ${budget.remaining.toFixed(2)} remaining.`,
      budget
    }));
    return;
  }

  if (!AGENT_SECRET || AGENT_SECRET === 'S...') {
    console.log(JSON.stringify({ error: 'AGENT_STELLAR_SECRET not set' }));
    return;
  }

  try {
    // ═══ STEP 1: Setup MPP client (Official SDK) ═══
    const keypair = Keypair.fromSecret(AGENT_SECRET);
    console.error(`🔑 [MPP-SDK] Agent wallet: ${keypair.publicKey()}`);

    // Mppx.create() patches global fetch to auto-handle 402!
    Mppx.create({
      methods: [
        stellar.charge({
          keypair,
          mode: 'pull', // server broadcasts the signed TX
          onProgress(event) {
            console.error(`📡 [MPP-SDK] ${event.type}: ${JSON.stringify(event)}`);
          },
        }),
      ],
    });

    // ═══ STEP 2: Just fetch — 402 handled transparently! ═══
    console.error('💳 [MPP-SDK] Requesting price data (auto-payment via SDK)...');
    const response = await fetch(`${MPP_SERVER}/price`, {
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.log(JSON.stringify({ error: `MPP request failed: ${response.status} ${errText}` }));
      return;
    }

    const priceData = await response.json();
    const price = priceData.data?.price || 0;

    console.error(`✅ [MPP-SDK] Price received: $${price} | Payment settled via Soroban SAC`);

    // ═══ STEP 3: Save price history ═══
    const history = loadPriceHistory();
    history.push({
      price,
      timestamp: new Date().toISOString(),
      paid: true,
      usdcPaid: 0.01,
      protocol: 'MPP Charge SDK'
    });
    if (history.length > 100) history.splice(0, history.length - 100);
    savePriceHistory(history);

    // ═══ STEP 4: Update budget ═══
    budget.spent = parseFloat((budget.spent + cost).toFixed(4));
    budget.remaining = parseFloat((budget.total - budget.spent).toFixed(4));
    budget.percentUsed = parseFloat(((budget.spent / budget.total) * 100).toFixed(1));
    budget.payments.push({
      type: 'MPP',
      amount: cost,
      usdcPaid: 0.01,
      service: 'price-poll',
      method: 'MPP SDK (Soroban SAC USDC)',
      timestamp: new Date().toISOString()
    });
    saveBudget(budget);

    console.log(JSON.stringify({
      success: true,
      price,
      change: priceData.data?.change || 0,
      payment: {
        protocol: 'MPP Charge',
        sdk: '@stellar/mpp + mppx',
        usdcPaid: 0.01,
        asset: 'USDC',
        settlement: 'Soroban SAC via server',
        status: 'verified_on_chain'
      },
      history: { count: history.length },
      budget: {
        spent: budget.spent,
        remaining: budget.remaining,
        percentUsed: budget.percentUsed
      }
    }));

  } catch (err) {
    console.error(`❌ [MPP-SDK] Error: ${err.message}`);
    console.log(JSON.stringify({ error: `MPP poll failed: ${err.message}` }));
  }
}

main();
