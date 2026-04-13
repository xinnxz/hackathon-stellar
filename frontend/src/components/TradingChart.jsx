/**
 * TradingChart
 * ============
 * Price chart menggunakan Recharts (LineChart).
 * 
 * PENJELASAN:
 * - Menampilkan harga XLM/USDC yang diterima dari MPP price polls
 * - X-axis = waktu, Y-axis = harga
 * - Warna gradient biru-ungu sesuai design system
 * - Responsive dan auto-resize
 */
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'

export default function TradingChart({ priceHistory = [] }) {
  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: 'rgba(12, 12, 22, 0.95)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '6px',
          padding: '8px 12px',
          fontSize: '0.75rem',
          fontFamily: 'var(--font-mono)'
        }}>
          <div style={{ color: '#00d2ff', fontWeight: 700 }}>
            ${payload[0].value.toFixed(6)}
          </div>
          <div style={{ color: '#888', fontSize: '0.65rem' }}>
            {payload[0].payload.time}
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">📈 XLM/USDC Price</span>
        {priceHistory.length > 0 && (
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--accent-blue)' }}>
            ${priceHistory[priceHistory.length - 1]?.price?.toFixed(4)}
          </span>
        )}
      </div>

      <div className="chart-container">
        {priceHistory.length < 2 ? (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100%',
            color: 'var(--text-muted)',
            fontSize: '0.75rem'
          }}>
            Waiting for price data...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={priceHistory} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00d2ff" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#7b2ff7" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="time" 
                tick={{ fontSize: 9, fill: '#555' }}
                axisLine={{ stroke: 'rgba(255,255,255,0.05)' }}
                tickLine={false}
              />
              <YAxis 
                domain={['auto', 'auto']}
                tick={{ fontSize: 9, fill: '#555' }}
                axisLine={{ stroke: 'rgba(255,255,255,0.05)' }}
                tickLine={false}
                tickFormatter={(v) => `$${v.toFixed(3)}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="price"
                stroke="#00d2ff"
                strokeWidth={2}
                fill="url(#priceGradient)"
                dot={false}
                activeDot={{ r: 4, fill: '#00d2ff', stroke: '#0a0a0f', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
