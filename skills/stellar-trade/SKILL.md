---
name: stellar-trade
description: Execute a BUY or SELL trade on the Stellar SDEX (Decentralized Exchange). Requires action (BUY/SELL), amount, and price. ALWAYS check risk rules before executing.
user-invocable: true
metadata: {"openclaw": {"emoji": "📈", "requires": {"bins": ["node"], "env": ["AGENT_STELLAR_SECRET"]}}}
---

# Execute SDEX Trade

## When to Use
- ONLY after running `/stellar-analyze` and getting a confluence signal ≥ 0.75
- ONLY if risk management checks pass (see Risk Rules below)
- When user explicitly requests a trade

## Instructions
Run with action and amount as arguments:

```
node {baseDir}/execute-trade.js <ACTION> <AMOUNT>
```

Where:
- `ACTION`: `BUY` or `SELL`
- `AMOUNT`: Amount of XLM to trade (e.g., `100`)

Example:
```
node {baseDir}/execute-trade.js BUY 100
```

## Risk Rules (CHECK BEFORE EVERY TRADE)
1. Position size must be ≤ 30% of available XLM/USDC balance
2. Cannot trade if max drawdown (-15%) has been reached
3. Must wait 60 seconds between trades (cooldown)
4. Stop-loss at -5%, take-profit at +8%

## Output JSON
- `txHash`: Stellar transaction hash (verifiable on stellar.expert)
- `action`: BUY or SELL
- `amount`: Amount traded
- `price`: Execution price
- `pnl`: Profit/loss if closing position
- `explorerUrl`: Link to verify on stellar.expert

## SAFETY
- NEVER trade without analysis first
- NEVER trade more than 30% of balance
- ALWAYS report the transaction hash for verification
