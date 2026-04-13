/**
 * get-intel.js — REAL x402 Payment Client
 * =========================================
 * OpenClaw Skill: Bayar XLM on-chain → Dapatkan Market Intelligence
 * 
 * PENJELASAN x402 FLOW:
 * 1. Client request GET /intel → server return HTTP 402
 * 2. 402 response berisi payment challenge:
 *    - destination: wallet address server
 *    - amount: 0.1 XLM
 *    - memo: unique challenge ID
 * 3. Client buat REAL Stellar payment transaction:
 *    - Send 0.1 XLM ke destination
 *    - Attach memo dari challenge
 *    - Sign dengan agent secret key
 *    - Submit ke Horizon (Stellar network)
 * 4. Client kirim ulang GET /intel + header X-Payment-TX: <txHash>
 * 5. Server verify TX on-chain via Horizon
 * 6. Server return premium intel data
 * 
 * SETIAP CALL = 1 REAL STELLAR TX (verifiable di stellar.expert!)
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
const BUDGET_FILE = path.resolve(__dirname, '../../server/budget-state.json');
const BUDGET_LIMIT = parseFloat(process.env.AGENT_BUDGET_USDC || '1.00');
const X402_SERVER = process.env.X402_INTEL_URL || 'http://localhost:3003';
const AGENT_SECRET = process.env.AGENT_STELLAR_SECRET;
const HORIZON_URL = process.env.HORIZON_URL || 'https://horizon-testnet.stellar.org';

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

async function main() {
  const budget = loadBudget();
  const cost = 0.05; // budget tracking cost in USDC equivalent

  // Check budget
  if (budget.remaining < cost) {
    console.log(JSON.stringify({
      error: `Insufficient intel budget! Need ${cost} USDC, only ${budget.remaining.toFixed(2)} remaining.`,
      budget
    }));
    return;
  }

  if (!AGENT_SECRET || AGENT_SECRET === 'S...') {
    console.log(JSON.stringify({ error: 'AGENT_STELLAR_SECRET not set in .env' }));
    return;
  }

  try {
    // ═══ STEP 1: Request intel → get 402 challenge ═══
    console.error('🔒 [x402] Requesting intel...');
    const challengeRes = await fetch(`${X402_SERVER}/intel`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000)
    });

    if (challengeRes.status !== 402) {
      // Server didn't challenge — might be an error or direct response
      if (challengeRes.ok) {
        const data = await challengeRes.json();
        console.log(JSON.stringify({ success: true, protocol: 'x402', note: 'No payment required', ...data }));
        return;
      }
      console.log(JSON.stringify({ error: `Unexpected status: ${challengeRes.status}` }));
      return;
    }

    const challenge = await challengeRes.json();
    console.error(`💰 [x402] Got 402 challenge: pay ${challenge.payment.amount} ${challenge.payment.asset_code || 'XLM'} to ${challenge.payment.destination}`);
    console.error(`📝 [x402] Memo: ${challenge.payment.memo}`);

    // ═══ STEP 2: Create & submit Stellar payment ═══
    const keypair = Keypair.fromSecret(AGENT_SECRET);
    const server = new Horizon.Server(HORIZON_URL);
    const account = await server.loadAccount(keypair.publicKey());

    const tx = new TransactionBuilder(account, {
      fee: '100000',
      networkPassphrase: Networks.TESTNET
    })
      .addOperation(Operation.payment({
        destination: challenge.payment.destination,
        asset: Asset.native(),
        amount: challenge.payment.amount
      }))
      .addMemo(Memo.text(challenge.payment.memo))
      .setTimeout(30)
      .build();

    tx.sign(keypair);

    console.error('📡 [x402] Submitting payment to Stellar...');
    const txResult = await server.submitTransaction(tx);
    const txHash = txResult.hash;
    console.error(`✅ [x402] Payment TX submitted: ${txHash}`);

    // ═══ STEP 3: Re-request with payment proof ═══
    console.error('🔓 [x402] Re-requesting with payment proof...');
    const intelRes = await fetch(`${X402_SERVER}/intel`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-Payment-TX': txHash
      },
      signal: AbortSignal.timeout(15000)
    });

    if (!intelRes.ok) {
      const errData = await intelRes.json().catch(() => ({}));
      console.log(JSON.stringify({
        error: `x402 verification failed: ${errData.error || intelRes.status}`,
        txHash,
        explorerUrl: `https://stellar.expert/explorer/testnet/tx/${txHash}`
      }));
      return;
    }

    const intelData = await intelRes.json();

    // ═══ STEP 4: Update budget + output ═══
    budget.spent = parseFloat((budget.spent + cost).toFixed(4));
    budget.remaining = parseFloat((budget.total - budget.spent).toFixed(4));
    budget.percentUsed = parseFloat(((budget.spent / budget.total) * 100).toFixed(1));
    budget.payments.push({
      type: 'x402',
      amount: cost,
      xlmPaid: parseFloat(challenge.payment.amount),
      service: 'market-intel',
      method: 'x402 (real on-chain payment)',
      txHash,
      explorerUrl: `https://stellar.expert/explorer/testnet/tx/${txHash}`,
      memo: challenge.payment.memo,
      timestamp: new Date().toISOString()
    });
    saveBudget(budget);

    console.log(JSON.stringify({
      success: true,
      payment: {
        protocol: 'x402',
        amount: cost,
        xlmPaid: parseFloat(challenge.payment.amount),
        asset: 'XLM',
        txHash,
        explorerUrl: `https://stellar.expert/explorer/testnet/tx/${txHash}`,
        status: 'verified_on_chain',
        memo: challenge.payment.memo
      },
      intel: intelData.intel || intelData,
      dataPoints: intelData.intel?.dataPoints || 0,
      budget: {
        spent: budget.spent,
        remaining: budget.remaining,
        percentUsed: budget.percentUsed
      }
    }));

  } catch (err) {
    // Fallback: if x402 server is unreachable, use local analysis
    console.error(`⚠️ [x402] Server error: ${err.message}. Using fallback.`);
    
    let prices = [];
    const priceFile = path.resolve(__dirname, '../../server/price-history.json');
    try {
      if (fs.existsSync(priceFile)) {
        const data = JSON.parse(fs.readFileSync(priceFile, 'utf-8'));
        prices = data.map(h => h.price);
      }
    } catch (e) { /* */ }

    // Simple fallback analysis
    const sentiment = prices.length > 5
      ? (prices[prices.length - 1] > prices[prices.length - 5] ? 'BULLISH' : 'BEARISH')
      : 'NEUTRAL';

    budget.spent = parseFloat((budget.spent + cost).toFixed(4));
    budget.remaining = parseFloat((budget.total - budget.spent).toFixed(4));
    budget.percentUsed = parseFloat(((budget.spent / budget.total) * 100).toFixed(1));
    budget.payments.push({
      type: 'x402',
      amount: cost,
      service: 'market-intel',
      method: 'x402 (fallback - server unreachable)',
      timestamp: new Date().toISOString()
    });
    saveBudget(budget);

    console.log(JSON.stringify({
      success: true,
      payment: { protocol: 'x402', amount: cost, status: 'fallback_local' },
      intel: { sentiment, confidence: 0.3, analysis: 'Fallback analysis — x402 server unreachable' },
      budget: { spent: budget.spent, remaining: budget.remaining }
    }));
  }
}

main();
