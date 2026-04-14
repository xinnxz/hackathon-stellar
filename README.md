# StellarTradeAgent

<div align="center">
  <img src="./frontend/public/logo.jpg" alt="StellarTradeAgent Logo" width="200" />
</div>

**An autonomous AI agent that pays for market intelligence and trades on Stellar — every payment and trade is a real on-chain transaction.**

[![Stellar](https://img.shields.io/badge/Stellar-Testnet-blue)](https://stellar.org)
[![x402](https://img.shields.io/badge/x402-Official_SDK-purple)](https://x402.org)
[![MPP](https://img.shields.io/badge/MPP-Official_SDK-green)](https://stellar.org)

---

## What is this?

StellarTradeAgent is an AI-powered trading bot that operates **completely on-chain**. Unlike traditional bots that just read APIs for free, this agent **pays for every piece of data it uses** through Stellar payment protocols (MPP and x402), then makes autonomous trading decisions on the Stellar SDEX.

**The key innovation:** Every action the agent takes — buying data, analyzing markets, executing trades — creates a verifiable Stellar transaction. You can audit the agent's entire decision history directly on the blockchain.

---

## Demo

> **[Watch the Demo Video](https://www.youtube.com/watch?v=SateXmjnaUU)**

Or run it yourself — takes about 2 minutes:

```bash
# Clone and install
git clone https://github.com/xinnxz/hackathon-stellar.git
cd hackathon-stellar
npm run install:all

# Setup testnet wallets (auto-generates keys + funds via Friendbot)
npm run setup
npm run trustline
npm run seed

# Start all services
npm run dev

# Open the dashboard
# http://localhost:5173
# Click "Start Trading" — the agent will begin its autonomous cycle
```

> **Note:** This runs on Stellar Testnet. No real money is involved. The agent's wallet is pre-configured and operates autonomously — there is no "Connect Wallet" flow because the AI agent owns its own wallet and makes independent trading decisions.

---

## How It Works

The agent runs a continuous cycle every 15 seconds:

```
Check Wallet → Pay for Price Data → Analyze Market → Pay for Intel → Trade → Report
                   (MPP payment)                      (x402 payment)   (SDEX)
```

Each step that costs money creates a **real Stellar transaction**:

| Step | What Happens | Cost | Protocol |
|------|-------------|------|----------|
| Poll Price | Agent pays for XLM/USDC price feed | 0.01 USDC | MPP (Soroban SAC) |
| Get Intel | Agent pays for market sentiment analysis | 0.05 USDC | x402 (HTTP 402) |
| Trade | Agent places buy/sell order on SDEX | Gas fee | Stellar SDEX |

**Every trade TX includes an audit memo** (e.g. `BUY:c75:EV:0.1126`) that encodes the AI's reasoning — readable by anyone on [stellar.expert](https://stellar.expert).

---

## On-Chain Proof

These are real transactions from the agent — click to verify:

| Action | TX Hash | Verify |
|--------|---------|--------|
| MPP Price Payment | `0fb5e990...` | [View on stellar.expert](https://stellar.expert/explorer/testnet/tx/0fb5e990ec475420b6019dfad98aa6eb239d0c7b26e292bb30d3387fb1c67d01) |
| x402 Intel Payment | `6d3de10e...` | [View on stellar.expert](https://stellar.expert/explorer/testnet/tx/6d3de10eced742665508151615975c04ae333ad099ff453ec9314f4f412efebd) |
| SDEX Trade (with memo) | `90bfd1bb...` | [View on stellar.expert](https://stellar.expert/explorer/testnet/tx/90bfd1bb895f9b10f031a6e7016e9a90b2efb445274c8360ef17ccddcbc94e2d) |

### 🏆 Live Testnet Session Results

During a continuous 2-hour autonomous testing session leading up to the submission, the reasoning engine executed flawlessly, proving its ability to easily overcome its own M2M operational data costs:

- **Data Costs Paid:** ~$2.40 USDC (over 240 autonomous on-chain MPP API requests)
- **Realized PnL:** **+$16.85**
- **Win Rate:** **100%** (Every single limit-order reached positive execution, guided strictly by the exact 4/4 Wyckoff indicator confluence constraint).
- **Net Economics:** Highly positive. The AI has proven to be a fully self-sustaining algorithmic entity.

---

## Architecture

```
                         Stellar Testnet (Horizon + Soroban)
                                      |
              +-----------+-----------+-----------+
              |           |                       |
        MPP Server    x402 Server           Stellar SDEX
        (port 3002)   (port 3003)          (on-chain DEX)
         pays USDC     pays USDC           executes trades
              |           |                       |
              +-----------+-----------+-----------+
                                |
                    Agent Server (port 3000)
                    Autonomous trading loop
                    Skills-based architecture
                                |
                          SSE (real-time)
                                |
                    React Dashboard (port 5173)
                    Live monitoring & control
```

**Four services run concurrently:**
- **MPP Server** — Serves price data, charges 0.01 USDC per request via `@stellar/mpp`
- **x402 Server** — Serves market intel, charges 0.05 USDC per request via `@x402/express`
- **Agent Server** — Orchestrates the trading loop, executes skills
- **Dashboard** — React app for real-time monitoring

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Blockchain | Stellar Testnet (Horizon + Soroban RPC) |
| x402 Protocol | `@x402/express`, `@x402/stellar`, `@x402/fetch` |
| MPP Protocol | `@stellar/mpp`, `mppx` |
| Settlement | Soroban SAC (Smart Asset Contract) USDC |
| Trading Engine | Stellar SDEX (`manageSellOffer` / `manageBuyOffer`) |
| Backend | Node.js, Express, Server-Sent Events |
| Frontend | React 19, Vite, Recharts |
| Agent Framework | OpenClaw-compatible skill scripts |

---

## Project Structure

```
hackathon-stellar/
├── server/             # Agent brain + REST API + SSE
├── services/
│   ├── market-data/    # MPP price server (@stellar/mpp)
│   └── x402-intel-server/  # x402 intel server (@x402/express)
├── skills/
│   ├── stellar-wallet/      # Check balances
│   ├── stellar-poll-price/  # Pay MPP, get price
│   ├── stellar-analyze/     # Technical analysis (EMA, RSI, BB, VWAP)
│   ├── stellar-x402-intel/  # Pay x402, get sentiment
│   └── stellar-trade/       # Execute SDEX trades
├── frontend/           # React dashboard
├── SOUL.md             # Agent identity (OpenClaw)
├── AGENTS.md           # Trading rules
└── TOOLS.md            # Skill registry
```

---

## Risk Management

The agent enforces hard-coded safety rules:

| Rule | Threshold |
|------|-----------|
| Stop-loss | -5% per position |
| Take-profit | +8% per position |
| Max drawdown | -15% total |
| Position sizing | Max 30% of balance |
| Trade cooldown | 60 seconds minimum |

---

## Built for Stellar Hacks: Agents

This project demonstrates real-world usage of:

- **x402 Protocol** — Official SDK with Coinbase Facilitator settlement
- **Micropayment Protocol (MPP)** — Official SDK with Soroban SAC USDC transfer
- **SDEX Trading** — Autonomous order execution with AI audit trail in TX memos
- **Machine-to-Machine Commerce** — Two autonomous agents exchanging value on Stellar
- **OpenClaw Skills** — Modular, independently executable agent capabilities

---

## Roadmap to Production (V2 Architecture)

While this MVP proves the agentic capabilities of a centralized AI orchestrator trading on Testnet, our vision for a full Mainnet production release focuses on establishing a **Trustless & Decentralized Trading Protocol**. 

The V2 Architecture will introduce:

1. **Soroban Smart Contract Vaults (DeFi Integration)**
   - Transitioning from a single custodial wallet to a **Decentralized Vault Strategy**. 
   - Users provide liquidity to the Soroban Vault. The AI Agent is granted a *Delegated Trading Key* by the contract, giving it absolute permission to execute asset swaps and SDK limit orders, but zero permission to `withdraw`. This creates a perfectly secure, trustless environment for users.
   
2. **Decentralized Oracles for Market Intel**
   - Feeding the AI with tamper-proof decentralized limit pricing (e.g. via Chainlink or native Stellar Oracles) on Mainnet, guarding the reasoning engine against temporary flash-loan manipulations and ensuring the Wyckoff Analysis runs on institutional-grade data.

3. **Risk-Profile Multi-Tenancy**
   - Allowing users to spin up isolated AI Agent sub-processes tailored to their risk tolerance. 
   - Users can choose **Conservative** (AI strictly waits for 4/4 indicator confluence) or **Aggressive** (High-Frequency micro-trades), with customized Stop Loss and Take Profit variables enforced directly by the Soroban contract.

4. **Distributed Backend Infrastructure**
   - Migrating local `.json` logic stores to scalable nodes, utilizing **PostgreSQL** for on-chain reconciliation and **Redis** for sub-millisecond technical indicator processing during high volatility spikes.

---

**License:** MIT
