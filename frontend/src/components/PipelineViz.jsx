/**
 * PipelineViz
 * ===========
 * 6-step decision pipeline visualizer.
 * 
 * PENJELASAN:
 * Setiap cycle, pipeline menunjukkan 6 step:
 * 1. CONTEXT → Load wallet & budget
 * 2. POLL    → Pay MPP → get price
 * 3. INTEL   → Pay x402 → get market data
 * 4. ANALYZE → Run 4 indicators
 * 5. DECIDE  → Confluence + risk check
 * 6. EXECUTE → SDEX trade (or HOLD)
 * 
 * Setiap step bisa: done (✓), active (pulse), error (✗), skip (−)
 * Garis antara step juga berubah warna sesuai progress.
 */
const STEPS = [
  { id: 1, label: 'Context', icon: '📋' },
  { id: 2, label: 'Poll MPP', icon: '📊' },
  { id: 3, label: 'Intel x402', icon: '🌐' },
  { id: 4, label: 'Analyze', icon: '🧠' },
  { id: 5, label: 'Decide', icon: '⚖️' },
  { id: 6, label: 'Execute', icon: '📈' }
]

export default function PipelineViz({ pipeline = {} }) {
  const getStepStatus = (stepId) => {
    const step = pipeline[stepId]
    return step?.status || 'pending'
  }

  const getStatusSymbol = (status) => {
    switch (status) {
      case 'done': return '✓'
      case 'active': return '•'
      case 'error': return '✗'
      case 'skip': return '−'
      case 'blocked': return '⊘'
      default: return ''
    }
  }

  return (
    <div className="pipeline-steps">
      {STEPS.map((step, i) => {
        const status = getStepStatus(step.id)
        return (
          <div key={step.id} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <div className="pipeline-step" style={{ flex: 'none', width: '48px' }}>
              <div className={`pipeline-dot ${status}`}>
                {status === 'pending' ? step.icon : getStatusSymbol(status)}
              </div>
              <div className="pipeline-label">{step.label}</div>
            </div>
            {i < STEPS.length - 1 && (
              <div 
                className={`pipeline-line ${status === 'done' ? 'done' : ''}`}
                style={{ flex: 1, minWidth: '20px' }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
