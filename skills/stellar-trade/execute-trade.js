/**
 * execute-trade.js
 * =================
 * OpenClaw Skill Script: Eksekusi trade on-chain di Stellar SDEX
 * 
 * PENJELASAN:
 * Script ini melakukan operasi on-chain yang sebenarnya:
 * 1. Membuat Stellar transaction dengan manageBuyOffer/manageSellOffer
 * 2. Sign dengan agent's secret key
 * 3. Submit ke Horizon / Stellar network
 * 4. Track posisi dan P&L
 * 
 * Usage: node execute-trade.js <BUY|SELL> <AMOUNT>
 * Example: node execute-trade.js BUY 100
 */
import { loadEnv } from '../env-loader.js';
loadEnv();
import {
  Keypair, Asset, Networks, TransactionBuilder, Operation, Horizon, Memo
} from '@stellar/stellar-sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AGENT_SECRET = process.env.AGENT_STELLAR_SECRET;
const HORIZON_URL = process.env.HORIZON_URL || 'https://horizon-testnet.stellar.org';
const USDC_ISSUER = process.env.USDC_ISSUER || 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
const TRADE_STATE_FILE = path.resolve(__dirname, '../../server/trade-state.json');
const PRICE_HISTORY_FILE = path.resolve(__dirname, '../../server/price-history.json');
const ANALYSIS_STATE_FILE = path.resolve(__dirname, '../../server/analysis-state.json');

function loadTradeState() {
  try {
    if (fs.existsSync(TRADE_STATE_FILE)) {
      return JSON.parse(fs.readFileSync(TRADE_STATE_FILE, 'utf-8'));
    }
  } catch (e) { /* */ }
  return {
    position: null, // { entryPrice, amount, side, timestamp }
    trades: [],
    totalPnL: 0,
    winningTrades: 0,
    losingTrades: 0,
    lastTradeTime: 0
  };
}

function saveTradeState(state) {
  fs.mkdirSync(path.dirname(TRADE_STATE_FILE), { recursive: true });
  fs.writeFileSync(TRADE_STATE_FILE, JSON.stringify(state, null, 2));
}

function getCurrentPrice() {
  try {
    const history = JSON.parse(fs.readFileSync(PRICE_HISTORY_FILE, 'utf-8'));
    return history[history.length - 1]?.price || 0.15;
  } catch (e) {
    return 0.15;
  }
}

/**
 * buildAuditMemo — On-Chain Audit Trail
 * ======================================
 * PENJELASAN:
 * Encode agent reasoning ke Stellar TX memo (max 28 chars).
 * Juri bisa verify di stellar.expert KENAPA agent trade.
 * 
 * Format: <ACTION>:c<CONF>:<INDICATORS>:<PRICE>
 * Contoh: BUY:c85:ERBV:0.162
 *   BUY = action
 *   c85 = confidence 85%
 *   E=EMA,R=RSI,B=BB,V=VWAP (yang agree)
 *   0.162 = entry price
 */
function buildAuditMemo(action, price) {
  try {
    if (fs.existsSync(ANALYSIS_STATE_FILE)) {
      const analysis = JSON.parse(fs.readFileSync(ANALYSIS_STATE_FILE, 'utf-8'));
      const conf = Math.round((analysis.confluence?.confidence || 0) * 100);
      const ind = analysis.indicators || {};
      const agreeing = [];
      if (ind.ema?.signal === action) agreeing.push('E');
      if (ind.rsi?.signal === action) agreeing.push('R');
      if (ind.bb?.signal === action) agreeing.push('B');
      if (ind.vwap?.signal === action) agreeing.push('V');
      // Max 28 chars: BUY:c100:ERBV:0.123456
      return `${action}:c${conf}:${agreeing.join('')}:${price.toFixed(4)}`.substring(0, 28);
    }
  } catch (e) { /* fallback */ }
  return `${action}:${price.toFixed(4)}`;
}

