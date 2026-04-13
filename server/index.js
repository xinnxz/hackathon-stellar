/**
 * index.js — Agent Server
 * =======================
 * Express server utama yang meng-host:
 * 1. Agent Brain (agentic trading loop)
 * 2. REST API (untuk dashboard)
 * 3. SSE stream (real-time updates)
 * 
 * PORT: 3000
 * 
 * ENDPOINTS:
 * POST /api/chat        → User command → agent response
 * POST /api/start       → Start autonomous trading
 * POST /api/stop        → Stop trading
 * GET  /api/events      → SSE stream
 * GET  /api/status      → Agent state
 * GET  /api/history     → All events
 */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { Keypair } from '@stellar/stellar-sdk';
import { Wallet } from './wallet.js';
import { Budget } from './budget.js';
import { RiskManager } from './risk.js';
import { SDEXTrader } from './sdex.js';
import { History } from './history.js';
import { Agent } from './agent.js';

// ═══════════════════════════════════
// Configuration
// ═══════════════════════════════════
const PORT = process.env.SERVER_PORT || 3000;
const AGENT_SECRET = process.env.AGENT_STELLAR_SECRET;
const HORIZON_URL = process.env.HORIZON_URL || 'https://horizon-testnet.stellar.org';
const BUDGET_LIMIT = parseFloat(process.env.AGENT_BUDGET_USDC || '1.00');
const MPP_URL = process.env.MPP_SERVER_URL || 'http://localhost:3002';

// ═══════════════════════════════════
// Initialize Components
// ═══════════════════════════════════
let agent;
const history = new History();

if (AGENT_SECRET && AGENT_SECRET !== 'S...') {
  const keypair = Keypair.fromSecret(AGENT_SECRET);
  const wallet = new Wallet(AGENT_SECRET, HORIZON_URL);
  const budget = new Budget(BUDGET_LIMIT);
  const risk = new RiskManager();
  const sdex = new SDEXTrader(keypair, HORIZON_URL);

  agent = new Agent({
    wallet,
    budget,
    risk,
    sdex,
    history,
    config: {
      mppServerUrl: MPP_URL
    }
  });

  console.log(`🔑 Agent wallet: ${keypair.publicKey()}`);
} else {
  console.log('⚠️  No AGENT_STELLAR_SECRET set — running in demo mode');
  console.log('   Run: node scripts/setup-wallets.js to generate keys');
}

// ═══════════════════════════════════
// Express App
// ═══════════════════════════════════
const app = express();
app.use(cors());
app.use(express.json());

/**
 * GET / — Server info
 */
app.get('/', (req, res) => {
  res.json({
    name: 'StellarTradeAgent',
    version: '1.0.0',
    description: 'OpenClaw-inspired AI trading agent on Stellar',
    status: agent ? (agent.isRunning ? 'trading' : 'idle') : 'no-wallet',
    endpoints: {
      'POST /api/start': 'Start autonomous trading',
      'POST /api/stop': 'Stop trading',
      'POST /api/chat': 'Send message to agent',
      'GET /api/events': 'SSE stream (real-time updates)',
      'GET /api/status': 'Current agent state',
      'GET /api/history': 'All events history'
    }
  });
});

/**
 * POST /api/start — Start autonomous trading
 */
app.post('/api/start', (req, res) => {
  if (!agent) {
    return res.status(400).json({ error: 'Agent not initialized. Set AGENT_STELLAR_SECRET in .env' });
  }
  
  const interval = req.body.interval || 15000; // Default 15s per cycle
  agent.start(interval);
  res.json({ success: true, message: 'Trading started', interval });
});

/**
 * POST /api/stop — Stop autonomous trading
 */
app.post('/api/stop', (req, res) => {
  if (!agent) {
    return res.status(400).json({ error: 'Agent not initialized' });
  }
  
  agent.stop();
  res.json({ success: true, message: 'Trading stopped' });
});

/**
 * POST /api/chat — Send message to agent
 * 
 * PENJELASAN:
 * User bisa kirim command via chat:
 * - "start trading" → mulai loop
 * - "stop" → hentikan
 * - "status" → lihat status
 * - "balance" → cek saldo
 * - Pertanyaan lain → agent jawab
 */
