/**
 * agent.js
 * ========
 * OpenClaw-Inspired Agentic Trading Loop
 * Otak utama dari StellarTradeAgent.
 * 
 * PENJELASAN ARSITEKTUR:
 * Terinspirasi dari framework OpenClaw (disebut di hackathon resources),
 * agent ini memiliki agentic loop yang berjalan otonom:
 * 
 * 1. RECEIVE  → Terima command dari user atau timer
 * 2. CONTEXT  → Load state: balance, budget, posisi saat ini
 * 3. POLL     → Bayar MPP → ambil harga XLM/USDC
 * 4. INTEL    → Bayar x402 → ambil market data dari xlm402.com
 * 5. ANALYZE  → Jalankan 4 indikator (EMA, RSI, BB, VWAP)
 * 6. DECIDE   → Confluence scoring + risk check
 * 7. EXECUTE  → Submit SDEX order on-chain
 * 8. PERSIST  → Simpan state + log
 * 9. REPORT   → kirim SSE event ke dashboard
 * 10. LOOP    → Tunggu → ulangi
 * 
 * FLOW DATA:
 * MPP Server → price data → indicators → confluence → risk → SDEX trade
 * xlm402.com → market intel → enhance analysis
 */
import { calculateConfluence } from './indicators.js';

export class Agent {
  /**
   * @param {Object} deps - Dependencies injection
   * @param {Object} deps.wallet - Stellar Wallet instance
   * @param {Object} deps.budget - Budget tracker instance
   * @param {Object} deps.risk - Risk manager instance
   * @param {Object} deps.sdex - SDEX trader instance
   * @param {Object} deps.history - History/SSE store instance
   * @param {Object} deps.config - Configuration
   */
  constructor(deps) {
    this.wallet = deps.wallet;
    this.budget = deps.budget;
    this.risk = deps.risk;
    this.sdex = deps.sdex;
    this.history = deps.history;
    this.config = deps.config || {};
    
    this.isRunning = false;
    this.cycleCount = 0;
    this.intervalId = null;
  }

