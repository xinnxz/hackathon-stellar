/**
 * BudgetGauge
 * ===========
 * Circular gauge yang menunjukkan berapa intel budget yang sudah terpakai.
 * Warna berubah: green → yellow → red sesuai persentase.
 * 
 * PENJELASAN SVG Gauge:
 * - SVG circle dengan stroke-dasharray untuk track
 * - stroke-dashoffset dianimasi untuk menunjukkan progress
 * - Circumference = 2πr = 2 × π × 22 ≈ 138.2
 */
export default function BudgetGauge({ budget = {} }) {
  const { total = 1, spent = 0, remaining = 1, percentUsed = 0 } = budget
  
  const radius = 22
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percentUsed / 100) * circumference
  
  // Color based on usage
  let strokeColor = 'var(--accent-green)'
  let textColor = 'text-green'
  if (percentUsed > 70) {
    strokeColor = 'var(--accent-red)'
    textColor = 'text-red'
  } else if (percentUsed > 40) {
    strokeColor = 'var(--accent-gold)'
    textColor = 'text-gold'
  }

  return (
    <div className="stat-card">
      <div className="card-header">
        <span className="card-title">INTEL BUDGET</span>
      </div>
      
      <div className="gauge-container">
        <div className="gauge-visual">
          <svg className="gauge-circle" width="56" height="56" viewBox="0 0 56 56">
            <circle className="gauge-bg" cx="28" cy="28" r={radius} />
            <circle 
              className="gauge-fill"
              cx="28" cy="28" r={radius}
              stroke={strokeColor}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          </svg>
          <span className={`gauge-text ${textColor}`}>
            {Math.round(100 - percentUsed)}%
          </span>
        </div>
        
        <div className="gauge-info">
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
            Spent: <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>${spent.toFixed(2)}</span>
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Left: <span className={textColor} style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>${remaining.toFixed(2)}</span>
          </div>
          <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            of ${total.toFixed(2)} total
          </div>
        </div>
      </div>
    </div>
  )
}
