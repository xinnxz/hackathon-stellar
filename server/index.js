/**
 * index.js — Agent Server
 * =======================
 * Express server utama yang meng-host:
 * 1. Agent Brain (agentic trading loop via skills)
 * 2. REST API (untuk dashboard)
 * 3. SSE stream (real-time updates)
 * 
 * PORT: 3000
 */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { Keypair, Horizon } from '@stellar/stellar-sdk';
import { History } from './history.js';
import { Agent } from './agent.js';

// ═══════════════════════════════════
// Configuration
// ═══════════════════════════════════
const PORT = process.env.SERVER_PORT || 3000;
const AGENT_SECRET = process.env.AGENT_STELLAR_SECRET;
const AGENT_PUBLIC = process.env.AGENT_STELLAR_PUBLIC;
const PROVIDER_PUBLIC = process.env.MARKET_DATA_STELLAR_ADDRESS;
const HORIZON_URL = process.env.HORIZON_URL || 'https://horizon-testnet.stellar.org';
const MPP_URL = process.env.MPP_SERVER_URL || 'http://localhost:3002';

// ═══════════════════════════════════
// Initialize Components
// ═══════════════════════════════════
let agent;
const history = new History();
let agentPublicKey = '';

if (AGENT_SECRET && AGENT_SECRET !== 'S...') {
  const keypair = Keypair.fromSecret(AGENT_SECRET);
  agentPublicKey = keypair.publicKey();

  agent = new Agent({
    history,
    config: { mppServerUrl: MPP_URL }
  });

  console.log(`[KEY] Agent wallet: ${agentPublicKey}`);
} else {
  console.log('[WARN] No AGENT_STELLAR_SECRET set - running in demo mode');
}

// ═══════════════════════════════════
// Express App
// ═══════════════════════════════════
const app = express();
app.use(cors());
app.use(express.json());

/**
 * GET /api — Server info
 */
app.get('/api', (req, res) => {
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
    history.addEvent('CHAT', { role: 'agent', content: '💰 Use dashboard or /stellar-wallet for balance info.' });
    return res.json({ response: 'Check dashboard for wallet balance.' });
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
  const status = agent ? agent.getStatus() : { isRunning: false };
  
  // Fetch balance from Horizon directly
  try {
    if (agentPublicKey) {
      const server = new Horizon.Server(HORIZON_URL);
      const account = await server.loadAccount(agentPublicKey);
      const xlmBal = account.balances.find(b => b.asset_type === 'native');
      const usdcBal = account.balances.find(b => b.asset_code === 'USDC');
      status.balances = {
        xlm: parseFloat(xlmBal?.balance || 0),
        usdc: parseFloat(usdcBal?.balance || 0),
        publicKey: agentPublicKey
      };
    }
  } catch (e) {
    status.balances = { xlm: 0, usdc: 0, publicKey: agentPublicKey, error: e.message };
  }

  res.json(status);
});

/**
 * GET /api/dual-status — Both Agent + Provider wallet balances
 * 
 * PENJELASAN:
 * Menunjukkan machine-to-machine commerce:
 * Agent wallet: balance turun (bayar data)
 * Provider wallet: balance naik (terima pembayaran)
 */
app.get('/api/dual-status', async (req, res) => {
  const result = { agent: null, provider: null };
  const server = new Horizon.Server(HORIZON_URL);

  try {
    if (agentPublicKey) {
      const acc = await server.loadAccount(agentPublicKey);
      const xlm = acc.balances.find(b => b.asset_type === 'native');
      result.agent = { xlm: parseFloat(xlm?.balance || 0), publicKey: agentPublicKey };
    }
  } catch (e) { result.agent = { error: e.message }; }

  try {
    if (PROVIDER_PUBLIC) {
      const acc = await server.loadAccount(PROVIDER_PUBLIC);
      const xlm = acc.balances.find(b => b.asset_type === 'native');
      result.provider = { xlm: parseFloat(xlm?.balance || 0), publicKey: PROVIDER_PUBLIC };
    }
  } catch (e) { result.provider = { error: e.message }; }

  res.json(result);
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
  
  // Read analysis state
  try {
    const analysisPath = path.resolve(__dirname, 'analysis-state.json');
    if (fs.existsSync(analysisPath)) {
      result.analysis = JSON.parse(fs.readFileSync(analysisPath, 'utf-8'));
    }
  } catch (e) { result.analysis = null; }
  
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
// Serve React Frontend
app.use(express.static(path.resolve(__dirname, '../frontend/dist')));
app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../frontend/dist/index.html'));
});

const FINAL_PORT = process.env.PORT || process.env.SERVER_PORT || 3000;
app.listen(FINAL_PORT, () => {
  console.log('');
  console.log('========================================');
  console.log('   StellarTradeAgent Server');
  console.log('========================================');
  console.log(`   Port:       ${FINAL_PORT}`);
  console.log(`   MPP Server: ${MPP_URL}`);
  console.log(`   Horizon:    ${HORIZON_URL}`);
  console.log(`   Budget:     ${process.env.AGENT_BUDGET_USDC || '1.00'} USDC`);
  console.log(`   Agent:      ${agent ? 'READY' : 'NO WALLET'}`);
  console.log('========================================');
  console.log('   API:    http://localhost:' + FINAL_PORT);
  console.log('   SSE:    http://localhost:' + FINAL_PORT + '/api/events');
  console.log('========================================\n');
});
