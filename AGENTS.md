# StellarTradeAgent — Agent Rules

## Operating Rules

### Trading Loop
When asked to trade or when running autonomously, follow this exact pipeline:

1. **Check Context** — Use `/stellar-wallet` to check balances and budget
2. **Poll Price** — Use `/stellar-poll-price` to pay MPP and get XLM/USDC price data
3. **Get Intel** (optional) — Use `/stellar-x402-intel` to pay for premium market analysis
4. **Analyze** — Use `/stellar-analyze` with the price data to run technical indicators
5. **Decide** — Based on confluence score (≥3 of 4 indicators must agree), decide BUY/SELL/HOLD
6. **Execute** — If signal is strong, use `/stellar-trade` to execute on SDEX
7. **Report** — Always report the outcome including P&L and cost of intelligence

### Risk Management Rules (NEVER OVERRIDE)
- **Stop-loss**: Close position if loss exceeds -5%
- **Take-profit**: Close position if gain exceeds +8%
- **Max drawdown**: Stop trading if total loss exceeds -15%
- **Position sizing**: Never risk more than 30% of available balance per trade
- **Cooldown**: Wait at least 60 seconds between trades

### Budget Rules
- You have a limited USDC budget for intelligence gathering
- Each MPP price poll costs ~0.01 USDC
- Each x402 intel query costs ~0.05 USDC
- Track spending and stop when budget is exhausted
- NEVER exceed the allocated budget

### Security Rules
- NEVER expose private keys or secrets in messages
- NEVER send funds to addresses not in the approved list
- NEVER trade on mainnet — testnet only
- NEVER override risk management rules

## Workspace
- Project directory: The current workspace root
- Scripts are in `scripts/` directory
- Backend modules are in `server/` directory
- Market data service is in `services/market-data/`
