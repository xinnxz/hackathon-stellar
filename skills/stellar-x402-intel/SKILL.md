---
name: stellar-x402-intel
description: Pay for premium market intelligence via x402 (HTTP 402 Payment Required) protocol. Costs 0.05 USDC. Returns sentiment analysis and market context for enhanced trading decisions.
user-invocable: true
metadata: {"openclaw": {"emoji": "🌐", "requires": {"bins": ["node"]}}}
---

# x402 Market Intelligence

## When to Use
- Before a large trade for extra confidence
- When market conditions are unclear
- When user specifically asks for deep analysis
- Optional — not required every cycle (saves budget)

## Instructions
Run the x402 intel script:

```
node {baseDir}/get-intel.js
```

## Output Format
JSON with:
- `sentiment`: BULLISH/BEARISH/NEUTRAL
- `confidence`: 0.0 to 1.0
- `analysis`: Text summary of market conditions
- `payment.protocol`: "x402"
- `payment.amount`: 0.05 USDC

## Cost
- Each call costs **0.05 USDC** from intel budget
- Use sparingly — only when extra analysis is needed
- Price data from MPP (0.01 USDC) is usually sufficient

## Important
- Always mention the 0.05 USDC cost in the report
- Combine with technical analysis for best results