app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Message required' });
  }

  // Log user message
  history.addEvent('CHAT', { role: 'user', content: message });

  // Simple command parsing
  const msg = message.toLowerCase().trim();
  
  if (msg.includes('start') && msg.includes('trad')) {
    if (agent) {
      agent.start();
      history.addEvent('CHAT', { role: 'agent', content: '🚀 Starting autonomous trading loop...' });
    }
    return res.json({ response: 'Trading started!' });
  }
  
  if (msg === 'stop' || msg.includes('stop trad')) {
    if (agent) agent.stop();
    return res.json({ response: 'Trading stopped.' });
  }
  
  if (msg === 'status' || msg.includes('how are')) {
    const status = agent ? agent.getStatus() : { isRunning: false, message: 'No wallet configured' };
    history.addEvent('CHAT', { role: 'agent', content: `Status: ${status.isRunning ? '🟢 Trading' : '⏸️ Idle'} | Cycles: ${status.cycleCount || 0}` });
    return res.json({ response: status });
  }
  
  if (msg === 'balance' || msg.includes('wallet')) {
    if (agent) {
      const balances = await agent.wallet.getBalances();
      history.addEvent('CHAT', { role: 'agent', content: `💰 Balance: ${balances.xlm.toFixed(2)} XLM | ${balances.usdc.toFixed(2)} USDC` });
      return res.json({ response: balances });
    }
  }

  // Default response
  history.addEvent('CHAT', { role: 'agent', content: `I understand you said: "${message}". Try "start trading", "stop", "status", or "balance".` });
  return res.json({ response: `Commands: "start trading", "stop", "status", "balance"` });
});

/**
 * GET /api/events — SSE stream
 * 
 * Dashboard connects here for real-time updates.
 * Every agent action is streamed as a JSON event.
 */
app.get('/api/events', (req, res) => {
  history.addSSEClient(res);
});

/**
 * GET /api/status — Current agent state
 */
app.get('/api/status', async (req, res) => {
  if (!agent) {
    return res.json({ isRunning: false, error: 'No wallet configured' });
  }

  const status = agent.getStatus();
  
  try {
    const balances = await agent.wallet.getBalances();
    status.balances = balances;
  } catch (e) {
    status.balances = { error: e.message };
  }

  res.json(status);
});

/**
 * GET /api/history — All events
 */
app.get('/api/history', (req, res) => {
  const type = req.query.type;
  const events = type ? history.getByType(type) : history.getAll();
  res.json({ events });
});

/**
 * GET /api/skills-status — Status dari semua OpenClaw skills
 * 
 * PENJELASAN:
 * OpenClaw skills menulis state ke JSON files.
 * Endpoint ini membaca file-file tersebut dan menggabungkannya
 * untuk dashboard.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.get('/api/skills-status', (req, res) => {
  const result = {};
  
  // Read budget state
  try {
    const budgetPath = path.resolve(__dirname, 'budget-state.json');
    if (fs.existsSync(budgetPath)) {
      result.budget = JSON.parse(fs.readFileSync(budgetPath, 'utf-8'));
    }
  } catch (e) { result.budget = null; }
  
  // Read price history
  try {
    const historyPath = path.resolve(__dirname, 'price-history.json');
    if (fs.existsSync(historyPath)) {
      const data = JSON.parse(fs.readFileSync(historyPath, 'utf-8'));
      result.prices = data;
      result.latestPrice = data[data.length - 1]?.price || null;
      result.priceCount = data.length;
    }
  } catch (e) { result.prices = []; }
  
  // Read trade state
  try {
    const tradePath = path.resolve(__dirname, 'trade-state.json');
    if (fs.existsSync(tradePath)) {
      result.trades = JSON.parse(fs.readFileSync(tradePath, 'utf-8'));
    }
  } catch (e) { result.trades = null; }
  
  res.json(result);
});

/**
 * POST /api/openclaw-webhook — Receive events from OpenClaw
 * 
 * PENJELASAN:
 * OpenClaw bisa dikonfigurasi untuk mengirim webhook setiap kali
 * agent menjalankan skill. Kita tangkap event ini dan broadcast
 * ke dashboard via SSE.
 * 
 * Event format:
 * { type: "skill_executed", skill: "stellar-poll-price", result: {...} }
 */
app.post('/api/openclaw-webhook', (req, res) => {
  const event = req.body;
  
  if (event.type === 'skill_executed') {
    history.addEvent('OPENCLAW_SKILL', {
      skill: event.skill,
      result: event.result,
      timestamp: new Date().toISOString()
    });
  } else if (event.type === 'agent_message') {
    history.addEvent('CHAT', {
      role: 'agent',
      content: event.message
    });
  } else {
    history.addEvent('OPENCLAW_EVENT', event);
  }
  
  res.json({ received: true });
});

// ═══════════════════════════════════
// Start Server
// ═══════════════════════════════════
app.listen(PORT, () => {
  console.log('');
  console.log('🏦 ════════════════════════════════════════');
  console.log('   StellarTradeAgent Server');
  console.log('════════════════════════════════════════');
  console.log(`   Port:       ${PORT}`);
  console.log(`   MPP Server: ${MPP_URL}`);
  console.log(`   Horizon:    ${HORIZON_URL}`);
  console.log(`   Budget:     ${BUDGET_LIMIT} USDC`);
  console.log(`   Agent:      ${agent ? '✅ Ready' : '⚠️ No wallet'}`);
  console.log('════════════════════════════════════════');
  console.log('   API:    http://localhost:' + PORT);
  console.log('   SSE:    http://localhost:' + PORT + '/api/events');
  console.log('════════════════════════════════════════\n');
});
