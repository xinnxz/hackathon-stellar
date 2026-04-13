/**
 * x402 Intel Server — Real HTTP 402 Payment Required
 * ====================================================
 * 
 * PENJELASAN:
 * Server ini implement REAL x402 protocol:
 * 
 * x402 Flow:
 * 1. Client GET /intel → Server return 402 + payment challenge
 * 2. Client buat Stellar TX (bayar XLM ke server wallet)
 * 3. Client GET /intel + header X-Payment-TX: <txHash>
 * 4. Server verify TX on-chain via Horizon API
 * 5. Server return premium intel data
 * 
 * Setiap pembayaran = REAL on-chain Stellar transaction
 * yang bisa di-verify di stellar.expert!
 * 
 * PORT: 3003
 */
import express from 'express';
import cors from 'cors';
import crypto from 'crypto';

const app = express();
app.use(cors());
app.use(express.json());

// ═══ Config ═══
const PORT = process.env.X402_INTEL_PORT || 3003;
const RECIPIENT = process.env.MARKET_DATA_STELLAR_ADDRESS || '';
const HORIZON_URL = process.env.HORIZON_URL || 'https://horizon-testnet.stellar.org';
const PAYMENT_AMOUNT = '0.1'; // 0.1 XLM per intel request
const CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ═══ In-memory stores ═══
const pendingChallenges = new Map(); // memo → { amount, destination, expires }
const verifiedPayments = new Set();  // txHash → already used
const paymentLog = [];

// Load .env manually (server may run standalone)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
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

/**
 * Generate sentiment analysis (premium data)
 */
function generatePremiumIntel() {
  const priceHistoryPath = path.resolve(__dirname, '../../server/price-history.json');
  let prices = [];
  try {
    if (fs.existsSync(priceHistoryPath)) {
      const data = JSON.parse(fs.readFileSync(priceHistoryPath, 'utf-8'));
      prices = data.map(h => h.price);
    }
  } catch (e) { /* */ }

  if (prices.length < 3) {
    return {
      sentiment: 'NEUTRAL', confidence: 0.3,
      analysis: 'Insufficient data for deep analysis.',
      recommendation: 'Gather more price data.',
      dataPoints: prices.length
    };
  }

  const recent = prices.slice(-5);
  const earlier = prices.slice(-10, -5);
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const earlierAvg = earlier.length > 0
    ? earlier.reduce((a, b) => a + b, 0) / earlier.length
    : recentAvg;
  const trendPct = ((recentAvg - earlierAvg) / earlierAvg) * 100;
  const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
  const variance = prices.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / prices.length;
  const volatility = (Math.sqrt(variance) / mean) * 100;

  let sentiment, confidence, analysis, recommendation;
  if (trendPct > 2) {
    sentiment = 'BULLISH';
    confidence = Math.min(0.9, 0.5 + trendPct / 10);
    analysis = `Strong uptrend: +${trendPct.toFixed(2)}%. Volatility ${volatility.toFixed(1)}%.`;
    recommendation = 'BUY positions favored.';
  } else if (trendPct < -2) {
    sentiment = 'BEARISH';
    confidence = Math.min(0.9, 0.5 + Math.abs(trendPct) / 10);
    analysis = `Downtrend: ${trendPct.toFixed(2)}%. Volatility ${volatility.toFixed(1)}%.`;
    recommendation = 'SELL or wait for reversal.';
  } else {
    sentiment = 'NEUTRAL';
    confidence = 0.4;
    analysis = `Sideways: ${trendPct.toFixed(2)}%. Volatility ${volatility.toFixed(1)}%.`;
    recommendation = 'Wait for clearer signals.';
  }

  return { sentiment, confidence, analysis, recommendation, dataPoints: prices.length };
}

/**
 * Verify Stellar payment on-chain via Horizon
 */
async function verifyPayment(txHash, expectedMemo) {
  try {
    const res = await fetch(`${HORIZON_URL}/transactions/${txHash}`);
    if (!res.ok) return { valid: false, reason: `TX not found: ${res.status}` };
    const tx = await res.json();

    // Check TX was successful
    if (!tx.successful) return { valid: false, reason: 'TX failed on-chain' };

    // Check memo matches
    if (tx.memo !== expectedMemo && !expectedMemo) {
      // If no specific memo expected, just check it's paid to us
    } else if (expectedMemo && tx.memo !== expectedMemo) {
      return { valid: false, reason: `Memo mismatch: got ${tx.memo}, expected ${expectedMemo}` };
    }

    // Check operations for payment to our address
    const opsRes = await fetch(`${HORIZON_URL}/transactions/${txHash}/operations`);
    const opsData = await opsRes.json();
    const ops = opsData._embedded?.records || [];

    let paymentFound = false;
    const recipient = process.env.MARKET_DATA_STELLAR_ADDRESS;
    for (const op of ops) {
      if ((op.type === 'payment' || op.type === 'create_account') &&
          op.to === recipient) {
        const amount = parseFloat(op.amount);
        if (amount >= parseFloat(PAYMENT_AMOUNT)) {
          paymentFound = true;
        }
      }
    }

    if (!paymentFound) {
      return { valid: false, reason: `Payment to ${recipient} not found in TX` };
    }

    return { valid: true, tx };
  } catch (err) {
    return { valid: false, reason: `Verification error: ${err.message}` };
  }
}

