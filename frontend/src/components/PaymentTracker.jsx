/**
 * PaymentTracker
 * ==============
 * Log semua pembayaran dan trade yang dilakukan agent.
 * 
 * PENJELASAN:
 * Setiap entry memiliki badge warna:
 * - 🔵 MPP = Pembayaran price data via MPP
 * - 🟣 x402 = Pembayaran market intel via x402
 * - 🟢 SDEX = Buy order on Stellar DEX
 * - 🔴 SELL = Sell order on Stellar DEX
 */
export default function PaymentTracker({ payments = [] }) {
  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">📋 Payment & Trade Log</span>
        <span className="text-muted" style={{ fontSize: '0.65rem' }}>
          {payments.length} entries
        </span>
      </div>

      <div className="log-list">
        {payments.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', padding: '20px' }}>
            No payments yet. Start trading to see activity.
          </div>
        )}
        {[...payments].reverse().map((p, i) => (
          <div key={i} className="log-item">
            <span className={`log-badge ${p.type.toLowerCase()}`}>
              {p.type}
            </span>
            <span className="log-amount">
              {p.type === 'MPP' || p.type === 'x402' 
                ? `-$${p.amount}`
                : `${p.amount} XLM`
              }
            </span>
            <span className="log-detail">{p.detail}</span>
            {p.pnl !== undefined && p.pnl !== null && (
              <span className={p.pnl >= 0 ? 'text-green' : 'text-red'} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', fontWeight: 600 }}>
                {p.pnl >= 0 ? '+' : ''}${p.pnl.toFixed(2)}
              </span>
            )}
            <span className="log-status">✓</span>
          </div>
        ))}
      </div>
    </div>
  )
}
