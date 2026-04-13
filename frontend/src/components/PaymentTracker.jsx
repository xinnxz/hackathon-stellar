/**
 * PaymentTracker — Premium Transaction Ledger
 * =============================================
 * 
 * PENJELASAN:
 * Log semua pembayaran dan trade yang dilakukan agent.
 * Setiap entry memiliki:
 * - Protocol badge (MPP 🔵, x402 🟣, SDEX 🟢, SELL 🔴)
 * - Amount paid
 * - Clickable TX hash → langsung buka stellar.expert
 * - Relative timestamp
 * 
 * Juri bisa langsung click TX hash untuk verify on-chain!
 */
export default function PaymentTracker({ payments = [] }) {
  const timeAgo = (ts) => {
    if (!ts) return ''
    const seconds = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
    if (seconds < 60) return `${seconds}s ago`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    return `${Math.floor(seconds / 3600)}h ago`
  }

  // Calculate totals
  const totalPaid = payments.reduce((sum, p) => {
    if (p.type === 'MPP' || p.type === 'x402') return sum + (p.amount || 0)
    return sum
  }, 0)
  const txCount = payments.filter(p => p.txHash).length

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">📋 Transaction Ledger</span>
        <span className="text-muted" style={{ fontSize: '0.6rem' }}>
          {txCount} on-chain TXs
        </span>
      </div>

      <div className="log-list">
        {payments.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', padding: '20px' }}>
            No transactions yet. Start trading to see activity.
          </div>
        )}
        {[...payments].reverse().map((p, i) => (
          <div key={i} className="log-item" style={{ alignItems: 'flex-start' }}>
            {/* Protocol badge */}
            <span className={`log-badge ${p.type.toLowerCase()}`}>
              {p.type === 'MPP' && '📊'}
              {p.type === 'x402' && '🌐'}
              {p.type === 'SDEX' && '📈'}
              {p.type === 'SELL' && '📉'}
              {' '}{p.type}
            </span>

            {/* Details column */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="log-amount">
                  {p.type === 'MPP' || p.type === 'x402'
                    ? `-$${p.amount}`
                    : `${p.amount} XLM`
                  }
                </span>
                <span style={{ fontSize: '0.5rem', color: 'var(--text-muted)' }}>
                  {timeAgo(p.timestamp)}
                </span>
              </div>

              {/* TX Hash link — clickable! */}
              {p.txHash && (
                <a
                  href={p.explorerUrl || `https://stellar.expert/explorer/testnet/tx/${p.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tx-link"
                >
                  TX: {p.txHash.substring(0, 10)}...{p.txHash.slice(-4)} ↗
                </a>
              )}
            </div>

            {/* Status / P&L */}
            {p.pnl !== undefined && p.pnl !== null ? (
              <span className={p.pnl >= 0 ? 'text-green' : 'text-red'}
                style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', fontWeight: 600, flexShrink: 0 }}>
                {p.pnl >= 0 ? '+' : ''}${p.pnl.toFixed(2)}
              </span>
            ) : (
              <span style={{ color: 'var(--accent-green)', fontSize: '0.6rem', flexShrink: 0 }}>✓</span>
            )}
          </div>
        ))}
      </div>

      {/* Footer: running totals */}
      {payments.length > 0 && (
        <div style={{
          marginTop: 'var(--space-sm)',
          padding: '6px 8px',
          background: 'rgba(255,255,255,0.02)',
          borderRadius: 'var(--radius-sm)',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '0.55rem',
          color: 'var(--text-muted)'
        }}>
          <span>Intel cost: ${totalPaid.toFixed(2)} USDC</span>
          <span>{txCount} verified TXs</span>
        </div>
      )}
    </div>
  )
}
