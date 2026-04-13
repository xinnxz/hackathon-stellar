---
name: stellar-analyze
description: Run 4 technical indicators (EMA, RSI, Bollinger Bands, VWAP) on collected price data and return confluence trading signal. Use after polling prices.
user-invocable: true
metadata: {"openclaw": {"emoji": "🧠", "requires": {"bins": ["node"]}}}
---

# Technical Analysis

## When to Use
- After polling at least 5 price data points via `/stellar-poll-price`
- When user asks for market analysis or indicator values
- Before making a trading decision

## Instructions
Run the analysis script:

```
node {baseDir}/run-analysis.js
```

## Output Format
JSON with:
- `indicators`: Object containing 4 indicator results:
  - `ema`: EMA crossover signal (BUY/SELL/HOLD)
  - `rsi`: RSI value + signal (oversold=BUY, overbought=SELL)
  - `bb`: Bollinger Band signal (below lower=BUY, above upper=SELL)
  - `vwap`: VWAP signal (below VWAP=BUY, above=SELL)
- `confluence`: Aggregated signal
  - `signal`: BUY/SELL/HOLD
  - `confidence`: 0.0 to 1.0
  - `votes`: { buy: N, sell: N, hold: N }
  - `reason`: Human-readable explanation

## Decision Logic
- **3 or 4 BUY signals** → Strong BUY (confidence ≥ 0.75)
- **3 or 4 SELL signals** → Strong SELL (confidence ≥ 0.75)
- **< 3 agreement** → HOLD (insufficient confluence)

## Important
- Requires at least 5 price history points
- Report each indicator's vote and reasoning
- State the confluence score clearly
