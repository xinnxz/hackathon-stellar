/**
 * agent.js — Autonomous Skill-Based Trading Loop
 * =================================================
 * 
 * PENJELASAN ARSITEKTUR:
 * Agent ini menjalankan pipeline trading secara OTONOM dengan
 * memanggil OpenClaw skills sebagai child processes.
 * 
 * Setiap skill = independent script yang bisa juga dipanggil
 * langsung oleh OpenClaw TUI. Agent server mengorkestrasi
 * urutan eksekusi dan broadcast hasilnya via SSE.
 * 
 * FLOW (setiap 30 detik):
 * 1. WALLET  → check-wallet.js → saldo + budget
 * 2. POLL    → poll-price.js → bayar MPP → harga (REAL TX)
 * 3. ANALYZE → run-analysis.js → 4 indikator + confluence
 * 4. INTEL   → get-intel.js → bayar x402 → sentiment (REAL TX)
 * 5. DECIDE  → confluence ≥ 0.75? → BUY/SELL/HOLD
 * 6. TRADE   → execute-trade.js → SDEX on-chain (REAL TX)
 * 
 * Setiap step broadcast SSE event → Dashboard animates live
 */
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const SKILLS_DIR = path.resolve(ROOT_DIR, 'skills');

export class Agent {
  constructor({ history, config }) {
    this.history = history;
    this.config = config || {};
    this.isRunning = false;
    this.cycleCount = 0;
    this.intervalId = null;
    this.lastCycleResult = null;
    this.isCycleRunning = false; // prevent overlapping cycles
  }