async function main() {
  const action = process.argv[2]?.toUpperCase();
  const amount = parseFloat(process.argv[3]);

  if (!action || !['BUY', 'SELL'].includes(action)) {
    console.log(JSON.stringify({ error: 'Usage: node execute-trade.js <BUY|SELL> <AMOUNT>' }));
    return;
  }

  if (!amount || amount <= 0) {
    console.log(JSON.stringify({ error: 'Amount must be a positive number' }));
    return;
  }

  if (!AGENT_SECRET || AGENT_SECRET === 'S...') {
    console.log(JSON.stringify({ error: 'AGENT_STELLAR_SECRET not set' }));
    return;
  }

  const state = loadTradeState();
  const currentPrice = getCurrentPrice();

  // ═══ Risk Checks ═══
  
  // Cooldown check (60 seconds)
  const timeSinceLastTrade = Date.now() - state.lastTradeTime;
  if (timeSinceLastTrade < 60000 && state.lastTradeTime > 0) {
    const waitSec = Math.ceil((60000 - timeSinceLastTrade) / 1000);
    console.log(JSON.stringify({
      error: `Cooldown active. Wait ${waitSec}s before next trade.`,
      risk: 'COOLDOWN'
    }));
    return;
  }

  // Max drawdown check
  if (state.totalPnL < -0.15) {
    console.log(JSON.stringify({
      error: `Max drawdown reached (${state.totalPnL.toFixed(2)} USDC). Trading halted.`,
      risk: 'MAX_DRAWDOWN'
    }));
    return;
  }

  // ═══ Execute Trade ═══
  try {
    const keypair = Keypair.fromSecret(AGENT_SECRET);
    const server = new Horizon.Server(HORIZON_URL);
    const account = await server.loadAccount(keypair.publicKey());

    const XLM = Asset.native();
    const USDC = new Asset('USDC', USDC_ISSUER);

    // Create manage offer operation
    let operation;
    if (action === 'BUY') {
      // Buy XLM with USDC
      operation = Operation.manageBuyOffer({
        selling: USDC,
        buying: XLM,
        buyAmount: amount.toFixed(7),
        price: (1 / currentPrice).toFixed(7), // Price in USDC per XLM inverted
        offerId: '0' // New offer
      });
    } else {
      // Sell XLM for USDC 
      operation = Operation.manageSellOffer({
        selling: XLM,
        buying: USDC,
        amount: amount.toFixed(7),
        price: currentPrice.toFixed(7), // Price in USDC per XLM
        offerId: '0'
      });
    }

    // Build audit memo for on-chain reasoning trail
    const auditMemo = buildAuditMemo(action, currentPrice);
    console.error(`📝 [Audit] Memo: "${auditMemo}"`);

    const tx = new TransactionBuilder(account, {
      fee: '100000',
      networkPassphrase: Networks.TESTNET
    })
      .addOperation(operation)
      .addMemo(Memo.text(auditMemo))  // ON-CHAIN REASONING!
      .setTimeout(30)
      .build();

    tx.sign(keypair);
    const result = await server.submitTransaction(tx);

    // Calculate P&L if closing a position
    let pnl = null;
    let pnlPercent = null;
    if (state.position && action !== state.position.side) {
      // Closing position
      const entryValue = state.position.amount * state.position.entryPrice;
      const exitValue = state.position.amount * currentPrice;
      
      if (state.position.side === 'BUY') {
        pnl = exitValue - entryValue;
      } else {
        pnl = entryValue - exitValue;
      }
      
      pnlPercent = (pnl / entryValue) * 100;
      state.totalPnL += pnl;
      if (pnl > 0) state.winningTrades++;
      else state.losingTrades++;
      state.position = null;
    } else {
      // Opening position
      state.position = {
        side: action,
        amount: amount,
        entryPrice: currentPrice,
        timestamp: new Date().toISOString()
      };
    }

    // Record trade
    state.trades.push({
      action, amount, price: currentPrice,
      pnl, pnlPercent,
      txHash: result.hash,
      timestamp: new Date().toISOString()
    });
    state.lastTradeTime = Date.now();
    saveTradeState(state);

    const totalTrades = state.winningTrades + state.losingTrades;
    const winRate = totalTrades > 0 ? Math.round((state.winningTrades / totalTrades) * 100) : 0;

    console.log(JSON.stringify({
      success: true,
      action,
      amount,
      price: currentPrice,
      pnl: pnl ? parseFloat(pnl.toFixed(4)) : null,
      pnlPercent: pnlPercent ? parseFloat(pnlPercent.toFixed(2)) : null,
      txHash: result.hash,
      explorerUrl: `https://stellar.expert/explorer/testnet/tx/${result.hash}`,
      position: state.position,
      stats: {
        totalPnL: parseFloat(state.totalPnL.toFixed(4)),
        totalTrades: state.trades.length,
        winRate,
        winningTrades: state.winningTrades,
        losingTrades: state.losingTrades
      }
    }));
  } catch (err) {
    let errorDetail = err.message;
    // Try to extract Horizon error details
    if (err.response?.data?.extras?.result_codes) {
      errorDetail = JSON.stringify(err.response.data.extras.result_codes);
    } else if (err.response?.data) {
      errorDetail = JSON.stringify(err.response.data).substring(0, 300);
    }
    console.log(JSON.stringify({
      error: `Trade failed: ${errorDetail}`,
      action, amount, price: currentPrice
    }));
  }
}

main();
