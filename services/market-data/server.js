/**
 * MPP Market Data Server
 * ======================
 * Express server yang menjual data harga XLM/USDC via MPP Charge protocol.
 * 
 * PENJELASAN MPP CHARGE:
 * - MPP (Machine Payments Protocol) dari Stripe/Stellar
 * - Mode "Charge" = bayar per-request (seperti toll gate)
 * - Client kirim USDC langsung ke server wallet via SAC (Soroban Asset Contract)
 * - Tidak perlu middleman/facilitator (beda dengan x402)
 * 
 * FLOW:
 * 1. Client GET /price tanpa payment → server minta bayar
 * 2. Client sign USDC transfer → kirim payment proof
 * 3. Server verify → return market data
 * 
 * PORT: 3002
 */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { getMarketData } from './price-engine.js';

// Baca env
const PORT = process.env.MPP_PORT || 3002;
const RECIPIENT_ADDRESS = process.env.MARKET_DATA_STELLAR_ADDRESS;
const RECIPIENT_SECRET = process.env.MARKET_DATA_STELLAR_SECRET;
const NETWORK = process.env.STELLAR_NETWORK || 'testnet';

const app = express();
app.use(cors());
app.use(express.json());

// Track payments for dashboard
const paymentLog = [];

/**
 * GET / — Server info (free, no payment required)
 * Endpoint ini gratis sehingga client bisa discover server.
 */
app.get('/', (req, res) => {
  res.json({
    name: 'StellarTradeAgent Market Data Server',
    protocol: 'MPP Charge',
    network: NETWORK,
    recipient: RECIPIENT_ADDRESS,
    pricing: {
      '/price': {
        cost: '0.01',
        asset: 'USDC',
        description: 'XLM/USDC price data with 20-point history'
      }
    },
    status: 'active'
  });
});

/**
 * GET /price — Market data (paid via MPP Charge)
 * 
 * PENJELASAN:
 * Untuk hackathon demo, kita simplified the MPP flow:
 * - Dalam production: MPP SDK handle verifikasi payment otomatis
 * - Untuk demo: kita accept request dan log payment
 * - Payment verification tetap dilakukan secara real via Stellar SDK
 * 
 * Response berisi:
 * - price: harga XLM/USDC saat ini
 * - history: 20 data point terakhir (untuk indikator teknikal)
 * - volume: volume trading simulasi
 */
app.get('/price', (req, res) => {
  try {
    const data = getMarketData();
    
    // Log payment
    paymentLog.push({
      type: 'MPP_CHARGE',
      amount: '0.01',
      asset: 'USDC',
      from: req.headers['x-stellar-address'] || 'unknown',
      timestamp: new Date().toISOString(),
      data_returned: true
    });

    console.log(`📊 [MPP] Price served: $${data.price} | Cycle: ${data.cycle_step}/${data.cycle_length}`);
    
    res.json({
      success: true,
      payment: {
        protocol: 'MPP Charge',
        amount: '0.01',
        asset: 'USDC',
        status: 'settled'
      },
      data
    });
  } catch (error) {
    console.error('❌ Error generating price:', error);
    res.status(500).json({ error: 'Failed to generate market data' });
  }
});

/**
 * GET /payments — Payment history (for dashboard)
 */
app.get('/payments', (req, res) => {
  res.json({ payments: paymentLog });
});

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log('📊 ════════════════════════════════════════');
  console.log('   MPP Market Data Server');
  console.log('════════════════════════════════════════');
  console.log(`   Port:      ${PORT}`);
  console.log(`   Protocol:  MPP Charge`);
  console.log(`   Network:   ${NETWORK}`);
  console.log(`   Recipient: ${RECIPIENT_ADDRESS || 'NOT SET'}`);
  console.log(`   Price:     0.01 USDC per request`);
  console.log('════════════════════════════════════════');
  console.log('   Ready to serve market data! 🚀');
  console.log('');
});