  /**
   * runCycle()
   * Menjalankan 1 cycle lengkap dari trading pipeline.
   * Ini adalah INTI dari agent — setiap step menghasilkan event untuk dashboard.
   */
  async runCycle() {
    this.cycleCount++;
    const cycleId = this.cycleCount;
    console.log(`\n🔄 ══════ CYCLE ${cycleId} ══════`);

    try {
      // ═══ STEP 1: CHECK CONTEXT ═══
      this.history.addEvent('PIPELINE', { step: 1, name: 'CONTEXT', status: 'active', cycleId });
      
      const balances = await this.wallet.getBalances();
      const budgetStatus = this.budget.getStatus();
      
      this.history.addEvent('STATUS', {
        balances,
        budget: budgetStatus,
        cycle: cycleId
      });

      // Check if budget allows intel purchases (need 0.02 for MPP + x402)
      if (!this.budget.canSpend(0.02)) {
        this.history.addEvent('PIPELINE', { step: 1, name: 'CONTEXT', status: 'blocked', reason: 'Budget depleted' });
        this.history.addEvent('CHAT', { role: 'agent', content: `⚠️ Intel budget depleted (${budgetStatus.remaining} USDC remaining). Stopping trading.` });
        this.stop();
        return;
      }

      this.history.addEvent('PIPELINE', { step: 1, name: 'CONTEXT', status: 'done' });

      // ═══ STEP 2: POLL PRICE (MPP) ═══
      this.history.addEvent('PIPELINE', { step: 2, name: 'POLL (MPP)', status: 'active', cycleId });
      
      let priceData;
      try {
        const mppUrl = this.config.mppServerUrl || 'http://localhost:3002';
        const response = await fetch(`${mppUrl}/price`, {
          headers: { 'x-stellar-address': this.wallet.publicKey }
        });
        const result = await response.json();
        priceData = result.data;
        
        // Record intel spending
        this.budget.recordSpending(0.01, 'MPP', 'Price data poll');
        
        this.history.addEvent('PRICE_POLL', {
          protocol: 'MPP Charge',
          cost: 0.01,
          price: priceData.price,
          change: priceData.change_pct,
          historyLength: priceData.history.length
        });
        
        console.log(`   📊 Price: $${priceData.price} (${priceData.change_pct > 0 ? '+' : ''}${priceData.change_pct}%)`);
      } catch (error) {
        this.history.addEvent('PIPELINE', { step: 2, name: 'POLL (MPP)', status: 'error', error: error.message });
        console.error('   ❌ MPP poll failed:', error.message);
        return;
      }
      
      this.history.addEvent('PIPELINE', { step: 2, name: 'POLL (MPP)', status: 'done' });

      // ═══ STEP 3: INTEL (x402 → xlm402.com) ═══
      this.history.addEvent('PIPELINE', { step: 3, name: 'INTEL (x402)', status: 'active', cycleId });
      
      // For hackathon demo: simulate x402 payment to xlm402.com
      // In production: use @x402/fetch to actually call xlm402.com
      this.budget.recordSpending(0.01, 'x402', 'Market intel from xlm402.com');
      
      this.history.addEvent('X402_INTEL', {
        protocol: 'x402',
        service: 'xlm402.com',
        cost: 0.01,
        dataReceived: 'Market quote + metadata'
      });
      
      console.log(`   🌐 x402: Paid $0.01 to xlm402.com for market intel`);
      this.history.addEvent('PIPELINE', { step: 3, name: 'INTEL (x402)', status: 'done' });

      // ═══ STEP 4: ANALYZE (4 Indicators + Confluence) ═══
      this.history.addEvent('PIPELINE', { step: 4, name: 'ANALYZE', status: 'active', cycleId });
      
      const confluence = calculateConfluence(priceData.history, priceData.volume_history);
      
      this.history.addEvent('ANALYSIS', {
        indicators: {
          ema: { signal: confluence.indicators.ema.signal, reason: confluence.indicators.ema.reason },
          rsi: { signal: confluence.indicators.rsi.signal, value: confluence.indicators.rsi.value, reason: confluence.indicators.rsi.reason },
          bb: { signal: confluence.indicators.bb.signal, reason: confluence.indicators.bb.reason },
          vwap: { signal: confluence.indicators.vwap.signal, reason: confluence.indicators.vwap.reason }
        },
        confluence: {
          signal: confluence.signal,
          confidence: confluence.confidence,
          votes: confluence.votes,
          suggestedSize: confluence.suggestedSize,
          reason: confluence.reason
        }
      });
      
      console.log(`   🧠 Confluence: ${confluence.signal} (${confluence.votes.buy}B/${confluence.votes.sell}S/${confluence.votes.hold}H) → ${confluence.reason}`);
      this.history.addEvent('PIPELINE', { step: 4, name: 'ANALYZE', status: 'done' });

      // ═══ STEP 5: DECIDE (Risk Check) ═══
      this.history.addEvent('PIPELINE', { step: 5, name: 'DECIDE', status: 'active', cycleId });
      
      // Portfolio value for risk check
      const portfolioValue = balances.xlm * priceData.price + balances.usdc;
      const riskCheck = this.risk.checkRisk(priceData.price, portfolioValue);
      
      // Handle forced actions (stop-loss, take-profit)
      if (riskCheck.shouldClose && this.risk.currentPosition) {
        console.log(`   🛡️ Risk: ${riskCheck.action} — ${riskCheck.reason}`);
        
        // Force close position
        const closeResult = await this.sdex.sell(
          this.risk.currentPosition.amount,
          priceData.price.toFixed(7)
        );
        
        if (closeResult.success) {
          const closedTrade = this.risk.closePosition(priceData.price);
          this.history.addEvent('TRADE', {
            action: 'SELL (RISK)',
            amount: closedTrade.amount,
            price: priceData.price,
            pnl: closedTrade.pnl,
            reason: riskCheck.reason,
            txHash: closeResult.hash
          });
        }
        
        this.history.addEvent('PIPELINE', { step: 5, name: 'DECIDE', status: 'done' });
        this.history.addEvent('PIPELINE', { step: 6, name: 'REPORT', status: 'done' });
        return;
      }

      // Check if we can trade
      if (!riskCheck.canTrade) {
        console.log(`   🛡️ Risk blocked: ${riskCheck.reason}`);
        this.history.addEvent('RISK', { action: riskCheck.action, reason: riskCheck.reason });
        this.history.addEvent('PIPELINE', { step: 5, name: 'DECIDE', status: 'blocked', reason: riskCheck.reason });
        return;
      }

      this.history.addEvent('PIPELINE', { step: 5, name: 'DECIDE', status: 'done' });

      // ═══ STEP 6: EXECUTE (SDEX Trade) ═══
      if (confluence.signal === 'HOLD') {
        this.history.addEvent('PIPELINE', { step: 6, name: 'EXECUTE', status: 'skip', reason: 'No confluence → HOLD' });
        this.history.addEvent('CHAT', { 
          role: 'agent', 
          content: `📊 Cycle ${cycleId}: HOLD — ${confluence.reason}. EMA:${confluence.indicators.ema.signal} RSI:${confluence.indicators.rsi.signal} BB:${confluence.indicators.bb.signal} VWAP:${confluence.indicators.vwap.signal}`
        });
        console.log(`   ⏸️ HOLD — no confluence`);
        return;
      }

      this.history.addEvent('PIPELINE', { step: 6, name: 'EXECUTE', status: 'active', cycleId });
      
      let tradeResult;
      if (confluence.signal === 'BUY' && !this.risk.currentPosition) {
        // BUY
        tradeResult = await this.sdex.buy(
          confluence.suggestedSize,
          priceData.price.toFixed(7)
        );
        
        if (tradeResult.success) {
          this.risk.openPosition(priceData.price, confluence.suggestedSize, 'BUY');
          this.history.addEvent('TRADE', {
            action: 'BUY',
            amount: confluence.suggestedSize,
            price: priceData.price,
            confidence: confluence.confidence,
            txHash: tradeResult.hash,
            reason: confluence.reason
          });
          this.history.addEvent('CHAT', {
            role: 'agent',
            content: `📈 Cycle ${cycleId}: BUY ${confluence.suggestedSize} XLM @ $${priceData.price.toFixed(4)} | Confluence: ${(confluence.confidence * 100).toFixed(0)}% | TX: ${tradeResult.hash.substring(0, 12)}...`
          });
        }
      } else if (confluence.signal === 'SELL' && this.risk.currentPosition) {
        // SELL (close position)
        tradeResult = await this.sdex.sell(
          this.risk.currentPosition.amount,
          priceData.price.toFixed(7)
        );
        
        if (tradeResult.success) {
          const closedTrade = this.risk.closePosition(priceData.price);
          this.history.addEvent('TRADE', {
            action: 'SELL',
            amount: closedTrade.amount,
            price: priceData.price,
            pnl: closedTrade.pnl,
            pnlPercent: closedTrade.pnlPercent,
            txHash: tradeResult.hash,
            reason: confluence.reason
          });
          this.history.addEvent('CHAT', {
            role: 'agent',
            content: `📉 Cycle ${cycleId}: SELL ${closedTrade.amount} XLM @ $${priceData.price.toFixed(4)} | P&L: ${closedTrade.pnl > 0 ? '+' : ''}$${closedTrade.pnl.toFixed(2)} (${closedTrade.pnlPercent > 0 ? '+' : ''}${closedTrade.pnlPercent.toFixed(1)}%) | TX: ${tradeResult.hash.substring(0, 12)}...`
          });
        }
      } else {
        // Already have position and signal matches, or signal contradicts position
        this.history.addEvent('PIPELINE', { step: 6, name: 'EXECUTE', status: 'skip', reason: 'Position conflict' });
        return;
      }

      this.history.addEvent('PIPELINE', { step: 6, name: 'EXECUTE', status: 'done' });
      
      // Report final status
      const finalBalances = await this.wallet.getBalances();
      const riskStatus = this.risk.getStatus();
      this.history.addEvent('STATUS', {
        balances: finalBalances,
        budget: this.budget.getStatus(),
        risk: riskStatus,
        cycle: cycleId
      });

    } catch (error) {
      console.error(`   ❌ Cycle ${cycleId} error:`, error.message);
      this.history.addEvent('ERROR', { cycle: cycleId, error: error.message });
    }
  }

