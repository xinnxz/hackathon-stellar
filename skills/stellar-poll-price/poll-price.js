/**
 * poll-price.js — REAL MPP Payment Client
 * =========================================
 * OpenClaw Skill: Bayar XLM on-chain → Dapatkan Market Data
 * 
 * PENJELASAN MPP FLOW:
 * 1. GET /price → server return 402 + payment invoice
 * 2. Client buat REAL Stellar payment (0.05 XLM)
 * 3. GET /price + header X-Payment-TX: <txHash>
 * 4. Server verify → return price data
 * 
 * SETIAP POLL = 1 REAL STELLAR TX (verifiable on-chain!)
 */
import { loadEnv } from '../env-loader.js';
loadEnv();
import {
  Keypair, Networks, TransactionBuilder, Operation, Memo, Horizon, Asset
} from '@stellar/stellar-sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MPP_SERVER = process.env.MPP_SERVER_URL || 'http://localhost:3002';
const AGENT_SECRET = process.env.AGENT_STELLAR_SECRET;
const HORIZON_URL = process.env.HORIZON_URL || 'https://horizon-testnet.stellar.org';
const BUDGET_FILE = path.resolve(__dirname, '../../server/budget-state.json');
const PRICE_HISTORY_FILE = path.resolve(__dirname, '../../server/price-history.json');
const BUDGET_LIMIT = parseFloat(process.env.AGENT_BUDGET_USDC || '1.00');

function loadBudget() {
  try {
    if (fs.existsSync(BUDGET_FILE))
      return JSON.parse(fs.readFileSync(BUDGET_FILE, 'utf-8'));
  } catch (e) { /* */ }
  return { total: BUDGET_LIMIT, spent: 0, remaining: BUDGET_LIMIT, percentUsed: 0, payments: [] };
}

function saveBudget(budget) {
  fs.mkdirSync(path.dirname(BUDGET_FILE), { recursive: true });
  fs.writeFileSync(BUDGET_FILE, JSON.stringify(budget, null, 2));
}

function loadPriceHistory() {
  try {
    if (fs.existsSync(PRICE_HISTORY_FILE))
      return JSON.parse(fs.readFileSync(PRICE_HISTORY_FILE, 'utf-8'));
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
    // ═══ STEP 1: Request price → get 402 invoice ═══
    console.error('💳 [MPP] Requesting price data...');
    const invoiceRes = await fetch(`${MPP_SERVER}/price`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000)
    });

    if (invoiceRes.status !== 402) {
      if (invoiceRes.ok) {
        // Server gave data without payment (old behavior fallback)
        const data = await invoiceRes.json();
        const price = data.data?.price || data.price;
        if (price) {
          const history = loadPriceHistory();
          history.push({ price, timestamp: new Date().toISOString(), paid: false });
          savePriceHistory(history);
        }
        console.log(JSON.stringify({ success: true, note: 'Free data (no payment required)', ...data }));
        return;
      }
      console.log(JSON.stringify({ error: `Unexpected MPP status: ${invoiceRes.status}` }));
      return;
    }

    const invoice = await invoiceRes.json();
    console.error(`💰 [MPP] Got 402 invoice: pay ${invoice.payment.amount} XLM to ${invoice.payment.destination}`);

    // ═══ STEP 2: Create & submit Stellar payment ═══
    const keypair = Keypair.fromSecret(AGENT_SECRET);
    const server = new Horizon.Server(HORIZON_URL);
    const account = await server.loadAccount(keypair.publicKey());

    const tx = new TransactionBuilder(account, {
      fee: '100000',
      networkPassphrase: Networks.TESTNET
    })
      .addOperation(Operation.payment({
        destination: invoice.payment.destination,
        asset: Asset.native(),
        amount: invoice.payment.amount
      }))
      .addMemo(Memo.text(invoice.payment.memo))
      .setTimeout(30)
      .build();

    tx.sign(keypair);
    
    console.error('📡 [MPP] Submitting payment...');
    const txResult = await server.submitTransaction(tx);
    const txHash = txResult.hash;
    console.error(`✅ [MPP] Payment TX: ${txHash}`);

    // ═══ STEP 3: Re-request with payment proof ═══
    const dataRes = await fetch(`${MPP_SERVER}/price`, {
      headers: {
        'Accept': 'application/json',
        'X-Payment-TX': txHash
      },
      signal: AbortSignal.timeout(15000)
    });

    if (!dataRes.ok) {
      const errData = await dataRes.json().catch(() => ({}));
      console.log(JSON.stringify({
        error: `MPP verification failed: ${errData.error || dataRes.status}`,
        txHash
      }));
      return;
    }

    const priceData = await dataRes.json();
    const price = priceData.data?.price || 0;

    // ═══ STEP 4: Save price history ═══
    const history = loadPriceHistory();
    history.push({
      price,
      timestamp: new Date().toISOString(),
      txHash,
      paid: true,
      xlmPaid: parseFloat(invoice.payment.amount)
    });
    if (history.length > 100) history.splice(0, history.length - 100);
    savePriceHistory(history);

    // ═══ STEP 5: Update budget ═══
    budget.spent = parseFloat((budget.spent + cost).toFixed(4));
    budget.remaining = parseFloat((budget.total - budget.spent).toFixed(4));
    budget.percentUsed = parseFloat(((budget.spent / budget.total) * 100).toFixed(1));
    budget.payments.push({
      type: 'MPP',
      amount: cost,
      xlmPaid: parseFloat(invoice.payment.amount),
      service: 'price-poll',
      method: 'MPP Charge (real on-chain payment)',
      txHash,
      explorerUrl: `https://stellar.expert/explorer/testnet/tx/${txHash}`,
      memo: invoice.payment.memo,
      timestamp: new Date().toISOString()
    });
    saveBudget(budget);

    console.log(JSON.stringify({
      success: true,
      price,
      change: priceData.data?.change || 0,
      payment: {
        protocol: 'MPP Charge',
        xlmPaid: parseFloat(invoice.payment.amount),
        txHash,
        explorerUrl: `https://stellar.expert/explorer/testnet/tx/${txHash}`,
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
    console.error(`❌ [MPP] Error: ${err.message}`);
    console.log(JSON.stringify({ error: `MPP poll failed: ${err.message}` }));
  }
}

main();
