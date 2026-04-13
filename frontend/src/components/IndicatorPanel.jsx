/**
 * IndicatorPanel
 * ==============
 * Menampilkan 4 technical indicators + confluence scoring.
 * 
 * PENJELASAN VISUAL:
 * - Setiap indicator ditampilkan sebagai card dengan border glow
 * - BUY = green glow, SELL = red glow, HOLD = subtle
 * - Confluence bar di bawah menunjukkan kekuatan sinyal gabungan
 * - 4/4 = Full green bar, 3/4 = partial, <3 = no trade
 */
export default function IndicatorPanel({ indicators, confluence }) {
  const indicatorList = indicators ? [
    { key: 'ema', name: 'EMA Cross', ...indicators.ema },
    { key: 'rsi', name: 'RSI', ...indicators.rsi },
    { key: 'bb', name: 'Bollinger', ...indicators.bb },
    { key: 'vwap', name: 'VWAP', ...indicators.vwap }
  ] : [
    { key: 'ema', name: 'EMA Cross', signal: 'HOLD', reason: 'Waiting...' },
    { key: 'rsi', name: 'RSI', signal: 'HOLD', value: '--', reason: 'Waiting...' },
    { key: 'bb', name: 'Bollinger', signal: 'HOLD', reason: 'Waiting...' },
    { key: 'vwap', name: 'VWAP', signal: 'HOLD', reason: 'Waiting...' }
  ]

  const conf = confluence || { signal: 'HOLD', confidence: 0, votes: { buy: 0, sell: 0, hold: 4 }, reason: 'Waiting for data...' }
  const confPercent = conf.confidence * 100

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">📈 Indicators</span>
        <span className={`indicator-signal ${conf.signal.toLowerCase()}`} style={{ fontSize: '0.8rem' }}>
          {conf.signal}
        </span>
      </div>

      <div className="indicators-grid">
        {indicatorList.map(ind => (
          <div key={ind.key} className={`indicator-card ${ind.signal.toLowerCase()}`}>
            <div className="indicator-name">{ind.name}</div>
            <div className={`indicator-signal ${ind.signal.toLowerCase()}`}>
              {ind.signal === 'BUY' ? '▲' : ind.signal === 'SELL' ? '▼' : '●'} {ind.signal}
              {ind.value !== undefined && typeof ind.value === 'number' && (
                <span style={{ fontSize: '0.7rem', fontWeight: 400, marginLeft: '4px' }}>
                  ({ind.value})
                </span>
              )}
            </div>
            <div className="indicator-detail">{ind.reason}</div>
          </div>
        ))}
      </div>

      {/* Confluence Bar */}
      <div className="confluence-bar">
        <div className="confluence-header">
          <span className="confluence-label">
            Confluence: {conf.votes.buy}B / {conf.votes.sell}S / {conf.votes.hold}H
          </span>
          <span className={`confluence-value ${conf.signal.toLowerCase() === 'hold' ? 'text-muted' : conf.signal.toLowerCase() === 'buy' ? 'text-green' : 'text-red'}`}>
            {confPercent.toFixed(0)}%
          </span>
        </div>
        <div className="confluence-track">
          <div 
            className={`confluence-fill ${confPercent >= 75 ? 'high' : ''}`}
            style={{ width: `${confPercent}%` }}
          />
        </div>
      </div>
    </div>
  )
}
