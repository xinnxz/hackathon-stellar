/**
 * setup-usdc-trustline.js
 * ========================
 * Menambahkan USDC trustline ke kedua wallet (Agent + Market Data Server).
 * 
 * PENJELASAN:
 * Di Stellar, sebelum sebuah akun bisa menerima asset custom (seperti USDC),
 * akun tersebut harus membuat "trustline" dulu. Trustline artinya:
 * "Saya mempercayai issuer XYZ untuk asset USDC".
 * 
 * Tanpa trustline → transaksi USDC akan GAGAL.
 * 
 * USDC di Testnet dikeluarkan (issued) oleh:
 * GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5
 * (Ini adalah issuer resmi Circle untuk Stellar testnet)
 * 
 * Flow:
 * 1. Load kedua secret keys dari .env
 * 2. Buat operation changeTrust untuk asset USDC
 * 3. Submit ke Stellar testnet
 */
import { loadEnv } from '../skills/env-loader.js';
loadEnv();

import {
  Keypair, Asset, Networks, TransactionBuilder, Operation, Horizon
} from '@stellar/stellar-sdk';

const HORIZON_URL = process.env.HORIZON_URL || 'https://horizon-testnet.stellar.org';
const USDC_ISSUER = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
const USDC = new Asset('USDC', USDC_ISSUER);

async function addTrustline(secretKey, label) {
  console.log(`\n🔗 Adding USDC trustline to ${label}...`);
  
  try {
    const keypair = Keypair.fromSecret(secretKey);
    const server = new Horizon.Server(HORIZON_URL);
    const account = await server.loadAccount(keypair.publicKey());
    
    // Check if trustline already exists
    const hasTrustline = account.balances.some(
      b => b.asset_code === 'USDC' && b.asset_issuer === USDC_ISSUER
    );
    
    if (hasTrustline) {
      console.log(`   ℹ️  USDC trustline already exists`);
      return true;
    }
    
    // Create changeTrust operation
    const tx = new TransactionBuilder(account, {
      fee: '100000',
      networkPassphrase: Networks.TESTNET
    })
      .addOperation(Operation.changeTrust({
        asset: USDC,
        limit: '1000000' // Max 1M USDC
      }))
      .setTimeout(30)
      .build();
    
    tx.sign(keypair);
    const result = await server.submitTransaction(tx);
    console.log(`   ✅ USDC trustline added!`);
    console.log(`   📎 TX: ${result.hash}`);
    return true;
  } catch (err) {
    console.log(`   ❌ Failed: ${err.message}`);
    return false;
  }
}

async function main() {
  console.log('🔗 StellarTradeAgent — USDC Trustline Setup');
  console.log('============================================');
  
  const agentSecret = process.env.AGENT_STELLAR_SECRET;
  const marketSecret = process.env.MARKET_DATA_STELLAR_SECRET;
  
  if (!agentSecret || agentSecret === 'S...') {
    console.log('❌ AGENT_STELLAR_SECRET not set in .env');
    return;
  }
  
  // Add trustline to Agent wallet
  await addTrustline(agentSecret, 'Agent Wallet');
  
  // Add trustline to Market Data wallet
  if (marketSecret && marketSecret !== 'S...') {
    await addTrustline(marketSecret, 'Market Data Server');
  }
  
  console.log('\n============================================');
  console.log('📝 NEXT: Get testnet USDC');
  console.log('Option 1: Circle Faucet → https://faucet.circle.com');
  console.log('         (Select Stellar Testnet, paste Agent public key)');
  console.log('Option 2: We can self-issue test USDC for demo purposes');
  console.log('============================================\n');
}

main().catch(console.error);
