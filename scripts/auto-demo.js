/**
 * auto-demo.js — Automated Demo Runner
 * ======================================
 * 
 * PENJELASAN:
 * Script ini menjalankan demo otomatis untuk recording video.
 * Mengirim start command, menunggu N cycles, lalu stop.
 * 
 * Prerequisites: npm run demo (all 4 servers running)
 * Usage: npm run auto-demo
 * 
 * Flow:
 * 1. Check all servers are running
 * 2. Reset budget
 * 3. Start agent (10s interval for fast demo)
 * 4. Monitor via SSE — wait for 5 cycles
 * 5. Auto-stop
 * 6. Print summary report with all TX hashes
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_URL = 'http://localhost:3000';
const TARGET_CYCLES = 5;

// ═══ Helpers ═══
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const log = (msg) => console.log(`[AutoDemo] ${msg}`);

async function checkServer(url, name) {
  try {
    const res = await fetch(url);
    if (res.ok) { log(`✅ ${name} — online`); return true; }
  } catch (e) { /* */ }
  log(`❌ ${name} — OFFLINE. Run 'npm run demo' first!`);
  return false;
}

async function main() {
  console.log('');
  console.log('🎬 ════════════════════════════════════════');
  console.log('   StellarTradeAgent — Auto Demo');
  console.log('════════════════════════════════════════');
  console.log(`   Target: ${TARGET_CYCLES} cycles`);
  console.log(`   Interval: 10s per cycle`);
  console.log('════════════════════════════════════════\n');

  // ═══ Step 1: Check all servers ═══
  log('Checking servers...');
  const apiOk = await checkServer(`${API_URL}/api/status`, 'Agent API (:3000)');
  const mppOk = await checkServer('http://localhost:3002/health', 'MPP Server (:3002)');
  const x402Ok = await checkServer('http://localhost:3003/health', 'x402 Server (:3003)');

  if (!apiOk) {
    log('❌ Agent API not running. Start with: npm run demo');
    process.exit(1);
  }

  // ═══ Step 2: Reset budget ═══
  log('Resetting budget...');
  const budgetFile = path.resolve(__dirname, '../server/budget-state.json');
  const freshBudget = { total: 1, spent: 0, remaining: 1, percentUsed: 0, payments: [] };
  fs.writeFileSync(budgetFile, JSON.stringify(freshBudget, null, 2));
  log('✅ Budget reset to 1.00 USDC');

  // ═══ Step 3: Start Agent ═══
  log('Starting autonomous trading (10s interval)...\n');

  const startRes = await fetch(`${API_URL}/api/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ interval: 10000 }) // 10s for fast demo
  });
  const startData = await startRes.json();
  log(`✅ Agent started: ${JSON.stringify(startData)}`);

  // ═══ Step 4: Monitor via polling ═══
  let currentCycle = 0;
  const txHashes = [];

  console.log('');
  console.log('📡 Monitoring cycles...');
  console.log('─'.repeat(60));

  while (currentCycle < TARGET_CYCLES) {
    await sleep(12000); // Wait 12s per cycle (10s interval + 2s buffer)

    try {
      // Check status
      const statusRes = await fetch(`${API_URL}/api/status`);
      const status = await statusRes.json();
      currentCycle = status.cycleCount || currentCycle;

      // Check skills status for TX data
      const skillsRes = await fetch(`${API_URL}/api/skills-status`);
      const skills = await skillsRes.json();

      // Extract TX hashes from budget payments
      if (skills.budget?.payments) {
        skills.budget.payments.forEach(p => {
          if (p.txHash && !txHashes.find(t => t.hash === p.txHash)) {
            txHashes.push({
              hash: p.txHash,
              type: p.type,
              amount: p.amount,
              explorerUrl: p.explorerUrl
            });
          }
        });
      }

      console.log(`   Cycle ${currentCycle}/${TARGET_CYCLES} | TXs: ${txHashes.length} | Balance change: ${status.balances?.xlm?.toFixed(2) || '?'} XLM`);

    } catch (e) {
      console.log(`   ⚠️ Status check failed: ${e.message}`);
    }
  }

  // ═══ Step 5: Stop Agent ═══
  console.log('');
  log('Stopping agent...');
  await fetch(`${API_URL}/api/stop`, { method: 'POST' });
  log('✅ Agent stopped');

  // ═══ Step 6: Print Summary ═══
  console.log('');
  console.log('🏆 ════════════════════════════════════════');
  console.log('   DEMO SUMMARY');
  console.log('════════════════════════════════════════');
  console.log(`   Cycles completed: ${currentCycle}`);
  console.log(`   On-chain TXs: ${txHashes.length}`);
  console.log('');

  if (txHashes.length > 0) {
    console.log('   📋 Transaction Proof:');
    console.log('   ─'.repeat(30));
    txHashes.forEach((tx, i) => {
      console.log(`   ${i + 1}. [${tx.type}] $${tx.amount} → TX: ${tx.hash.substring(0, 16)}...`);
      console.log(`      Verify: ${tx.explorerUrl || `https://stellar.expert/explorer/testnet/tx/${tx.hash}`}`);
    });
  }

  console.log('');
  console.log('════════════════════════════════════════');
  console.log('   ✅ Demo complete! Ready for video recording.');
  console.log('════════════════════════════════════════\n');
}

main().catch(err => {
  console.error('Demo failed:', err);
  process.exit(1);
});
