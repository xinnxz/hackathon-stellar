---
name: stellar-wallet
description: Check Stellar wallet balances (XLM + USDC) and intel budget status. Use when asked about balance, wallet, or before trading.
user-invocable: true
metadata: {"openclaw": {"emoji": "💰", "requires": {"bins": ["node"], "env": ["AGENT_STELLAR_SECRET"]}}}
---

# Stellar Wallet Check

## When to Use
- Before starting a trading session
- When user asks about balance, wallet, or funds
- To verify sufficient balance before a trade

## Instructions
Run the wallet check script:

```
node {baseDir}/check-wallet.js
```

The script will output JSON with:
- `xlm`: XLM balance
- `usdc`: USDC balance  
- `publicKey`: Wallet public key
- `budget`: Intel budget status (spent, remaining, percentUsed)

## Interpretation
- If XLM < 5, warn about low gas funds
- If USDC < 0.5, warn about low trading funds
- If budget.percentUsed > 80%, warn about intel budget depletion
