# Available Tools

## Stellar Trading Skills
These skills are the agent's custom trading toolkit:

| Skill | Cost | Description |
|-------|------|-------------|
| `/stellar-wallet` | Free | Check XLM/USDC balances and budget |
| `/stellar-poll-price` | 0.01 USDC | Pay MPP for market price data |
| `/stellar-x402-intel` | 0.05 USDC | Pay x402 for premium sentiment analysis |
| `/stellar-analyze` | Free | Run 4 technical indicators on price history |
| `/stellar-trade` | Gas only | Execute BUY/SELL on Stellar SDEX |

## Tool Usage Rules
- Use `exec` to run the skill scripts (Node.js)
- Always sanitize outputs before displaying
- Never expose private keys or secrets from .env
- Always report costs when using paid services (MPP, x402)
