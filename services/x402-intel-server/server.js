/**
 * x402 Intel Server — Official x402 Protocol SDK
 * =================================================
 * 
 * PENJELASAN:
 * Server ini menggunakan OFFICIAL x402 SDK dari Stellar docs:
 * - @x402/express: Middleware yang handle 402 Payment Required
 * - @x402/stellar: Stellar network settlement (ExactStellarScheme)
 * - HTTPFacilitatorClient: Coinbase facilitator untuk verify + settle
 * 
 * x402 FLOW (Official):
 * 1. Client GET /intel → middleware return 402 + payment headers
 * 2. Client's x402 SDK creates payment payload (Soroban SAC USDC transfer)
 * 3. Client retries with payment headers
 * 4. Facilitator verifies + settles on-chain
 * 5. Server returns premium intel data
 * 
 * PAYMENT: USDC via Soroban SAC (Smart Asset Contract)
 * NOT our custom XLM verification!
 * 
 * PORT: 3003
 */
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { paymentMiddlewareFromConfig } from '@x402/express';
import { HTTPFacilitatorClient } from '@x402/core/server';
import { ExactStellarScheme } from '@x402/stellar/exact/server';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env manually
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

// ═══ Config ═══
const PORT = process.env.X402_INTEL_PORT || 3003;
const PAY_TO = process.env.MARKET_DATA_STELLAR_ADDRESS;
const NETWORK = 'stellar:testnet';
const FACILITATOR_URL = 'https://x402.org/facilitator'; // Official Coinbase facilitator
const PRICE = '$0.01'; // 0.01 USDC per request

const app = express();
app.use(cors());
app.use(express.json());

// Track payments for dashboard
const paymentLog = [];

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

// ═══ Root info (free) ═══
app.get('/', (_, res) => res.json({
  name: 'x402 Market Intelligence Server',
  protocol: 'x402 (Official SDK)',
  network: NETWORK,
  facilitator: FACILITATOR_URL,
  pricing: { '/intel': { cost: PRICE, asset: 'USDC', description: 'Premium sentiment analysis' } },
  status: 'active',
  totalPayments: paymentLog.length
}));

// Health check
app.get('/health', (_, res) => res.json({ status: 'ok', protocol: 'x402-sdk' }));

// ═══ x402 Payment Middleware (Official SDK) ═══
// This automatically handles the 402 flow:
// - Returns 402 + payment headers to unpaid requests
// - Verifies payment via Facilitator on retry
// - Settles on-chain via Soroban SAC USDC transfer
app.use(
  paymentMiddlewareFromConfig(
    {
      'GET /intel': {
        accepts: {
          scheme: 'exact',
          price: PRICE,
          network: NETWORK,
          payTo: PAY_TO,
        },
        description: 'Premium AI market intelligence with sentiment analysis',
      },
    },
    new HTTPFacilitatorClient({ url: FACILITATOR_URL }),
    [{ network: NETWORK, server: new ExactStellarScheme() }],
  )
);

// ═══ Protected endpoint (only served after x402 payment) ═══
app.get('/intel', (req, res) => {
  const intel = generatePremiumIntel();

  // Log payment for dashboard
  paymentLog.push({
    protocol: 'x402',
    amount: PRICE,
    asset: 'USDC',
    method: 'x402 SDK (Soroban SAC)',
    timestamp: new Date().toISOString()
  });

  console.log(`✅ [x402-SDK] Payment verified via Facilitator! Serving intel #${paymentLog.length}`);

  res.json({
    success: true,
    protocol: 'x402',
    sdk: 'official @x402/express',
    payment_verified: true,
    intel,
    server_stats: { totalPaymentsReceived: paymentLog.length }
  });
});

// ═══ Payment log (for monitoring) ═══
app.get('/payments', (_, res) => {
  res.json({ payments: paymentLog });
});

// Start
app.listen(PORT, '127.0.0.1', () => {
  console.log('');
  console.log('🌐 ════════════════════════════════════════');
  console.log('   x402 Market Intelligence Server');
  console.log('   ⚡ OFFICIAL SDK (@x402/express)');
  console.log('════════════════════════════════════════');
  console.log(`   Port:        ${PORT}`);
  console.log(`   Protocol:    x402 (HTTP 402 Payment Required)`);
  console.log(`   SDK:         @x402/express + @x402/stellar`);
  console.log(`   Facilitator: ${FACILITATOR_URL}`);
  console.log(`   Network:     ${NETWORK}`);
  console.log(`   Pay-To:      ${PAY_TO || 'NOT SET'}`);
  console.log(`   Price:       ${PRICE} USDC per request`);
  console.log(`   Settlement:  Soroban SAC USDC transfer`);
  console.log('════════════════════════════════════════');
  console.log('   Ready to serve paid intelligence! 🚀');
  console.log('');
});