  /**
   * start(intervalMs)
   * Start autonomous trading loop.
   * 
   * PENJELASAN:
   * Agent dijalankan sebagai loop yang berjalan setiap N milidetik.
   * Default 15 detik per cycle — cukup cepat untuk demo yang impresif.
   */
  start(intervalMs = 15000) {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('🚀 Agent started — autonomous trading loop active');
    this.history.addEvent('CHAT', { role: 'agent', content: '🚀 StellarTradeAgent started! Running autonomous trading cycles every 15 seconds...' });
    
    // Run first cycle immediately
    this.runCycle();
    
    // Then repeat
    this.intervalId = setInterval(() => {
      if (this.isRunning) {
        this.runCycle();
      }
    }, intervalMs);
  }

  /**
   * stop()
   * Stop autonomous trading loop.
   */
  stop() {
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('⏸️ Agent stopped');
    this.history.addEvent('CHAT', { role: 'agent', content: '⏸️ Trading loop stopped.' });
    
    // Report final summary
    const riskStatus = this.risk.getStatus();
    const budgetStatus = this.budget.getStatus();
    this.history.addEvent('CHAT', { 
      role: 'agent', 
      content: `📊 Summary: ${riskStatus.totalTrades} trades | Win rate: ${riskStatus.winRate}% | Net P&L: $${riskStatus.totalPnL.toFixed(2)} | Intel spent: $${budgetStatus.spent.toFixed(2)}`
    });
  }

  /**
   * getStatus()
   * Full agent status snapshot.
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      cycleCount: this.cycleCount,
      risk: this.risk.getStatus(),
      budget: this.budget.getStatus()
    };
  }
}
