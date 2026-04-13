---
name: stellar-poll-price
description: Pay for XLM/USDC market price data via MPP (Machine Payments Protocol). Costs 0.01 USDC per request. Returns current price, high, low, volume, and price history.
user-invocable: true
metadata: {"openclaw": {"emoji": "📊", "requires": {"bins": ["node"]}}}
---

# Poll Price via MPP Payment

## When to Use
- At the start of every trading cycle
- When user asks for current market price
- Before running technical analysis

## Instructions
Run the price polling script:

```
node {baseDir}/poll-price.js
```

The script will:
1. Connect to the MPP Market Data Server
2. **Pay 0.01 USDC** for the price data (simulated payment on testnet)
3. Return current XLM/USDC market data

## Output Format
JSON with fields:
- `price`: Current XLM/USDC price
- `high`, `low`: Period high/low
- `volume`: Trading volume
- `change_pct`: Price change percentage
- `history`: Array of recent prices (for indicator calculation)
- `payment.amount`: Amount paid for this data
- `payment.protocol`: "MPP Charge"

## Important
- Always mention the cost paid (0.01 USDC) when reporting
- Track total spending against intel budget
- If budget is depleted, warn user before polling
