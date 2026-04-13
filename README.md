# StellarTradeAgent

> **Autonomous AI trading agent that pays for market intelligence and executes trades on the Stellar network — every payment and decision is a real, verifiable on-chain transaction.**

---

## Overview

StellarTradeAgent is an autonomous trading system built on the Stellar blockchain. Unlike traditional trading bots that rely on simulated data, this agent operates with real on-chain payments using two Stellar-native monetization protocols: **MPP (Micropayment Protocol)** and **x402 (HTTP 402 Payment Required)**.

The agent continuously runs a decision pipeline: it pays for market data, performs technical analysis, optionally purchases premium intelligence, and executes trades on the Stellar SDEX (Decentralized Exchange). Every action — including the AI's reasoning — is recorded on-chain as a verifiable audit trail.

**This is not a user-facing trading app.** There is no "Connect Wallet" button. The agent owns its own wallet and operates independently. The dashboard serves as a real-time monitoring interface, allowing observers to watch the agent's autonomous behavior, verify its on-chain transactions, and inspect its decision-making process.

---

## Key Features

| Feature | Description |
|---------|-------------|
| Real On-Chain Payments | Every data request is paid via MPP or x402 — verifiable on [stellar.expert](https://stellar.expert) |
| Dual Protocol Support | Uses both **MPP Charge** (Soroban SAC) and **x402** (Coinbase Facilitator) |
| On-Chain Audit Trail | AI reasoning is embedded in transaction memos (e.g., `SELL:c25:V:0.1578`) |
| Dual-Agent Economy | Agent wallet pays, Provider wallet earns — real machine-to-machine commerce |
| Live Dashboard | Real-time monitoring with price charts, P&L tracking, and pipeline visualization |
| Risk Management | Built-in stop-loss, take-profit, max drawdown, and position sizing rules |

---

## On-Chain Verification

Every interaction creates a verifiable Stellar transaction:

| Action | Protocol | TX Hash | Verify |
|--------|----------|---------|--------|
| Price Data Payment | MPP Charge | `0fb5e990...` | [View on stellar.expert](https://stellar.expert/explorer/testnet/tx/0fb5e990ec475420b6019dfad98aa6eb239d0c7b26e292bb30d3387fb1c67d01) |
| Intelligence Payment | x402 | `6d3de10e...` | [View on stellar.expert](https://stellar.expert/explorer/testnet/tx/6d3de10eced742665508151615975c04ae333ad099ff453ec9314f4f412efebd) |
| SDEX Trade | SDEX | `90bfd1bb...` | [View on stellar.expert](https://stellar.expert/explorer/testnet/tx/90bfd1bb895f9b10f031a6e7016e9a90b2efb445274c8360ef17ccddcbc94e2d) |

**Reading the Audit Memo:** Trade TX `90bfd1bb...` contains memo `SELL:c25:V:0.1578`:
- `SELL` — action taken
- `c25` — 25% confidence score
- `V` — VWAP indicator triggered the signal
- `0.1578` — execution price

Anyone can independently verify why the AI traded by reading the transaction memo on-chain.

---

## Architecture

```
+---------------------------------------------------------------+
|                    StellarTradeAgent System                    |
|                                                               |
|  +---------------+   +---------------+   +--------------+    |
|  | MPP Server    |   | x402 Server   |   | Stellar      |    |
|  | @stellar/mpp  |   | @x402/express |   | Testnet      |    |
|  | Port 3002     |   | Port 3003     |   | (Horizon)    |    |
|  | USDC via SAC  |   | USDC via      |   | SDEX DEX     |    |
|  +-------+-------+   | Facilitator   |   +------+-------+    |
|          |            +-------+-------+          |            |
|          | 402+USDC           | 402+USDC         |            |
|          v                    v                  |            |
|  +-----------------------------------------------+            |
|  |           Agent Server (Port 3000)            |            |
|  |                                               |            |
|  |  Autonomous Loop (every 15-30s):              |            |
|  |  1. Check wallet balance                      |            |
|  |  2. Pay MPP -> get price (real TX)            |            |
|  |  3. Analyze (EMA, RSI, BB, VWAP)             |            |
|  |  4. Pay x402 -> get intel (real TX)           |            |
|  |  5. Trade on SDEX (real TX + audit memo)      +------------+
|  |  6. Report results via SSE                    |
|  +------------------------+----------------------+
|                           | SSE events
|                           v
|  +----------------------------------------------------+
|  |           React Dashboard (Port 5173)               |
|  |                                                     |
|  |  Dual Wallets | Budget Gauge | P&L Tracker          |
|  |  Decision Pipeline | Agent Reasoning                |
|  |  Price Chart | Indicator Panel | TX Ledger           |
|  +----------------------------------------------------+
+---------------------------------------------------------------+
```

---

## Why No "Connect Wallet"?

This project is an **autonomous AI agent**, not a user-facing DeFi application.

| Aspect | DeFi App | StellarTradeAgent |
|--------|----------|-------------------|
| Wallet | User connects via Freighter | Agent owns its own wallet |
| Who trades? | User clicks buttons | AI decides autonomously |
| Control model | Manual | Fully autonomous |
| Purpose | Human trading tool | Machine-to-machine commerce demo |

The agent has its own wallet (configured in `.env`). The dashboard is a **monitoring interface** — think of it as a CCTV feed watching a robot trader operate. Users can Start/Stop the agent and observe its behavior, but the agent manages its own funds independently.

---

## Agent Skills

Each skill is an independent, modular script compatible with the OpenClaw agent framework:

| Skill | Cost | Description |
|-------|------|-------------|
| `/stellar-wallet` | Free | Check XLM/USDC balances and budget status |
| `/stellar-poll-price` | 0.01 USDC | Pay via MPP (Soroban SAC) to receive XLM/USDC price |
| `/stellar-analyze` | Free | Run 4 technical indicators and confluence scoring |
| `/stellar-x402-intel` | 0.01 USDC | Pay via x402 (Facilitator) to receive market sentiment |
| `/stellar-trade` | Gas fee | Execute SDEX trade with AI reasoning in transaction memo |

---

## Risk Management

| Rule | Threshold | Purpose |
|------|-----------|---------|
| Stop-loss | -5% | Automatically close losing positions |
| Take-profit | +8% | Lock in gains at target |
| Max drawdown | -15% | Emergency halt all trading |
| Position sizing | Max 30% | Never risk entire balance on one trade |
| Cooldown | 60 seconds | Prevent overtrading between cycles |

---

## Getting Started

### Prerequisites

- **Node.js** v18 or later
- **npm** v9 or later
- Internet connection (for Stellar Testnet access)

### 1. Clone and Install

```bash
git clone https://github.com/xinnxz/hackathon-stellar.git
cd hackathon-stellar
npm run install:all
```

### 2. Configure Wallets

The project requires two Stellar testnet wallets: one for the Agent (payer) and one for the Provider (earner).

**Option A — Use the setup scripts (recommended):**
```bash
npm run setup        # Generates keypairs and funds via Friendbot
npm run trustline    # Establishes USDC trustlines
npm run seed         # Seeds initial USDC balances
```

**Option B — Manual configuration:**
1. Go to [Stellar Laboratory](https://laboratory.stellar.org/#account-creator?network=test)
2. Create two keypairs (Agent + Provider)
3. Fund both with Friendbot
4. Copy the keys into `.env` (see `.env.example` for the template)

### 3. Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Key variables:
```env
# Stellar Wallets (testnet)
AGENT_STELLAR_SECRET=S...       # Agent's secret key
AGENT_STELLAR_PUBLIC=G...       # Agent's public key
MARKET_DATA_STELLAR_SECRET=S... # Provider's secret key
MARKET_DATA_STELLAR_ADDRESS=G.. # Provider's public key

# Service URLs (default ports)
MPP_SERVER_URL=http://localhost:3002
X402_INTEL_URL=http://localhost:3003

# Agent Configuration
AGENT_BUDGET_USDC=999999        # Intel budget limit
TRADE_PAIR=XLM/USDC
```

### 4. Start the System

```bash
npm run dev
```

This starts all 4 services concurrently:
| Service | Port | Description |
|---------|------|-------------|
| MPP Market Data Server | 3002 | Serves price data, accepts MPP payments |
| x402 Intel Server | 3003 | Serves market intelligence, accepts x402 payments |
| Agent API Server | 3000 | Runs trading loop, exposes REST API + SSE |
| React Dashboard | 5173 | Real-time monitoring interface |

### 5. Open the Dashboard

Navigate to **http://localhost:5173** in your browser.

Click **"Start Trading"** to begin autonomous trading. The agent will immediately begin its decision pipeline and you will see:
- Live price updates in the chart
- Budget consumption as MPP/x402 payments are made
- Indicator analysis and confluence scoring
- Trade executions with on-chain verification links

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Blockchain | Stellar Testnet (Horizon API + Soroban RPC) |
| x402 Protocol | `@x402/express` + `@x402/stellar` + `@x402/fetch` (Official SDK) |
| MPP Protocol | `@stellar/mpp` + `mppx` (Official SDK) |
| Settlement | Soroban SAC USDC (Smart Asset Contract) |
| x402 Facilitator | `x402.org/facilitator` (Coinbase-managed) |
| Trading | Stellar SDEX (`manageSellOffer` / `manageBuyOffer`) |
| Backend | Node.js + Express + Server-Sent Events |
| Frontend | React 19 + Vite + Recharts |
| Agent Framework | OpenClaw-compatible modular skills |
| SDK | `@stellar/stellar-sdk` v14/v15 |

---

## Project Structure

```
hackathon-stellar/
├── SOUL.md                      # Agent persona (OpenClaw)
├── AGENTS.md                    # Trading rules and constraints
├── TOOLS.md                     # Available skills registry
├── skills/
│   ├── stellar-wallet/          # Balance check skill
│   ├── stellar-poll-price/      # MPP price polling skill
│   ├── stellar-analyze/         # Technical analysis skill (4 indicators)
│   ├── stellar-x402-intel/      # x402 intelligence skill
│   └── stellar-trade/           # SDEX trade execution skill
├── server/
│   ├── index.js                 # Express API + SSE server
│   ├── agent.js                 # Autonomous trading loop
│   ├── history.js               # Event history manager
│   ├── budget-state.json        # Intel budget tracker
│   ├── trade-state.json         # Trade P&L tracker
│   └── price-history.json       # Price data cache
├── services/
│   ├── market-data/             # MPP price server (port 3002)
│   └── x402-intel-server/       # x402 intelligence server (port 3003)
└── frontend/
    └── src/
        ├── App.jsx              # Main dashboard layout
        ├── index.css            # Design system
        └── components/          # UI components (10 modules)
```

---

## Built for Stellar Hacks: Agents

This project demonstrates real-world usage of Stellar's agent infrastructure:

- **x402 Protocol** — Official `@x402/express` middleware with Coinbase Facilitator settlement via Soroban SAC USDC
- **MPP Charge** — Official `@stellar/mpp` + `mppx` SDK with Soroban SAC USDC transfer
- **Soroban Smart Asset Contract** — All payments settled via Stellar's native smart contract layer
- **SDEX Trading** — Autonomous on-chain order execution with embedded AI reasoning in transaction memos
- **OpenClaw Skills** — 5 modular, independently executable agent capabilities
- **Machine-to-Machine Commerce** — Two autonomous agents exchanging value on the Stellar network

---

## License

MIT