  /**
   * execSkill(scriptPath, args)
   * Execute a skill script as child process and parse JSON stdout.
   * 
   * PENJELASAN:
   * Setiap skill output JSON ke stdout. stderr dipakai untuk logging.
   * Ini memungkinkan skills dijalankan baik oleh Agent maupun OpenClaw.
   */
  execSkill(scriptPath, args = []) {
    return new Promise((resolve) => {
      const fullPath = path.resolve(SKILLS_DIR, scriptPath);
      const proc = spawn('node', [fullPath, ...args], {
        cwd: ROOT_DIR,
        env: { ...process.env },
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';
      proc.stdout.on('data', (d) => stdout += d.toString());
      proc.stderr.on('data', (d) => {
        stderr += d.toString();
        // Log skill stderr in real-time (shows payment progress)
        const lines = d.toString().trim().split('\n');
        lines.forEach(line => {
          if (line.trim()) console.log(`   ${line.trim()}`);
        });
      });

      proc.on('close', (code) => {
        try {
          const result = JSON.parse(stdout.trim());
          resolve(result);
        } catch {
          resolve({ error: `Skill parse error (code ${code})`, raw: stdout.substring(0, 200) });
        }
      });

      proc.on('error', (err) => {
        resolve({ error: `Skill exec error: ${err.message}` });
      });

      // Timeout after 30s
      setTimeout(() => {
        proc.kill();
        resolve({ error: 'Skill timeout (30s)' });
      }, 30000);
    });
  }

  /**
   * runCycle()
   * Execute one full trading cycle.
   */
  async runCycle() {
    if (this.isCycleRunning) {
      console.log('   [SKIP] Previous cycle still running...');
      return;
    }

    this.isCycleRunning = true;
    this.cycleCount++;
    const cycleId = this.cycleCount;
    console.log(`\n[CYCLE] ====== CYCLE ${cycleId} ======`);

    try {
      // ═══ STEP 1: WALLET CHECK ═══
      this.broadcast('PIPELINE', { step: 1, name: 'Wallet Check', status: 'running' });
      this.broadcast('CHAT', { role: 'agent', content: `🔄 Cycle #${cycleId} starting...` });

      const wallet = await this.execSkill('stellar-wallet/check-wallet.js');
      
      if (wallet.success) {
        this.broadcast('STATUS', { 
          balances: { xlm: wallet.xlm, usdc: wallet.usdc, publicKey: wallet.publicKey }
        });
        console.log(`   [WALLET] Balance: ${wallet.xlm?.toFixed(2)} XLM`);
      }
      this.broadcast('PIPELINE', { step: 1, name: 'Wallet Check', status: 'done' });

      // Check budget
      if (wallet.budget?.remaining < 0.01) {
        this.broadcast('CHAT', { role: 'agent', content: '⚠️ Intel budget depleted. Stopping.' });
        this.stop();
        this.isCycleRunning = false;
        return;
      }

      // ═══ STEP 2: POLL PRICE (MPP — REAL ON-CHAIN PAYMENT) ═══
      this.broadcast('PIPELINE', { step: 2, name: 'Poll Price (MPP)', status: 'running' });

      const price = await this.execSkill('stellar-poll-price/poll-price.js');

      if (price.success) {
        this.broadcast('PRICE_POLL', {
          price: price.price,
          change: price.change,
          cost: 0.01,
          txHash: price.payment?.txHash
        });
        console.log(`   [PRICE] $${price.price} | MPP TX: ${price.payment?.txHash?.substring(0, 12)}...`);
      } else {
        console.log(`   [ERROR] MPP poll failed: ${price.error}`);
        this.broadcast('PIPELINE', { step: 2, name: 'Poll Price', status: 'error' });
        this.isCycleRunning = false;
        return;
      }
      this.broadcast('PIPELINE', { step: 2, name: 'Poll Price (MPP)', status: 'done' });

      // ═══ STEP 3: ANALYZE (4 Indicators) ═══
      this.broadcast('PIPELINE', { step: 3, name: 'Technical Analysis', status: 'running' });

      const analysis = await this.execSkill('stellar-analyze/run-analysis.js');

      if (analysis.success) {
        this.broadcast('ANALYSIS', {
          indicators: analysis.indicators,
          confluence: analysis.confluence
        });
        console.log(`   [ANALYSIS] Confluence: ${analysis.confluence?.signal} (${analysis.confluence?.confidence ? (analysis.confluence.confidence * 100).toFixed(0) : 0}%)`);
      }
      this.broadcast('PIPELINE', { step: 3, name: 'Technical Analysis', status: 'done' });

      // ═══ STEP 4: x402 INTEL (OPTIONAL — low confidence) ═══
      const confidence = analysis.confluence?.confidence || 0;
      const signal = analysis.confluence?.signal;
      
      // SCALPER LOGIC: Only buy intel if we have a weak signal that needs confirmation
      // Skip x402 if signal is already HOLD (saves $0.05 per cycle)
      if (signal !== 'HOLD' && confidence < 0.6 && wallet.budget?.remaining >= 0.05) {
        this.broadcast('PIPELINE', { step: 4, name: 'x402 Intel', status: 'running' });

        const intel = await this.execSkill('stellar-x402-intel/get-intel.js');

        if (intel.success) {
          this.broadcast('X402_INTEL', {
            sentiment: intel.intel?.sentiment,
            cost: 0.05,
            txHash: intel.payment?.txHash
          });
          console.log(`   [INTEL] x402: ${intel.intel?.sentiment} | TX: ${intel.payment?.txHash?.substring(0, 12) || 'fallback'}...`);
        }
        this.broadcast('PIPELINE', { step: 4, name: 'x402 Intel', status: 'done' });
      } else {
        this.broadcast('PIPELINE', { step: 4, name: 'x402 Intel', status: 'skip' });
      }

      // ═══ STEP 5: DECIDE + TRADE ═══

      if (signal === 'BUY' || signal === 'SELL') {
        this.broadcast('PIPELINE', { step: 5, name: `Execute ${signal}`, status: 'running' });

        const trade = await this.execSkill('stellar-trade/execute-trade.js', [signal, '200']);

        if (trade.success) {
          this.broadcast('TRADE', {
            action: trade.action,
            amount: trade.amount,
            price: trade.price,
            pnl: trade.pnl,
            pnlPercent: trade.pnlPercent,
            txHash: trade.txHash
          });
          console.log(`   [TRADE] ${trade.action} ${trade.amount} XLM @ $${trade.price} | TX: ${trade.txHash?.substring(0, 12)}...`);
        } else {
          console.log(`   [WARN] Trade: ${trade.error}`);
        }
        this.broadcast('PIPELINE', { step: 5, name: `Execute ${signal}`, status: trade.success ? 'done' : 'error' });
      } else {
        this.broadcast('PIPELINE', { step: 5, name: 'HOLD', status: 'done' });
        this.broadcast('CHAT', { 
          role: 'agent', 
          content: `📊 Cycle #${cycleId}: HOLD (confidence ${(confidence * 100).toFixed(0)}%) — ${analysis.confluence?.reason || 'no consensus'}`
        });
        console.log(`   [HOLD] confidence ${(confidence * 100).toFixed(0)}%`);
      }

      // ═══ STEP 6: REPORT ═══
      this.broadcast('PIPELINE', { step: 6, name: 'Report', status: 'done' });
      this.lastCycleResult = { cycleId, signal, confidence, price: price.price };

    } catch (error) {
      console.error(`   [ERROR] Cycle ${cycleId} error:`, error.message);
      this.broadcast('CHAT', { role: 'agent', content: `❌ Cycle error: ${error.message}` });
    }

    this.isCycleRunning = false;
  }

  broadcast(type, data) {
    this.history.addEvent(type, data);
  }

  start(intervalMs = 30000) {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log(`[SYSTEM] Agent started - cycle every ${intervalMs / 1000}s`);
    this.broadcast('CHAT', { role: 'agent', content: `🚀 Autonomous trading started! Cycling every ${intervalMs / 1000}s...` });

    // First cycle immediately
    this.runCycle();

    // Then repeat
    this.intervalId = setInterval(() => {
      if (this.isRunning) this.runCycle();
    }, intervalMs);
  }

  stop() {
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('[SYSTEM] Agent stopped');
    this.broadcast('CHAT', { role: 'agent', content: `⏸️ Trading stopped. ${this.cycleCount} cycles completed.` });
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      cycleCount: this.cycleCount,
      lastCycleResult: this.lastCycleResult
    };
  }
}
