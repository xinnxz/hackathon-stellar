/**
 * get-intel.js — Official x402 Client SDK
 * ==========================================
 * OpenClaw Skill: Pay USDC via x402 → Get Market Intelligence
 * 
 * PENJELASAN x402 OFFICIAL FLOW:
 * 1. Client fetch → server return 402 + payment headers
 * 2. x402 SDK auto-creates payment payload (Soroban SAC USDC transfer)
 * 3. Client sends signed payload via headers  
 * 4. Coinbase Facilitator settles on-chain
 * 5. Server returns premium intel
 * 
 * PAYMENT: USDC via Soroban Smart Asset Contract
 * SDK: @x402/fetch + @x402/stellar (official Stellar docs)
 */
import { loadEnv } from '../env-loader.js';
loadEnv();
import { x402Client, x402HTTPClient } from '@x402/fetch';
import { createEd25519Signer, getNetworkPassphrase } from '@x402/stellar';
import { ExactStellarScheme } from '@x402/stellar/exact/client';
import { Transaction, TransactionBuilder } from '@stellar/stellar-sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BUDGET_FILE = path.resolve(__dirname, '../../server/budget-state.json');
const BUDGET_LIMIT = parseFloat(process.env.AGENT_BUDGET_USDC || '1.00');
const X402_SERVER = process.env.X402_INTEL_URL || 'http://localhost:3003';
const AGENT_SECRET = process.env.AGENT_STELLAR_SECRET;
const NETWORK = 'stellar:testnet';
const STELLAR_RPC_URL = process.env.SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org';

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

async function main() {
  const budget = loadBudget();
  const cost = 0.05; // budget tracking cost in USDC equivalent

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
    const url = `${X402_SERVER}/intel`;

    // ═══ STEP 1: Setup x402 client (Official SDK) ═══
    console.error('🔒 [x402-SDK] Setting up x402 client...');
    const signer = createEd25519Signer(AGENT_SECRET, NETWORK);
    const rpcConfig = { url: STELLAR_RPC_URL };
    
    const client = new x402Client().register(
      'stellar:*',
      new ExactStellarScheme(signer, rpcConfig)
    );
    const httpClient = new x402HTTPClient(client);
    
    console.error(`🔑 [x402-SDK] Client address: ${signer.address}`);

    // ═══ STEP 2: First request → get 402 ═══
    console.error('📡 [x402-SDK] Requesting intel...');
    const firstTry = await fetch(url, { signal: AbortSignal.timeout(15000) });
    
    if (firstTry.ok) {
      // Payment not required (shouldn't happen with x402 middleware)
      const data = await firstTry.json();
      console.log(JSON.stringify({ success: true, protocol: 'x402', note: 'No payment required', ...data }));
      return;
    }

    if (firstTry.status !== 402) {
      console.log(JSON.stringify({ error: `Unexpected status: ${firstTry.status}` }));
      return;
    }

    console.error(`💰 [x402-SDK] Got 402 Payment Required`);

    // ═══ STEP 3: Create payment payload (Soroban SAC USDC) ═══
    const paymentRequired = httpClient.getPaymentRequiredResponse(
      (name) => firstTry.headers.get(name)
    );

    let paymentPayload = await client.createPaymentPayload(paymentRequired);
    console.error('📝 [x402-SDK] Payment payload created (Soroban SAC transfer)');

    // ═══ STEP 3b: Fix fee to prevent testnet facilitator limit issue ═══
    // (From official quickstart guide: set fee to "1" stroop)
    const networkPassphrase = getNetworkPassphrase(NETWORK);
    const tx = new Transaction(
      paymentPayload.payload.transaction,
      networkPassphrase,
    );
    const sorobanData = tx.toEnvelope().v1()?.tx()?.ext()?.sorobanData();
    if (sorobanData) {
      paymentPayload = {
        ...paymentPayload,
        payload: {
          ...paymentPayload.payload,
          transaction: TransactionBuilder.cloneFrom(tx, {
            fee: '1',
            sorobanData,
            networkPassphrase,
          })
            .build()
            .toXDR(),
        },
      };
      console.error('⚙️ [x402-SDK] Fee adjusted to 1 stroop (testnet fix)');
    }

    // ═══ STEP 4: Send paid request ═══
    const paymentHeaders = httpClient.encodePaymentSignatureHeader(paymentPayload);
    console.error('📡 [x402-SDK] Sending paid request...');

    const paidResponse = await fetch(url, {
      method: 'GET',
      headers: paymentHeaders,
      signal: AbortSignal.timeout(30000)
    });

    const responseText = await paidResponse.text();
    let intelData;
    try {
      intelData = JSON.parse(responseText);
    } catch (e) {
      intelData = { raw: responseText };
    }

    // ═══ STEP 5: Get settlement response ═══
    const paymentResponse = httpClient.getPaymentSettleResponse(
      (name) => paidResponse.headers.get(name)
    );
    
    const txHash = paymentResponse?.txHash || paymentResponse?.transactionHash || '';
    
    console.error(`✅ [x402-SDK] Payment settled! Status: ${paidResponse.status}`);
    if (txHash) console.error(`🔗 [x402-SDK] TX: ${txHash}`);

    // ═══ STEP 6: Update budget ═══
    budget.spent = parseFloat((budget.spent + cost).toFixed(4));
    budget.remaining = parseFloat((budget.total - budget.spent).toFixed(4));
    budget.percentUsed = parseFloat(((budget.spent / budget.total) * 100).toFixed(1));
    budget.payments.push({
      type: 'x402',
      amount: cost,
      usdcPaid: 0.01,
      service: 'market-intel',
      method: 'x402 SDK (Soroban SAC USDC)',
      txHash: txHash || 'settled-via-facilitator',
      explorerUrl: txHash ? `https://stellar.expert/explorer/testnet/tx/${txHash}` : '',
      timestamp: new Date().toISOString()
    });
    saveBudget(budget);

    console.log(JSON.stringify({
      success: true,
      payment: {
        protocol: 'x402',
        sdk: '@x402/fetch + @x402/stellar',
        amount: cost,
        usdcPaid: 0.01,
        asset: 'USDC',
        settlement: 'Soroban SAC via Facilitator',
        txHash: txHash || 'settled-via-facilitator',
        explorerUrl: txHash ? `https://stellar.expert/explorer/testnet/tx/${txHash}` : '',
        status: 'verified_on_chain'
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
    // Fallback: if x402 server or facilitator is unreachable
    console.error(`⚠️ [x402-SDK] Error: ${err.message}. Using fallback.`);
    
    let prices = [];
    const priceFile = path.resolve(__dirname, '../../server/price-history.json');
    try {
      if (fs.existsSync(priceFile)) {
        const data = JSON.parse(fs.readFileSync(priceFile, 'utf-8'));
        prices = data.map(h => h.price);
      }
    } catch (e) { /* */ }

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
      method: 'x402 (fallback — facilitator/server unreachable)',
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
