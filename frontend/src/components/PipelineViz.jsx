/**
 * PipelineViz — Animated 6-Step Decision Pipeline
 * =================================================
 * 
 * PENJELASAN:
 * Visualisasi 6 step dari trading pipeline agent.
 * Setiap step menyala secara bergantian saat agent cycle berjalan:
 * 
 * [Wallet] → [Poll MPP] → [Analyze] → [x402 Intel] → [Trade] → [Report]
 *   🟢          🔵          ⬜           ⬜            ⬜         ⬜
 *  (done)    (running)    (pending)    (pending)     (pending)   (pending)
 * 
 * Status warna:
 * - running = biru pulse animation
 * - done = hijau glow
 * - error = merah
 * - skip = kuning dimmed
 * - pending = abu-abu
 */
const STEPS = [
  { id: 1, name: 'Wallet', icon: '1', cost: 'free' },
  { id: 2, name: 'Poll MPP', icon: '2', cost: '0.05 XLM' },
  { id: 3, name: 'Analyze', icon: '3', cost: 'free' },
  { id: 4, name: 'x402 Intel', icon: '4', cost: '0.1 XLM' },
  { id: 5, name: 'Trade', icon: '5', cost: 'gas' },
  { id: 6, name: 'Report', icon: '6', cost: 'free' }
]

const STATUS_STYLES = {
  running: {
    borderColor: '#00d4ff',
    background: 'rgba(0, 212, 255, 0.15)',
    color: '#00d4ff',
    animation: 'pipelinePulse 1.5s infinite'
  },
  done: {
    borderColor: '#10b981',
    background: 'rgba(16, 185, 129, 0.15)',
    color: '#10b981',
    boxShadow: '0 0 10px rgba(16, 185, 129, 0.3)'
  },
  error: {
    borderColor: '#ef4444',
    background: 'rgba(239, 68, 68, 0.15)',
    color: '#ef4444'
  },
  skip: {
    borderColor: '#f59e0b',
    background: 'rgba(245, 158, 11, 0.1)',
    color: '#f59e0b',
    opacity: 0.7
  },
  pending: {
    borderColor: 'var(--border)',
    background: 'transparent',
    color: 'var(--text-muted)'
  }
}

export default function PipelineViz({ pipeline = {} }) {
  const getStatus = (id) => pipeline[id]?.status || 'pending'
  const getName = (id) => pipeline[id]?.name || STEPS.find(s => s.id === id)?.name

  return (
    <div style={{ padding: 'var(--space-sm)' }}>
      {/* Pipeline steps */}
      <div className="pipeline-steps">
        {STEPS.map((step, i) => {
          const status = getStatus(step.id)
          const style = STATUS_STYLES[status] || STATUS_STYLES.pending
          const displayName = getName(step.id)

          return (
            <div key={step.id} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              {/* Step node */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 'none', width: '56px' }}>
                <div
                  className={`pipeline-dot ${status}`}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    border: `2px solid ${style.borderColor}`,
                    background: style.background,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.9rem',
                    transition: 'all 0.3s ease',
                    position: 'relative',
                    ...style
                  }}
                >
                  {status === 'done' && 'OK'}
                  {status === 'running' && '...'}
                  {status === 'error' && 'ERR'}
                  {status === 'skip' && 'SKIP'}
                  {status === 'pending' && step.icon}
                </div>
                <div style={{
                  fontSize: '0.55rem',
                  color: style.color,
                  marginTop: '4px',
                  fontWeight: status === 'running' ? 700 : 400,
                  whiteSpace: 'nowrap',
                  textAlign: 'center',
                  maxWidth: '60px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {displayName}
                </div>
                {step.cost !== 'free' && (
                  <div style={{
                    fontSize: '0.45rem',
                    color: 'var(--text-muted)',
                    opacity: 0.6
                  }}>
                    {step.cost}
                  </div>
                )}
              </div>

              {/* Connector line */}
              {i < STEPS.length - 1 && (
                <div style={{
                  flex: 1,
                  minWidth: '12px',
                  height: '2px',
                  background: status === 'done'
                    ? 'linear-gradient(90deg, #10b981, #10b98166)'
                    : status === 'running'
                      ? 'linear-gradient(90deg, #00d4ff, transparent)'
                      : 'var(--border)',
                  borderRadius: '1px',
                  transition: 'background 0.5s ease'
                }} />
              )}
            </div>
          )
        })}
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes pipelinePulse {
          0%, 100% { box-shadow: 0 0 5px rgba(0, 212, 255, 0.3); }
          50% { box-shadow: 0 0 20px rgba(0, 212, 255, 0.6), 0 0 40px rgba(0, 212, 255, 0.2); }
        }
        .pipeline-dot.running {
          animation: pipelinePulse 1.5s infinite !important;
        }
      `}</style>
    </div>
  )
}
