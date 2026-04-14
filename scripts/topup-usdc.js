/**
 * topup-usdc.js — Swap XLM → USDC via SDEX
 * 
 * Menjual sejumlah XLM di SDEX untuk mendapatkan USDC,
 * sehingga agent punya cukup saldo untuk bayar MPP.
 */
import 'dotenv/config';
import { Keypair, Horizon, TransactionBuilder, Operation, Asset, Networks, BASE_FEE } from '@stellar/stellar-sdk';

const AGENT_SECRET = process.env.AGENT_STELLAR_SECRET;
const HORIZON_URL = process.env.HORIZON_URL || 'https://horizon-testnet.stellar.org';
const USDC_ISSUER = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';

if (!AGENT_SECRET) {
  console.error('❌ AGENT_STELLAR_SECRET not set in .env');
  process.exit(1);
}

const keypair = Keypair.fromSecret(AGENT_SECRET);
const server = new Horizon.Server(HORIZON_URL);
const xlm = Asset.native();
const usdc = new Asset('USDC', USDC_ISSUER);

async function main() {
  console.log('🔑 Agent wallet:', keypair.publicKey());
  
  // Check current balance
  const account = await server.loadAccount(keypair.publicKey());
  const xlmBal = account.balances.find(b => b.asset_type === 'native');
  const usdcBal = account.balances.find(b => b.asset_code === 'USDC');
  console.log(`💰 Current: ${xlmBal?.balance} XLM | ${usdcBal?.balance} USDC`);
  
  // Sell 2000 XLM for USDC at market price (use a generous price to ensure fill)
  const sellAmount = 2000;
  const price = '0.10'; // Willing to sell at 0.10 USDC/XLM (low price = more likely to fill)
  
  console.log(`\n📉 Selling ${sellAmount} XLM for USDC @ ${price} USDC/XLM...`);
  console.log(`   Expected: ~${(sellAmount * parseFloat(price)).toFixed(2)} USDC minimum`);
  
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET
  })
    .addOperation(Operation.manageSellOffer({
      selling: xlm,
      buying: usdc,
      amount: String(sellAmount),
      price: price,
      offerId: '0'
    }))
    .setTimeout(30)
    .build();
  
  tx.sign(keypair);
  
  try {
    const result = await server.submitTransaction(tx);
    console.log(`✅ TX submitted: ${result.hash}`);
    console.log(`🔗 Explorer: https://stellar.expert/explorer/testnet/tx/${result.hash}`);
    
    // Check new balance
    const newAccount = await server.loadAccount(keypair.publicKey());
    const newXlm = newAccount.balances.find(b => b.asset_type === 'native');
    const newUsdc = newAccount.balances.find(b => b.asset_code === 'USDC');
    console.log(`\n💰 New balance: ${newXlm?.balance} XLM | ${newUsdc?.balance} USDC`);
    console.log('🎉 Top-up complete! Agent can now resume trading.');
  } catch (err) {
    console.error('❌ Transaction failed:', err.response?.data?.extras?.result_codes || err.message);
  }
}

main();
