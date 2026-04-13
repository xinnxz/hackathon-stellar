/**
 * MPP Market Data Server — Official @stellar/mpp SDK
 * =====================================================
 * 
 * PENJELASAN:
 * Server ini menggunakan OFFICIAL MPP SDK dari Stellar docs:
 * - @stellar/mpp: MPP Charge mode (Soroban SAC USDC transfer)
 * - mppx: Core MPP framework for server
 * 
 * MPP CHARGE FLOW (Official):
 * 1. Client GET /price → server return 402 + payment challenge headers
 * 2. Client (mppx/client) auto-builds Soroban SAC USDC transfer
 * 3. Client retries with signed credential
 * 4. Server verifies SAC invocation, broadcasts TX on-chain
 * 5. Server returns market data + receipt
 * 
 * PAYMENT: USDC via Soroban SAC (no external facilitator needed!)
 * SETTLEMENT: Server verifies + broadcasts directly
 * 
 * PORT: 3002
 */
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Mppx } from 'mppx/server';
import { stellar } from '@stellar/mpp/charge/server';
import { USDC_SAC_TESTNET } from '@stellar/mpp';
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
const MPP_SECRET_KEY = process.env.MPP_SECRET_KEY || 'stellar-trade-agent-mpp-key-2026';
const PAYMENT_AMOUNT = '0.01'; // 0.01 USDC per price poll

const app = express();
app.use(cors());
app.use(express.json());

// Track payments for dashboard
const paymentLog = [];

// ═══ Create MPP server instance (Official SDK) ═══
if (!RECIPIENT) {
  console.error('❌ Set MARKET_DATA_STELLAR_ADDRESS in .env (Stellar public key G...)');
  process.exit(1);
}

const mppx = Mppx.create({
  secretKey: MPP_SECRET_KEY,
  methods: [
    stellar.charge({
      recipient: RECIPIENT,
      currency: USDC_SAC_TESTNET,
      network: 'stellar:testnet',
    }),
  ],
});

/**
 * Convert Node.js IncomingMessage to Web Request
 * (Required by mppx which uses Web Request API)
 */
function toWebRequest(req) {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      for (const entry of value) headers.append(key, entry);
    } else {
      headers.set(key, value);
    }
  }
  return new Request(`http://localhost:${PORT}${req.url}`, {
    method: req.method,
    headers,
  });
}

// ═══ Root info (free) ═══
app.get('/', (_, res) => res.json({
  name: 'MPP Market Data Server',
  protocol: 'MPP Charge (Official @stellar/mpp SDK)',
  network: 'stellar:testnet',
  settlement: 'Soroban SAC USDC transfer',
  recipient: RECIPIENT,
  pricing: { '/price': { cost: `${PAYMENT_AMOUNT} USDC`, description: 'XLM/USDC price + 20pt history' } },
  status: 'active',
  totalPayments: paymentLog.length
}));

// Health check
app.get('/health', (_, res) => res.json({ status: 'ok', protocol: 'mpp-sdk' }));

// ═══ Payment-gated endpoint (Official MPP Charge) ═══
app.get('/price', async (req, res) => {
  const webReq = toWebRequest(req);

  // Run MPP charge flow
  const result = await mppx.charge({
    amount: PAYMENT_AMOUNT,
    description: 'Real-time XLM/USDC market data',
  })(webReq);

  if (result.status === 402) {
    // ═══ 402: Send payment challenge ═══
    const challenge = result.challenge;
    challenge.headers.forEach((value, key) => res.setHeader(key, value));
    console.log(`💳 [MPP-SDK] Challenge issued | ${PAYMENT_AMOUNT} USDC`);
    return res.status(402).send(await challenge.text());
  }

  // ═══ Payment verified! Serve data ═══
  const data = getMarketData();

  paymentLog.push({
    protocol: 'MPP Charge',
    amount: PAYMENT_AMOUNT,
    asset: 'USDC',
    method: 'MPP SDK (Soroban SAC)',
    price_served: data.price,
    timestamp: new Date().toISOString()
  });

  console.log(`📊 [MPP-SDK] ✅ Payment verified! Price: $${data.price} | Payment #${paymentLog.length}`);

  // Build response with receipt
  const responseBody = {
    success: true,
    payment: {
      protocol: 'MPP Charge',
      sdk: '@stellar/mpp + mppx',
      amount: PAYMENT_AMOUNT,
      asset: 'USDC',
      settlement: 'Soroban SAC USDC transfer',
      status: 'verified_on_chain'
    },
    data
  };

  const response = result.withReceipt(Response.json(responseBody));
  response.headers.forEach((value, key) => res.setHeader(key, value));
  return res.status(response.status).send(await response.text());
});

// ═══ Payment log ═══
app.get('/payments', (_, res) => {
  res.json({ payments: paymentLog });
});

// Start
app.listen(PORT, () => {
  console.log('');
  console.log('📊 ════════════════════════════════════════');
  console.log('   MPP Market Data Server');
  console.log('   ⚡ OFFICIAL SDK (@stellar/mpp + mppx)');
  console.log('════════════════════════════════════════');
  console.log(`   Port:       ${PORT}`);
  console.log(`   Protocol:   MPP Charge (Soroban SAC)`);
  console.log(`   SDK:        @stellar/mpp + mppx`);
  console.log(`   Network:    stellar:testnet`);
  console.log(`   Currency:   USDC (Soroban SAC Testnet)`);
  console.log(`   Recipient:  ${RECIPIENT || 'NOT SET'}`);
  console.log(`   Price:      ${PAYMENT_AMOUNT} USDC per request`);
  console.log(`   Settlement: Server verifies + broadcasts`);
  console.log('════════════════════════════════════════');
  console.log('   Ready to serve market data! 🚀');
  console.log('');
});
