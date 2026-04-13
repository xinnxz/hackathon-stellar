/**
 * seed-orderbook.js
 * ==================
 * Seed SDEX orderbook dengan limit orders dari Market Data wallet
 * 
 * PENJELASAN:
 * SDEX = Stellar Decentralized Exchange. Untuk trade bisa "match" 
 * on-chain, harus ada order di sisi berlawanan dari orderbook.
 * 
 * Contoh:
 * - Kalau Agent mau BUY XLM → harus ada SELL order di orderbook
 * - Kalau Agent mau SELL XLM → harus ada BUY order di orderbook
 * 
 * Market Data wallet kita berperan sebagai "market maker":
 * - Pasang SELL offers: "Saya jual XLM di harga $0.16/XLM"
 * - Pasang BUY offers: "Saya beli XLM di harga $0.14/XLM"
 * 
 * Dengan ini, Agent punya pasangan untuk trade!
 * 
 * CATATAN: Karena ini testnet, kita perlu self-issue USDC dulu.
 * Approach: Kita bikin "self-trading" — Agent dan Market maker
 * saling berinteraksi di SDEX dengan harga yg kita tentukan.
 * 
 * Karena ini testnet dan belum ada USDC balance, kita buat
 * payment path dulu via XLM native trades.
 */
import { loadEnv } from '../skills/env-loader.js';
loadEnv();

import {
  Keypair, Asset, Networks, TransactionBuilder, Operation, Horizon
} from '@stellar/stellar-sdk';

const HORIZON_URL = process.env.HORIZON_URL || 'https://horizon-testnet.stellar.org';
const USDC_ISSUER = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
const XLM = Asset.native();
const USDC = new Asset('USDC', USDC_ISSUER);

async function placeOrders(secretKey, label) {
  console.log(`\n📋 Placing seed orders from ${label}...`);
  
  const keypair = Keypair.fromSecret(secretKey);
  const server = new Horizon.Server(HORIZON_URL);
  
  try {
    const account = await server.loadAccount(keypair.publicKey());
    
    // Check USDC balance
    const usdcBal = account.balances.find(b => b.asset_code === 'USDC');
    const xlmBal = account.balances.find(b => b.asset_type === 'native');
    
    console.log(`   XLM: ${xlmBal?.balance || 0}`);
    console.log(`   USDC: ${usdcBal?.balance || 0}`);
    
    // Place a SELL offer: Sell 500 XLM for USDC at 0.15 USDC/XLM
    // This means: "I am selling XLM, buying USDC, price = 0.15"
    const tx = new TransactionBuilder(account, {
      fee: '100000',
      networkPassphrase: Networks.TESTNET
    })
      // Sell XLM → want USDC (price 0.15 USDC per XLM)
      .addOperation(Operation.manageSellOffer({
        selling: XLM,
        buying: USDC,
        amount: '500.0000000',  // Sell 500 XLM
        price: '0.1500000',     // At 0.15 USDC per XLM
        offerId: '0'
      }))
      // Sell XLM → want USDC (price 0.16 USDC per XLM) — higher price
      .addOperation(Operation.manageSellOffer({
        selling: XLM,
        buying: USDC,
        amount: '500.0000000',
        price: '0.1600000',
        offerId: '0'
      }))
      // Sell XLM → want USDC (price 0.17 USDC per XLM)
      .addOperation(Operation.manageSellOffer({
        selling: XLM,
        buying: USDC,
        amount: '500.0000000',
        price: '0.1700000',
        offerId: '0'
      }))
      .setTimeout(30)
      .build();
    
    tx.sign(keypair);
    const result = await server.submitTransaction(tx);
    console.log(`   ✅ 3 SELL offers placed (500 XLM each at 0.15/0.16/0.17)`);
    console.log(`   📎 TX: ${result.hash}`);
    
    return result.hash;
  } catch (err) {
    // Handle response extras for more detail
    if (err.response?.data?.extras?.result_codes) {
      console.log(`   ❌ Error codes:`, JSON.stringify(err.response.data.extras.result_codes));
    } else {
      console.log(`   ❌ Failed: ${err.message}`);
    }
    return null;
  }
}

async function main() {
  console.log('📖 StellarTradeAgent — SDEX Orderbook Seeder');
  console.log('=============================================');
  
  const marketSecret = process.env.MARKET_DATA_STELLAR_SECRET;
  
  if (!marketSecret || marketSecret === 'S...') {
    console.log('❌ MARKET_DATA_STELLAR_SECRET not set in .env');
    return;
  }
  
  // Place orders from Market Data wallet
  const txHash = await placeOrders(marketSecret, 'Market Data Server');
  
  if (txHash) {
    console.log('\n=============================================');
    console.log('✅ SDEX orderbook seeded!');
    console.log(`🔗 Verify: https://stellar.expert/explorer/testnet/tx/${txHash}`);
    console.log('');
    console.log('   Orderbook now has XLM sell offers at:');
    console.log('   - 500 XLM @ $0.15 USDC');
    console.log('   - 500 XLM @ $0.16 USDC');
    console.log('   - 500 XLM @ $0.17 USDC');
    console.log('');
    console.log('📝 Agent can now BUY XLM from these offers!');
    console.log('=============================================\n');
  }
}

main().catch(console.error);
