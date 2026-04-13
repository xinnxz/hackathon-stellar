/**
 * PnLTracker
 * ==========
 * Panel utama yang menampilkan profit/loss dan ROI.
 * Ini adalah "hero number" yang harus paling eye-catching di dashboard.
 * 
 * Menunjukkan:
 * - Net P&L (besar, terang, glow effect)
 * - ROI (badge)
 * - Win rate, total trades, intel cost
 */
export default function PnLTracker({ pnl = {}, budget = {} }) {
  const { totalPnL = 0, totalTrades = 0, winRate = 0, winningTrades = 0, losingTrades = 0 } = pnl
  const intelSpent = budget?.spent || 0
  const netPnL = totalPnL - intelSpent
  
  // ROI = net profit / intel cost
  const roi = intelSpent > 0 ? (netPnL / intelSpent) : 0

  return (
    <div className="stat-card">
      <div className="card-header">
        <span className="card-title">P&L</span>
        {roi > 0 && (
          <span className="roi-badge positive">
            {roi.toFixed(0)}x ROI
          </span>
        )}
      </div>
      
      <div className={`pnl-hero ${netPnL >= 0 ? 'positive' : 'negative'}`}>
        {netPnL >= 0 ? '+' : ''}${netPnL.toFixed(2)}
      </div>
      
      <div className="mini-stats">
        <div className="mini-stat">
          <div className="mini-stat-label">Trades</div>
          <div className="mini-stat-value">{totalTrades}</div>
        </div>
        <div className="mini-stat">
          <div className="mini-stat-label">Win Rate</div>
          <div className="mini-stat-value text-green">{winRate}%</div>
        </div>
        <div className="mini-stat">
          <div className="mini-stat-label">Trading</div>
          <div className={`mini-stat-value ${totalPnL >= 0 ? 'text-green' : 'text-red'}`}>
            {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
          </div>
        </div>
        <div className="mini-stat">
          <div className="mini-stat-label">Intel</div>
          <div className="mini-stat-value text-purple">-${intelSpent.toFixed(2)}</div>
        </div>
      </div>
    </div>
  )
}