// ═══ Endpoints ═══

/**
 * GET / — Server info (free)
 */
app.get('/', (req, res) => {
  res.json({
    name: 'x402 Market Intelligence Server',
    protocol: 'x402 (HTTP 402 Payment Required)',
    network: 'stellar:testnet',
    pricing: {
      '/intel': { cost: PAYMENT_AMOUNT, asset: 'XLM (native)', description: 'Premium sentiment analysis' }
    },
    status: 'active',
    totalPayments: paymentLog.length
  });
});

/**
 * GET /intel — Premium intelligence (paid via x402)
 * 
 * Without X-Payment-TX header → returns 402 challenge
 * With valid X-Payment-TX → returns premium data
 */
app.get('/intel', async (req, res) => {
  const paymentTx = req.headers['x-payment-tx'];

  if (!paymentTx) {
    // ═══ Step 1: Issue Payment Challenge (402) ═══
    const memo = `x402-${crypto.randomBytes(4).toString('hex')}`;
    const expires = new Date(Date.now() + CHALLENGE_TTL_MS).toISOString();

    pendingChallenges.set(memo, {
      amount: PAYMENT_AMOUNT,
      destination: process.env.MARKET_DATA_STELLAR_ADDRESS,
      asset: 'native',
      expires,
      issuedAt: new Date().toISOString()
    });

    console.log(`🔒 [x402] Challenge issued: ${memo} | Pay ${PAYMENT_AMOUNT} XLM`);

    return res.status(402).json({
      protocol: 'x402',
      version: '1.0',
      payment: {
        network: 'stellar:testnet',
        destination: process.env.MARKET_DATA_STELLAR_ADDRESS,
        amount: PAYMENT_AMOUNT,
        asset: 'native',
        asset_code: 'XLM',
        memo,
        memo_type: 'text',
        expires
      },
      description: 'Pay to access premium market intelligence',
      how_to_pay: 'Create a Stellar payment TX with the specified memo, then resend this request with X-Payment-TX: <tx_hash>'
    });
  }

  // ═══ Step 2: Verify Payment ═══
  
  // Check if TX already used
  if (verifiedPayments.has(paymentTx)) {
    return res.status(402).json({
      error: 'Payment TX already used. Create a new payment.',
      protocol: 'x402'
    });
  }

  console.log(`🔍 [x402] Verifying payment TX: ${paymentTx.substring(0, 12)}...`);
  const verification = await verifyPayment(paymentTx);

  if (!verification.valid) {
    console.log(`❌ [x402] Verification failed: ${verification.reason}`);
    return res.status(402).json({
      error: `Payment verification failed: ${verification.reason}`,
      protocol: 'x402'
    });
  }

  // ═══ Step 3: Payment verified → return premium data ═══
  verifiedPayments.add(paymentTx);

  const intel = generatePremiumIntel();

  paymentLog.push({
    txHash: paymentTx,
    amount: PAYMENT_AMOUNT,
    asset: 'XLM',
    from: verification.tx?.source_account,
    timestamp: new Date().toISOString(),
    explorerUrl: `https://stellar.expert/explorer/testnet/tx/${paymentTx}`
  });

  console.log(`✅ [x402] Payment verified! Serving premium intel. Total payments: ${paymentLog.length}`);

  res.json({
    success: true,
    protocol: 'x402',
    payment_verified: true,
    payment: {
      txHash: paymentTx,
      amount: PAYMENT_AMOUNT,
      asset: 'XLM',
      explorerUrl: `https://stellar.expert/explorer/testnet/tx/${paymentTx}`,
      status: 'verified_on_chain'
    },
    intel,
    server_stats: {
      totalPaymentsReceived: paymentLog.length
    }
  });
});

/**
 * GET /payments — Payment log (for monitoring)
 */
app.get('/payments', (req, res) => {
  res.json({ payments: paymentLog });
});

// Start
app.listen(PORT, () => {
  console.log('');
  console.log('🌐 ════════════════════════════════════════');
  console.log('   x402 Market Intelligence Server');
  console.log('════════════════════════════════════════');
  console.log(`   Port:      ${PORT}`);
  console.log(`   Protocol:  x402 (HTTP 402 Payment Required)`);
  console.log(`   Network:   stellar:testnet`);
  console.log(`   Recipient: ${process.env.MARKET_DATA_STELLAR_ADDRESS || 'NOT SET'}`);
  console.log(`   Price:     ${PAYMENT_AMOUNT} XLM per request`);
  console.log('════════════════════════════════════════');
  console.log('   Ready to serve paid intelligence! 🚀');
  console.log('');
});
