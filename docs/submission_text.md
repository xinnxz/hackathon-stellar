# StellarTradeAgent — Autonomous Machine-to-Machine Commerce on Stellar

**[DEMO VIDEO: [INSERT YOUTUBE LINK HERE]]**

---

## What is StellarTradeAgent?

StellarTradeAgent is a fully autonomous AI trading agent built on the Stellar blockchain. It manages its own wallet, pays for market intelligence using two Stellar-native monetization protocols (MPP and x402), and executes trades on the Stellar SDEX — all without human intervention.

Every payment, every trade, and every decision the AI makes is a **real, verifiable on-chain transaction** on Stellar Testnet. There are no simulations. There are no mocked APIs. The agent operates with real USDC payments settled through Soroban Smart Asset Contracts.

---

## Why This Project Exists

Most hackathon trading bots simulate payments and mock data feeds. StellarTradeAgent was built to demonstrate what **real machine-to-machine commerce** looks like on Stellar: an AI agent that autonomously earns, spends, and trades using the network's native payment protocols.

The system features two wallets operating in a dual-agent economy:
- **Agent Wallet** — balance decreases as it pays for data and intelligence
- **Provider Wallet** — balance increases as it earns revenue from the agent

This bidirectional flow of funds is fully visible on-chain and in the live dashboard.

---

## How It Works

The agent runs a continuous decision pipeline every 15–30 seconds:

**Step 1 — Wallet Check**
The agent inspects its current XLM and USDC balances and verifies it has sufficient budget to continue operating.

**Step 2 — Pay for Price Data (MPP Protocol)**
The agent sends a request to the Market Data Server. The server responds with HTTP 402 (Payment Required). The agent pays **0.01 USDC** via MPP Charge (Soroban SAC USDC transfer) and receives real-time XLM/USDC price data. This payment is a real on-chain transaction.

**Step 3 — Technical Analysis**
The agent runs four technical indicators on the accumulated price history:
- **EMA Cross** — Exponential Moving Average crossover detection
- **RSI** — Relative Strength Index (overbought/oversold)
- **Bollinger Bands** — Price position relative to volatility bands
- **VWAP** — Volume Weighted Average Price comparison

A confluence score is calculated: if 3 out of 4 indicators agree, a trade signal is generated.

**Step 4 — Pay for Premium Intelligence (x402 Protocol)**
If the confluence score is below 50% (uncertain market), the agent pays **0.01 USDC** via x402 (HTTP 402 Payment Required) to the Intelligence Server for additional market sentiment data. The payment is settled through the official `x402.org/facilitator` using Soroban SAC USDC. This step is skipped when the agent is already confident, saving budget.

**Step 5 — Execute Trade on SDEX**
If the final signal is BUY or SELL, the agent submits a `manageBuyOffer` or `manageSellOffer` transaction to the Stellar SDEX. The transaction memo contains the AI's reasoning in a compact format:

```
BUY:c60:BV:0.1126
```
This means: "Bought because confidence was 60%, Bollinger Bands and VWAP indicators agreed, at price $0.1126." Anyone can read this memo on stellar.expert to verify exactly why the AI made this trade.

**Step 6 — Report**
All results are streamed to the React Dashboard via Server-Sent Events (SSE) in real time.

---

## On-Chain Verification

Every interaction produces a verifiable Stellar transaction:

