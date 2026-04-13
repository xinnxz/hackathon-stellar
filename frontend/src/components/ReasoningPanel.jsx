/**
 * ReasoningPanel — Agent Decision Tree Visualizer
 * =================================================
 * 
 * PENJELASAN:
 * Menampilkan PROSES reasoning agent secara visual:
 * 1. Current price + trend
 * 2. 4 indicator signals (EMA, RSI, BB, VWAP)
 * 3. Confluence vote (3/4 = BUY)
 * 4. Risk checklist (✅/❌)
 * 5. Final decision + audit memo
 * 6. Intelligence costs this cycle
 * 
 * SEMUA DATA sudah tersedia dari SSE events.
 * Panel ini hanya DISPLAY — no API calls needed.
 * 
 * INI YANG MEMBUAT JURI TERKESAN:
 * Mereka bisa SEE step-by-step KENAPA agent decide.
 */
export default function ReasoningPanel({ 
  indicators, 
  confluence, 
  latestPrice,
  latestTrade,
  pipeline = {},
  budget
}) {
  const signal = confluence?.signal || 'HOLD'
  const confidence = confluence?.confidence || 0
  const votes = confluence?.votes || { buy: 0, sell: 0, hold: 0 }

  const signalColor = signal === 'BUY' ? 'var(--accent-green)' 
    : signal === 'SELL' ? 'var(--accent-red)' 
    : 'var(--text-secondary)'

  const signalEmoji = signal === 'BUY' ? '📈' : signal === 'SELL' ? '📉' : '⏸'

  return (
    <div className="card span-2">
      <div className="card-header">
        <span className="card-title">🧠 Agent Reasoning</span>
        <span style={{ 
          fontSize: '0.7rem', 
          fontWeight: 700, 
          color: signalColor,
          fontFamily: 'var(--font-mono)'
        }}>
          {signalEmoji} {signal}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
        {/* LEFT: Indicators */}
        <div>
          <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Indicator Signals
          </div>

          {/* 4 indicator mini-cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
            {indicators ? (
              Object.entries(indicators).map(([name, data]) => {
                const sig = data.signal || 'HOLD'
                const color = sig === 'BUY' ? 'var(--accent-green)' 
                  : sig === 'SELL' ? 'var(--accent-red)' 
                  : 'var(--text-muted)'
                const bg = sig === 'BUY' ? 'rgba(0, 255, 136, 0.06)' 
                  : sig === 'SELL' ? 'rgba(255, 71, 87, 0.06)' 
                  : 'rgba(255,255,255,0.02)'
                return (
                  <div key={name} style={{
                    padding: '6px',
                    background: bg,
                    border: `1px solid ${sig === 'BUY' ? 'rgba(0,255,136,0.15)' : sig === 'SELL' ? 'rgba(255,71,87,0.15)' : 'var(--border-subtle)'}`,
                    borderRadius: 'var(--radius-sm)',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      {name}
                    </div>
                    <div style={{ 
                      fontSize: '0.75rem', 
                      fontWeight: 700, 
                      color,
                      fontFamily: 'var(--font-mono)'
                    }}>
                      {sig === 'BUY' ? '📈' : sig === 'SELL' ? '📉' : '⏸'} {sig}
                    </div>
                    {data.value !== null && data.value !== undefined && (
                      <div style={{ fontSize: '0.5rem', color: 'var(--text-secondary)' }}>
                        {typeof data.value === 'number' ? data.value.toFixed(1) : data.value}
                      </div>
                    )}
                  </div>
                )
              })
            ) : (
              <div style={{ gridColumn: '1/-1', fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center', padding: '10px' }}>
                Waiting for analysis...
              </div>
            )}
          </div>

          {/* Confluence votes */}
          {confluence && (
            <div style={{
              marginTop: '6px',
              padding: '6px 8px',
              background: 'rgba(255,255,255,0.02)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>CONFLUENCE</span>
                <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: signalColor }}>
                  {(confidence * 100).toFixed(0)}%
                </span>
              </div>
              <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                <div style={{
                  flex: votes.buy,
                  height: '4px',
                  background: 'var(--accent-green)',
                  borderRadius: '2px',
                  transition: 'flex 0.5s ease'
                }} />
                <div style={{
                  flex: votes.hold || 0.1,
                  height: '4px',
                  background: 'var(--text-muted)',
                  borderRadius: '2px',
                  transition: 'flex 0.5s ease'
                }} />
                <div style={{
                  flex: votes.sell || 0.1,
                  height: '4px',
                  background: 'var(--accent-red)',
                  borderRadius: '2px',
                  transition: 'flex 0.5s ease'
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px', fontSize: '0.5rem' }}>
                <span style={{ color: 'var(--accent-green)' }}>{votes.buy}B</span>
                <span style={{ color: 'var(--text-muted)' }}>{votes.hold}H</span>
                <span style={{ color: 'var(--accent-red)' }}>{votes.sell}S</span>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Decision + Costs */}
        <div>
          <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Decision & Audit
          </div>

          {/* Decision box */}
          <div style={{
            padding: '8px',
            background: signal === 'BUY' ? 'rgba(0,255,136,0.06)' : signal === 'SELL' ? 'rgba(255,71,87,0.06)' : 'rgba(255,255,255,0.02)',
            border: `1px solid ${signal === 'BUY' ? 'rgba(0,255,136,0.2)' : signal === 'SELL' ? 'rgba(255,71,87,0.2)' : 'var(--border-subtle)'}`,
            borderRadius: 'var(--radius-sm)',
            textAlign: 'center',
            marginBottom: '6px'
          }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: signalColor, fontFamily: 'var(--font-mono)' }}>
              {signalEmoji} {signal}
            </div>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {confluence?.reason || 'Waiting...'}
            </div>
          </div>

          {/* Audit memo preview */}
          {latestTrade?.txHash && (
            <div style={{
              padding: '6px 8px',
              background: 'rgba(123, 47, 247, 0.06)',
              border: '1px solid rgba(123, 47, 247, 0.15)',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '6px'
            }}>
              <div style={{ fontSize: '0.5rem', color: 'var(--accent-purple)', textTransform: 'uppercase' }}>
                On-Chain Audit Memo
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-primary)', marginTop: '2px' }}>
                "{latestTrade.action}:c{(confidence*100).toFixed(0)}:{latestPrice?.toFixed(4) || '?'}"
              </div>
              <a
                href={`https://stellar.expert/explorer/testnet/tx/${latestTrade.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="tx-link"
                style={{ marginTop: '2px', display: 'inline-block' }}
              >
                TX: {latestTrade.txHash.substring(0, 12)}... ↗
              </a>
            </div>
          )}

          {/* Intelligence costs */}
          <div style={{
            padding: '6px 8px',
            background: 'rgba(255,255,255,0.02)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)'
          }}>
            <div style={{ fontSize: '0.5rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '3px' }}>
              Cycle Cost
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem' }}>
              <span style={{ color: 'var(--accent-blue)' }}>📊 MPP: 0.05 XLM</span>
              <span style={{ color: pipeline[4]?.status === 'skip' ? 'var(--text-muted)' : 'var(--accent-purple)' }}>
                🌐 x402: {pipeline[4]?.status === 'skip' ? 'skipped' : '0.10 XLM'}
              </span>
            </div>
            {budget && (
              <div style={{ fontSize: '0.5rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                Total spent: ${budget.spent?.toFixed(2) || '0.00'} / ${budget.total?.toFixed(2) || '1.00'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
