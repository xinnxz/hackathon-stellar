/**
 * MPP Market Data Server — REAL Payment Verification
 * ====================================================
 * 
 * PENJELASAN MPP CHARGE FLOW:
 * MPP (Machine Payments Protocol) mode Charge = bayar per-request.
 * 
 * FLOW REAL:
 * 1. Client GET /price (tanpa payment) → Server return 402 + invoice
 * 2. Client buat Stellar payment TX ke server wallet
 * 3. Client GET /price + header X-Payment-TX: <txHash>
 * 4. Server verify TX on-chain via Horizon API
 * 5. Server return market data
 * 
 * Setiap request = REAL on-chain Stellar transaction!
 * 
 * PORT: 3002
 */
import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getMarketData } from './price-engine.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env
const envPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const k = t.substring(0, eq).trim();
    let v = t.substring(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
      v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  }
}

const PORT = process.env.MPP_PORT || 3002;
const RECIPIENT = process.env.MARKET_DATA_STELLAR_ADDRESS;
const HORIZON_URL = process.env.HORIZON_URL || 'https://horizon-testnet.stellar.org';
const PAYMENT_AMOUNT = '0.05'; // 0.05 XLM per price poll (small for frequent calls)

const app = express();
app.use(cors());
app.use(express.json());

// ═══ State ═══
const verifiedPayments = new Set();
const paymentLog = [];

/**
 * Verify Stellar payment on-chain via Horizon
 */
async function verifyPayment(txHash) {
  try {
    const res = await fetch(`${HORIZON_URL}/transactions/${txHash}`);
    if (!res.ok) return { valid: false, reason: `TX not found: ${res.status}` };
    const tx = await res.json();

    if (!tx.successful) return { valid: false, reason: 'TX failed on-chain' };

    // Check operations
    const opsRes = await fetch(`${HORIZON_URL}/transactions/${txHash}/operations`);
    const opsData = await opsRes.json();
    const ops = opsData._embedded?.records || [];

    let paymentFound = false;
    for (const op of ops) {
      if ((op.type === 'payment' || op.type === 'create_account') && op.to === RECIPIENT) {
        if (parseFloat(op.amount) >= parseFloat(PAYMENT_AMOUNT)) {
          paymentFound = true;
        }
      }
    }

    if (!paymentFound) return { valid: false, reason: 'Payment to server not found in TX' };

    return { valid: true, tx };
  } catch (err) {
    return { valid: false, reason: `Verification error: ${err.message}` };
  }
}

/**
 * GET / — Server info (free)
 */
app.get('/', (req, res) => {
  res.json({
    name: 'MPP Market Data Server',
    protocol: 'MPP Charge (real on-chain payment)',
    network: 'stellar:testnet',
    recipient: RECIPIENT,
    pricing: {
      '/price': { cost: PAYMENT_AMOUNT, asset: 'XLM (native)', description: 'XLM/USDC price + 20pt history' }
    },
    status: 'active',
    totalPayments: paymentLog.length
  });
});

/**
 * GET /price — Market data (paid via MPP Charge)
 * 
 * Without X-Payment-TX → 402 + payment invoice
 * With valid X-Payment-TX → market data
 */
app.get('/price', async (req, res) => {
  const paymentTx = req.headers['x-payment-tx'];

  if (!paymentTx) {
    // ═══ Issue MPP Invoice (402) ═══
    const memo = `mpp-${crypto.randomBytes(4).toString('hex')}`;
    
    console.log(`💳 [MPP] Invoice issued: ${memo} | ${PAYMENT_AMOUNT} XLM`);

    return res.status(402).json({
      protocol: 'MPP Charge',
      version: '1.0',
      payment: {
        network: 'stellar:testnet',
        destination: RECIPIENT,
        amount: PAYMENT_AMOUNT,
        asset: 'native',
        asset_code: 'XLM',
        memo,
        memo_type: 'text'
      },
      description: 'Pay to access real-time XLM/USDC market data'
    });
  }

  // ═══ Verify Payment ═══
  if (verifiedPayments.has(paymentTx)) {
    return res.status(402).json({ error: 'Payment TX already used', protocol: 'MPP' });
  }

  const verification = await verifyPayment(paymentTx);
  
  if (!verification.valid) {
    console.log(`❌ [MPP] Verification failed: ${verification.reason}`);
    return res.status(402).json({
      error: `Payment verification failed: ${verification.reason}`,
      protocol: 'MPP'
    });
  }

  // ═══ Payment verified → serve data ═══
  verifiedPayments.add(paymentTx);
  const data = getMarketData();

  paymentLog.push({
    txHash: paymentTx,
    amount: PAYMENT_AMOUNT,
    asset: 'XLM',
    from: verification.tx?.source_account,
    price_served: data.price,
    timestamp: new Date().toISOString(),
    explorerUrl: `https://stellar.expert/explorer/testnet/tx/${paymentTx}`
  });

  console.log(`📊 [MPP] ✅ Payment verified! Price: $${data.price} | TX: ${paymentTx.substring(0, 12)}... | Total: ${paymentLog.length}`);

  res.json({
    success: true,
    payment: {
      protocol: 'MPP Charge',
      amount: PAYMENT_AMOUNT,
      asset: 'XLM',
      txHash: paymentTx,
      explorerUrl: `https://stellar.expert/explorer/testnet/tx/${paymentTx}`,
      status: 'verified_on_chain'
    },
    data
  });
});

/**
 * GET /payments — Payment log
 */
app.get('/payments', (req, res) => {
  res.json({ payments: paymentLog });
});

app.listen(PORT, () => {
  console.log('');
  console.log('📊 ════════════════════════════════════════');
  console.log('   MPP Market Data Server (REAL PAYMENTS)');
  console.log('════════════════════════════════════════');
  console.log(`   Port:      ${PORT}`);
  console.log(`   Protocol:  MPP Charge (on-chain verified)`);
  console.log(`   Network:   stellar:testnet`);
  console.log(`   Recipient: ${RECIPIENT || 'NOT SET'}`);
  console.log(`   Price:     ${PAYMENT_AMOUNT} XLM per request`);
  console.log('════════════════════════════════════════');
  console.log('   Ready to serve market data! 🚀');
  console.log('');
});
