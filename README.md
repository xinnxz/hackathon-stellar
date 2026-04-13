# ⚡ StellarTradeAgent

> **AI agent that PAYS for market intelligence and TRADES autonomously on Stellar SDEX.**
> Every payment and trading decision is a REAL on-chain Stellar transaction.

---

## ✨ What Makes This Different

Most hackathon projects simulate payments. **StellarTradeAgent does it for real.**

| Feature | Others | StellarTradeAgent |
|---------|--------|-------------------|
| Payments | Simulated | **Real on-chain TXs** (verifiable!) |
| Protocols | Usually 1 | **Both MPP + x402** |
| Audit Trail | None | **AI reasoning in TX memo** |
| Dashboard | Static/CLI | **Live animated dashboard** |
| Agents | Single | **Dual-agent economy** |
| Verification | "Trust me" | **stellar.expert links** |

---

## 🔗 On-Chain Proof

Every interaction creates a verifiable Stellar transaction:

| What | Protocol | TX Hash | Verify |
|------|----------|---------|--------|
| Price Data Payment | MPP Charge | `0fb5e990...` | [stellar.expert ↗](https://stellar.expert/explorer/testnet/tx/0fb5e990ec475420b6019dfad98aa6eb239d0c7b26e292bb30d3387fb1c67d01) |
| Intelligence Payment | x402 (HTTP 402) | `6d3de10e...` | [stellar.expert ↗](https://stellar.expert/explorer/testnet/tx/6d3de10eced742665508151615975c04ae333ad099ff453ec9314f4f412efebd) |
| SDEX Trade (with audit memo) | SDEX | `90bfd1bb...` | [stellar.expert ↗](https://stellar.expert/explorer/testnet/tx/90bfd1bb895f9b10f031a6e7016e9a90b2efb445274c8360ef17ccddcbc94e2d) |

**On-Chain Audit Trail:** Trade TX `90bfd1bb...` contains memo `SELL:c25:V:0.1578` — this means:
- `SELL` — the action taken
- `c25` — 25% confidence
- `V` — VWAP indicator agreed
- `0.1578` — entry price

**Anyone can verify WHY the AI traded by reading the TX memo on-chain.**

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    StellarTradeAgent System                   │
│                                                               │
│  ┌───────────────┐     ┌───────────────┐     ┌────────────┐ │
│  │  MPP Server   │     │  x402 Server  │     │  Stellar   │ │
│  │  @stellar/mpp │     │  @x402/express│     │  Testnet   │ │
│  │  (Port 3002)  │     │  (Port 3003)  │     │  (Horizon) │ │
│  │  USDC via SAC │     │  USDC via     │     │  SDEX DEX  │ │
│  │  per request  │     │  Facilitator  │     │            │ │
│  └───────┬───────┘     └───────┬───────┘     └─────┬──────┘ │
│          │ 402+USDC            │ 402+USDC          │         │
│          ▼                     ▼                   │         │
│  ┌─────────────────────────────────────────────────┤         │
│  │              Agent Server (Port 3000)           │         │
│  │                                                 │         │
│  │  Autonomous Loop (every 30s):                   │         │
│  │  1. 💰 Check wallet balance                     │         │
│  │  2. 📊 Pay MPP → get price (real TX)           │         │
│  │  3. 🧠 Analyze (EMA, RSI, BB, VWAP)           │         │
│  │  4. 🌐 Pay x402 → get intel (real TX)          │         │
│  │  5. 📈 Trade on SDEX (real TX + audit memo)    │─────────┘
│  │  6. 📋 Report via SSE                          │
│  │                                                 │
│  │  Each skill = OpenClaw-compatible script        │
│  └──────────────────────┬──────────────────────────┘
│                         │ SSE events
│                         ▼
│  ┌──────────────────────────────────────────────────┐
│  │           React Dashboard (Port 5173)            │
│  │                                                  │
│  │  ┌────────┐ ┌────────┐ ┌──────┐ ┌────────────┐ │
│  │  │ Dual   │ │ Budget │ │ P&L  │ │  Pipeline  │ │
│  │  │ Wallet │ │ Gauge  │ │Track │ │  Animated  │ │
│  │  ├────────┤ ├────────┤ ├──────┤ ├────────────┤ │
│  │  │ Agent↓ │ │ ██░░░░ │ │+$0.2 │ │ ●→●→●→○→○ │ │
│  │  │ Prov ↑ │ │ 6%used │ │ 67%W │ │            │ │
│  │  └────────┘ └────────┘ └──────┘ └────────────┘ │
│  │  ┌────────────────┐  ┌──────────────────────┐  │
│  │  │ Trading Chart  │  │ Transaction Ledger   │  │
│  │  │  📈 live data  │  │ TX: 0fb5e9... ↗     │  │
│  │  └────────────────┘  └──────────────────────┘  │
│  └──────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 5 OpenClaw Skills

Each skill is an independent script that can be executed by OpenClaw TUI:

| Skill | Cost | What It Does |
|-------|------|-------------|
| `/stellar-wallet` | Free | Check XLM/USDC balances + budget |
| `/stellar-poll-price` | 0.01 USDC | Pay MPP (Soroban SAC) → get XLM/USDC price |
| `/stellar-analyze` | Free | Run 4 indicators + confluence |
| `/stellar-x402-intel` | 0.01 USDC | Pay x402 (via Facilitator) → get sentiment |
| `/stellar-trade` | Gas fee | Execute SDEX trade + audit memo |

---

## 🛡️ Risk Management

| Rule | Value | Purpose |
|------|-------|---------|
| Stop-loss | -5% | Auto-close losing positions |
| Take-profit | +8% | Lock in gains |
| Max drawdown | -15% | Emergency stop |
| Position sizing | ≤30% | Never risk full balance |
| Cooldown | 60s | Prevent overtrading |

---

## 🚀 Quick Start

```bash
# 1. Clone & install
git clone https://github.com/xinnxz/hackathon-stellar.git
cd hackathon-stellar
npm run install:all

# 2. Setup wallets (generates keys + funds via Friendbot)
npm run setup
npm run trustline
npm run seed

# 3. Start everything (4 services)
npm run demo
# Opens: MPP (:3002) + x402 (:3003) + API (:3000) + Dashboard (:5173)

# 4. Open dashboard
# http://localhost:5173
# Click [▶ Start] to begin autonomous trading
```

---

## 📊 Tech Stack

| Layer | Technology |
|-------|-----------|
| Blockchain | Stellar Testnet (Horizon + Soroban RPC) |
| x402 Protocol | `@x402/express` + `@x402/stellar` + `@x402/fetch` (Official SDK) |
| MPP Protocol | `@stellar/mpp` + `mppx` (Official SDK) |
| Settlement | **Soroban SAC USDC transfer** (Smart Asset Contract) |
| x402 Facilitator | `x402.org/facilitator` (Coinbase managed) |
| Trading | Stellar SDEX (manageSellOffer/manageBuyOffer) |
| Backend | Node.js + Express + SSE |
| Frontend | React 19 + Vite + Recharts |
| Agent | OpenClaw-compatible skills |
| SDK | @stellar/stellar-sdk v14/v15, @x402/*, @stellar/mpp |

---

## 📁 Project Structure

```
hackathon-stellar/
├── SOUL.md                    # Agent identity (OpenClaw)
├── AGENTS.md                  # Trading rules (OpenClaw)
├── TOOLS.md                   # Available skills (OpenClaw)
├── skills/
│   ├── stellar-wallet/        # Balance check skill
│   ├── stellar-poll-price/    # MPP price polling skill
│   ├── stellar-analyze/       # 4-indicator analysis skill
│   ├── stellar-x402-intel/    # x402 intelligence skill
│   └── stellar-trade/         # SDEX trade execution skill
├── server/                    # Agent server + API
├── services/
│   ├── market-data/           # MPP price server
│   └── x402-intel-server/     # x402 intelligence server
└── frontend/                  # React dashboard
```

---

## 🏆 Built for Stellar Hacks: Agents

This project demonstrates:
- **x402 Protocol (Official SDK)** — `@x402/express` middleware + Coinbase Facilitator + Soroban SAC USDC settlement
- **MPP Charge (Official SDK)** — `@stellar/mpp` + `mppx` with Soroban SAC USDC transfer
- **Soroban SAC** — Payments settled via Stellar Asset Contract (smart contract) on Soroban
- **SDEX Trading** — Autonomous on-chain order execution with AI reasoning in TX memo
- **OpenClaw Skills** — 5 modular, independently executable agent capabilities
- **Machine-to-Machine Commerce** — Two agents exchanging USDC value on Stellar

---

**License:** MIT
