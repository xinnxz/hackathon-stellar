# 🏦 StellarTradeAgent — AI Trading Agent on Stellar

> An autonomous AI agent that **pays for market intelligence** using MPP & x402 protocols and executes on-chain trades on Stellar SDEX.

![Stellar](https://img.shields.io/badge/Stellar-Testnet-blue)
![OpenClaw](https://img.shields.io/badge/OpenClaw-Skills-orange)
![License](https://img.shields.io/badge/License-MIT-green)

## 🎯 What Is This?

StellarTradeAgent is a **fully autonomous trading agent** that demonstrates the future of AI + crypto payments:

1. **🤖 AI Agent** (via OpenClaw) decides when to trade
2. **💳 Pays for data** using MPP (Machine Payments Protocol) — real on-chain payments
3. **🌐 Pays for intelligence** using x402 (HTTP 402 Payment Required) protocol
4. **📊 Analyzes markets** with 4 technical indicators + confluence scoring
5. **📈 Executes trades** directly on the Stellar SDEX (on-chain, verifiable)
6. **🛡️ Manages risk** with 5 automated safety rules

### The Key Innovation

Traditional bots use free APIs. **StellarTradeAgent pays for every piece of data it consumes** — demonstrating a future where AI agents are economic actors that participate in machine-to-machine commerce.

```
Agent → Pays 0.01 USDC (MPP) → Gets price data
Agent → Pays 0.05 USDC (x402) → Gets sentiment analysis
Agent → Analyzes 4 indicators → Confluence signal
Agent → Executes SDEX trade → On-chain TX hash
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│                 OpenClaw Runtime                 │
│  ┌──────┐  ┌──────────┐  ┌────────────────┐    │
│  │SOUL  │  │ AGENTS   │  │   5 Custom     │    │
│  │.md   │  │ .md      │  │   Skills       │    │
│  │      │  │ Trading  │  │                │    │
│  │ AI   │  │ Rules &  │  │ wallet ─────── │    │
│  │ Per- │  │ Pipeline │  │ poll-price ─── │──── MPP Server
│  │ sona │  │          │  │ x402-intel ─── │──── xlm402.com
│  └──────┘  └──────────┘  │ analyze ────── │    │
│                          │ trade ──────── │──── Stellar SDEX
│                          └────────────────┘    │
└─────────────────────────────────────────────────┘
         │                          │
         ▼                          ▼
┌─────────────────┐    ┌──────────────────────┐
│  Express API    │    │  Vite + React        │
│  (Port 3000)    │───▶│  Dashboard           │
│  SSE Stream     │    │  Real-time monitoring│
└─────────────────┘    └──────────────────────┘
```

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Agent Runtime | **OpenClaw** | Orchestration, skill execution, autonomy |
| AI Model | **Gemini 2.0 Flash** | Trading reasoning & decision making |
| Blockchain | **Stellar SDK** | On-chain transactions, SDEX trading |
| Price Data | **MPP (mppx)** | Machine-paid market data access |
| Intelligence | **x402 Protocol** | HTTP 402 paid sentiment analysis |
| Dashboard | **Vite + React + Recharts** | Real-time trading visualization |
| Backend API | **Express.js + SSE** | REST API + Server-Sent Events |

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- OpenClaw (`npm install -g openclaw@latest`)

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/hackathon-stellar.git
cd hackathon-stellar

# Install all dependencies
npm install                         # Root (Stellar SDK)
cd server && npm install && cd ..   # Server deps
cd services/market-data && npm install && cd ../.. # MPP deps
cd frontend && npm install && cd ..  # Dashboard deps
```

### 2. Setup Wallets

```bash
node scripts/setup-wallets.js           # Generate 2 testnet wallets
# Copy the output keys into .env

node scripts/setup-usdc-trustline.js    # Add USDC trustline
node scripts/seed-orderbook.js          # Seed SDEX with liquidity
```

### 3. Configure .env

```env
AGENT_STELLAR_SECRET=S...your-agent-secret...
AGENT_STELLAR_PUBLIC=G...your-agent-public...
MARKET_DATA_STELLAR_SECRET=S...market-data-secret...
MARKET_DATA_STELLAR_ADDRESS=G...market-data-public...
GEMINI_API_KEY=your-gemini-key
```

### 4. Run Everything

```bash
# Terminal 1: MPP Market Data Server
npm run mpp

# Terminal 2: Agent Backend
npm run server

# Terminal 3: Dashboard
npm run dashboard

# Terminal 4: OpenClaw Agent (interactive)
openclaw tui
```

### 5. Trade!

In OpenClaw TUI, type:
```
/stellar-wallet          # Check balances
/stellar-poll-price      # Pay MPP → get market data
/stellar-analyze         # Run 4 indicators
/stellar-trade SELL 50   # Execute on SDEX
```

## 📊 5 Custom Skills

### `/stellar-wallet` 💰
Check XLM + USDC balances and intel budget status.

### `/stellar-poll-price` 📊
Pay **0.01 USDC** via MPP protocol to get current XLM/USDC market data.

### `/stellar-x402-intel` 🌐
Pay **0.05 USDC** via x402 protocol for premium sentiment analysis.

### `/stellar-analyze` 🧠
Run 4 technical indicators with confluence scoring:
- **EMA Cross** — Fast/slow moving average crossover
- **RSI** — Relative Strength Index (overbought/oversold)
- **Bollinger Bands** — Volatility-based price position
- **VWAP** — Volume Weighted Average Price
- **Confluence** — ≥3/4 agreement required for trade signal

### `/stellar-trade` 📈
Execute BUY/SELL on Stellar SDEX with risk management:
- Stop-loss: -5%
- Take-profit: +8%
- Max drawdown: -15%
- Position sizing: ≤30% of balance
- Cooldown: 60s between trades

## 🛡️ Risk Management

| Rule | Threshold | Action |
|------|-----------|--------|
| Stop Loss | -5% | Auto close position |
| Take Profit | +8% | Auto close position |
| Max Drawdown | -15% | Halt all trading |
| Position Size | 30% max | Limit per trade |
| Cooldown | 60 seconds | Enforce between trades |

## 📁 Project Structure

```
hackathon-stellar/
├── SOUL.md              # OpenClaw agent personality
├── AGENTS.md            # Trading rules & pipeline
├── TOOLS.md             # Skill documentation
├── skills/              # 5 OpenClaw custom skills
│   ├── stellar-wallet/
│   ├── stellar-poll-price/
│   ├── stellar-analyze/
│   ├── stellar-trade/
│   └── stellar-x402-intel/
├── server/              # Express backend + modules
│   ├── index.js         # API + SSE
│   ├── wallet.js        # Stellar wallet management
│   ├── budget.js        # Intel budget tracker
│   ├── risk.js          # Risk management engine
│   ├── sdex.js          # SDEX trade execution
│   ├── indicators.js    # Technical analysis
│   ├── agent.js         # AI brain (Gemini)
│   └── history.js       # Event store + SSE
├── services/market-data/# MPP Price Server
│   ├── server.js        # Express + MPP Charge
│   └── price-engine.js  # Controlled wave generator
├── frontend/            # Vite + React dashboard
│   └── src/
│       ├── App.jsx      # Main dashboard
│       └── components/  # 8 dashboard panels
├── scripts/             # Setup scripts
│   ├── setup-wallets.js
│   ├── setup-usdc-trustline.js
│   └── seed-orderbook.js
└── .env                 # Configuration
```

## 🔗 Verifiable On-Chain

Every trade is verifiable on Stellar testnet:
- **Explorer**: [stellar.expert/explorer/testnet](https://stellar.expert/explorer/testnet)
- All transaction hashes are logged and can be verified
- MPP payments are real on-chain transactions

## 🏆 Built For

**Stellar Hacks: Agents** — Building autonomous AI agents that leverage Stellar's payment protocols (x402, MPP) for machine-to-machine commerce.

## 📄 License

MIT
