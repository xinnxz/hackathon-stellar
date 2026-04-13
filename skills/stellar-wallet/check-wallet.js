/**
 * check-wallet.js
 * ================
 * OpenClaw Skill Script: Cek saldo wallet Stellar + budget status
 * 
 * PENJELASAN:
 * Script ini dipanggil oleh OpenClaw agent via `exec` tool.
 * Output berupa JSON ke stdout — agent parsing hasilnya.
 * 
 * Flow:
 * 1. Load AGENT_STELLAR_SECRET dari environment
 * 2. Query Horizon API untuk saldo XLM + USDC
 * 3. Baca budget tracker status
 * 4. Output JSON ke stdout
 */
import { loadEnv } from '../env-loader.js';
loadEnv();
import { Keypair } from '@stellar/stellar-sdk';

const AGENT_SECRET = process.env.AGENT_STELLAR_SECRET;
const HORIZON_URL = process.env.HORIZON_URL || 'https://horizon-testnet.stellar.org';
const BUDGET_FILE = new URL('../../server/budget-state.json', import.meta.url);

async function main() {
  if (!AGENT_SECRET || AGENT_SECRET === 'S...') {
    console.log(JSON.stringify({
      error: 'AGENT_STELLAR_SECRET not set. Run: node scripts/setup-wallets.js',
      xlm: 0, usdc: 0, publicKey: ''
    }));
    return;
  }

  const keypair = Keypair.fromSecret(AGENT_SECRET);
  const publicKey = keypair.publicKey();

  try {
    const res = await fetch(`${HORIZON_URL}/accounts/${publicKey}`);
    if (!res.ok) throw new Error(`Horizon error: ${res.status}`);
    const account = await res.json();

    let xlm = 0, usdc = 0;
    for (const bal of account.balances) {
      if (bal.asset_type === 'native') xlm = parseFloat(bal.balance);
      if (bal.asset_code === 'USDC') usdc = parseFloat(bal.balance);
    }

    // Read budget state
    let budget = { total: 1, spent: 0, remaining: 1, percentUsed: 0 };
    try {
      const fs = await import('fs');
      const budgetPath = new URL('../../server/budget-state.json', import.meta.url);
      if (fs.existsSync(budgetPath)) {
        budget = JSON.parse(fs.readFileSync(budgetPath, 'utf-8'));
      }
    } catch (e) { /* budget file may not exist yet */ }

    console.log(JSON.stringify({
      success: true,
      publicKey,
      xlm,
      usdc,
      budget,
      explorerUrl: `https://stellar.expert/explorer/testnet/account/${publicKey}`
    }));
  } catch (err) {
    console.log(JSON.stringify({
      error: err.message,
      publicKey,
      xlm: 0, usdc: 0
    }));
  }
}

main();