| Action | Protocol | Verify |
|--------|----------|--------|
| Price Data Payment | MPP Charge (Soroban SAC) | [TX: 0fb5e990...](https://stellar.expert/explorer/testnet/tx/0fb5e990ec475420b6019dfad98aa6eb239d0c7b26e292bb30d3387fb1c67d01) |
| Intelligence Payment | x402 (Facilitator) | [TX: 6d3de10e...](https://stellar.expert/explorer/testnet/tx/6d3de10eced742665508151615975c04ae333ad099ff453ec9314f4f412efebd) |
| SDEX Trade + Audit Memo | SDEX | [TX: 90bfd1bb...](https://stellar.expert/explorer/testnet/tx/90bfd1bb895f9b10f031a6e7016e9a90b2efb445274c8360ef17ccddcbc94e2d) |

---

## Hackathon Criteria Alignment

### Official SDK Compliance
The project exclusively uses official Stellar SDKs as required by the hackathon:
- **x402**: `@x402/express` (server middleware), `@x402/fetch` (client auto-payment), `@x402/stellar` (Stellar scheme)
- **MPP**: `@stellar/mpp` (server charge), `mppx` (client auto-payment)
- **Facilitator**: Payments routed through `x402.org/facilitator` (Coinbase-managed)

### Soroban SAC Settlement
All payments are settled in **USDC via Soroban Smart Asset Contract (SAC)** — not native XLM transfers. This demonstrates proper usage of Stellar's smart contract layer for token payments.

### On-Chain Transparency
The AI's decision logic is permanently recorded in transaction memos. This creates a trustless audit trail — observers don't need to trust server logs because the reasoning is embedded in the blockchain itself.

### Modular Agent Architecture
The agent's capabilities are divided into 5 independent skills, each a standalone Node.js script compatible with the OpenClaw agent framework:

| Skill | Cost | Function |
|-------|------|----------|
| `stellar-wallet` | Free | Check balances and budget status |
| `stellar-poll-price` | 0.01 USDC | Pay MPP, receive market price |
| `stellar-analyze` | Free | Run 4 technical indicators |
| `stellar-x402-intel` | 0.01 USDC | Pay x402, receive market sentiment |
| `stellar-trade` | Gas fee | Execute SDEX order with audit memo |

### Risk Management
The agent enforces strict risk controls that cannot be overridden:
- Stop-loss at -5%, Take-profit at +8%
- Maximum drawdown limit of -15%
- Position sizing capped at 30% of available balance
- Minimum 60-second cooldown between trades

---

## Architecture

The system consists of four services running concurrently:

| Service | Port | Role |
|---------|------|------|
| MPP Market Data Server | 3002 | Serves price data, accepts MPP payments |
| x402 Intelligence Server | 3003 | Serves sentiment data, accepts x402 payments |
| Agent API Server | 3000 | Autonomous trading loop, REST API, SSE stream |
| React Dashboard | 5173 | Real-time monitoring and visualization |

**Important**: This is an autonomous agent system, not a user-facing DeFi application. There is no "Connect Wallet" feature. The agent owns and manages its own wallet. The dashboard is a monitoring interface for observing the agent's autonomous behavior and verifying its on-chain activity.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Blockchain | Stellar Testnet (Horizon API + Soroban RPC) |
| x402 Protocol | `@x402/express` + `@x402/stellar` + `@x402/fetch` |
| MPP Protocol | `@stellar/mpp` + `mppx` |
| Settlement | Soroban SAC USDC (Smart Asset Contract) |
| Facilitator | `x402.org/facilitator` (Coinbase-managed) |
| Trading | Stellar SDEX (manageSellOffer / manageBuyOffer) |
| Backend | Node.js + Express + Server-Sent Events |
| Frontend | React 19 + Vite + Recharts |
| Agent Framework | OpenClaw-compatible modular skills |
| Core SDK | `@stellar/stellar-sdk` v14/v15 |

---

## Running Locally

```bash
# Clone and install
git clone https://github.com/xinnxz/hackathon-stellar.git
cd hackathon-stellar
npm run install:all

# Setup testnet wallets (auto-generates keys + funds via Friendbot)
npm run setup
npm run trustline
npm run seed

# Start all 4 services
npm run dev

# Open dashboard at http://localhost:5173
# Click "Start Trading" to begin autonomous operation
```

---

StellarTradeAgent demonstrates that AI agents can autonomously manage wallets, pay for intelligence via standardized web protocols, and execute transparent, verifiable trades on a public blockchain — establishing a foundation for trustless machine-to-machine commerce on the Stellar network.
