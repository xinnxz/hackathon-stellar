/**
 * topup-usdc-v2.js — Swap XLM → USDC via pathPaymentStrictSend
 * 
 * pathPaymentStrictSend mengirim exact amount XLM dan menerima
 * sebanyak mungkin USDC. Ini seperti "market order" — pasti terisi.
 */
import { Keypair, Horizon, TransactionBuilder, Operation, Asset, Networks, BASE_FEE } from '@stellar/stellar-sdk';

const AGENT_SECRET = process.env.AGENT_STELLAR_SECRET;
const HORIZON_URL = process.env.HORIZON_URL || 'https://horizon-testnet.stellar.org';
const USDC_ISSUER = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';

const keypair = Keypair.fromSecret(AGENT_SECRET);
const server = new Horizon.Server(HORIZON_URL);
const xlm = Asset.native();
const usdc = new Asset('USDC', USDC_ISSUER);

async function main() {
  console.log('🔑 Agent:', keypair.publicKey());
  
  let account = await server.loadAccount(keypair.publicKey());
  const xlmBal = account.balances.find(b => b.asset_type === 'native');
  const usdcBal = account.balances.find(b => b.asset_code === 'USDC');
  console.log(`💰 Before: ${xlmBal?.balance} XLM | ${usdcBal?.balance} USDC`);
  
  // Cancel any remaining open offers first
  const offers = await server.offers().forAccount(keypair.publicKey()).limit(200).call();
  if (offers.records.length > 0) {
    console.log(`\n🗑️  Cancelling ${offers.records.length} open offers...`);
    for (let i = 0; i < offers.records.length; i += 20) {
      const batch = offers.records.slice(i, i + 20);
      account = await server.loadAccount(keypair.publicKey());
      let builder = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: Networks.TESTNET });
      batch.forEach(offer => {
        builder = builder.addOperation(Operation.manageSellOffer({
          selling: offer.selling.asset_type === 'native' ? xlm : new Asset(offer.selling.asset_code, offer.selling.asset_issuer),
          buying: offer.buying.asset_type === 'native' ? xlm : new Asset(offer.buying.asset_code, offer.buying.asset_issuer),
          amount: '0', price: offer.price, offerId: offer.id
        }));
      });
      const cancelTx = builder.setTimeout(30).build();
      cancelTx.sign(keypair);
      await server.submitTransaction(cancelTx);
      console.log(`   ✅ Cancelled ${batch.length} offers`);
    }
  }

  // Use pathPaymentStrictSend — "market sell" 500 XLM, accept minimum 1 USDC
  console.log('\n📉 Market-selling 500 XLM → USDC via pathPaymentStrictSend...');
  account = await server.loadAccount(keypair.publicKey());
  
  const tx = new TransactionBuilder(account, {
    fee: (parseInt(BASE_FEE) * 10).toString(), // higher fee for priority
    networkPassphrase: Networks.TESTNET
  })
    .addOperation(Operation.pathPaymentStrictSend({
      sendAsset: xlm,
      sendAmount: '500',
      destination: keypair.publicKey(),  // send to self
      destAsset: usdc,
      destMin: '1',  // accept minimum 1 USDC (market price will determine actual)
      path: []       // let Stellar find the best path
    }))
    .setTimeout(30)
    .build();
  
  tx.sign(keypair);
  
  try {
    const result = await server.submitTransaction(tx);
    console.log(`✅ TX: ${result.hash}`);
    console.log(`🔗 https://stellar.expert/explorer/testnet/tx/${result.hash}`);
    
    const na = await server.loadAccount(keypair.publicKey());
    const newXlm = na.balances.find(b => b.asset_type === 'native');
    const newUsdc = na.balances.find(b => b.asset_code === 'USDC');
    console.log(`\n💰 After: ${newXlm?.balance} XLM | ${newUsdc?.balance} USDC`);
    
    const usdcGain = parseFloat(newUsdc?.balance) - parseFloat(usdcBal?.balance);
    console.log(`📊 Got +${usdcGain.toFixed(4)} USDC for 500 XLM`);
    console.log('🎉 Agent wallet topped up! MPP payments should work now.');
  } catch (err) {
    const codes = err.response?.data?.extras?.result_codes;
    console.error('❌ Failed:', codes || err.message);
    if (codes?.operations?.[0] === 'op_too_few_offers') {
      console.log('💡 Not enough liquidity on SDEX for XLM/USDC testnet pair.');
      console.log('   Try adding USDC from another testnet wallet.');
    }
  }
}

main();
