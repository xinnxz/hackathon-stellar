/**
 * setup-wallets.js
 * ================
 * Generates 2 Stellar testnet wallets (Agent + Market Data Server)
 * and funds them via Friendbot.
 * 
 * PENJELASAN:
 * - Stellar.Keypair.random() → membuat pasangan kunci baru (public + secret)
 * - Friendbot → layanan gratis Stellar testnet yang memberi 10,000 XLM
 * - Kita butuh 2 wallet:
 *   1. Agent Wallet: untuk trading + membayar data
 *   2. Market Data Server: menerima pembayaran MPP
 */
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(__dirname, '../server/') + '/');
const { Keypair } = require('@stellar/stellar-sdk');

const FRIENDBOT_URL = 'https://friendbot.stellar.org';

async function fundAccount(publicKey, label) {
  console.log(`\n💫 Funding ${label}...`);
  try {
    const response = await fetch(`${FRIENDBOT_URL}?addr=${publicKey}`);
    if (response.ok) {
      console.log(`   ✅ Funded! 10,000 XLM received`);
    } else {
      const text = await response.text();
      // Already funded is OK
      if (text.includes('createAccountAlreadyExist')) {
        console.log(`   ℹ️  Already funded (account exists)`);
      } else {
        console.log(`   ❌ Error: ${text.substring(0, 100)}`);
      }
    }
  } catch (err) {
    console.log(`   ❌ Network error: ${err.message}`);
  }
}

async function main() {
  console.log('🔑 StellarTradeAgent — Wallet Setup');
  console.log('====================================\n');

  // Generate 2 keypairs
  const agentKeypair = Keypair.random();
  const marketDataKeypair = Keypair.random();

  console.log('📋 Keypairs Generated:');
  console.log('');
  console.log('--- AGENT WALLET ---');
  console.log(`AGENT_STELLAR_PUBLIC=${agentKeypair.publicKey()}`);
  console.log(`AGENT_STELLAR_SECRET=${agentKeypair.secret()}`);
  console.log('');
  console.log('--- MARKET DATA SERVER WALLET ---');
  console.log(`MARKET_DATA_STELLAR_ADDRESS=${marketDataKeypair.publicKey()}`);
  console.log(`MARKET_DATA_STELLAR_SECRET=${marketDataKeypair.secret()}`);

  // Fund both accounts via Friendbot
  await fundAccount(agentKeypair.publicKey(), 'Agent Wallet');
  await fundAccount(marketDataKeypair.publicKey(), 'Market Data Server');

  console.log('\n====================================');
  console.log('📝 NEXT STEPS:');
  console.log('1. Copy the keypair values above into your .env file');
  console.log('2. Add USDC trustline for BOTH accounts:');
  console.log('   → https://lab.stellar.org/account/fund');
  console.log('3. Get testnet USDC from Circle Faucet:');
  console.log('   → https://faucet.circle.com (select Stellar Testnet)');
  console.log('4. Send some USDC to the Agent wallet');
  console.log('====================================\n');
}

main().catch(console.error);
