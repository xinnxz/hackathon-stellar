/**
 * WalletCard — Dual Agent + Provider Wallet Display
 * ===================================================
 * 
 * PENJELASAN:
 * Menampilkan KEDUA wallet untuk menunjukkan machine-to-machine commerce:
 * - Agent wallet: balance TURUN (membayar untuk data via MPP + x402)
 * - Provider wallet: balance NAIK (menerima pembayaran)
 * 
 * Ini menunjukkan uang mengalir secara real on-chain antara 2 AI agents!
 */
import { useState, useEffect } from 'react'

const API_URL = import.meta.env.DEV ? 'http://localhost:3000' : ''

export default function WalletCard({ balances = {} }) {
  const { xlm = 0, usdc = 0, publicKey = '' } = balances
  const [provider, setProvider] = useState(null)

  // Poll dual status
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`${API_URL}/api/dual-status`)
        if (res.ok) {
          const data = await res.json()
          if (data.provider) setProvider(data.provider)
        }
      } catch (e) { /* */ }
    }
    const interval = setInterval(poll, 8000)
    poll()
    return () => clearInterval(interval)
  }, [])

  const explorerUrl = publicKey
    ? `https://stellar.expert/explorer/testnet/account/${publicKey}`
    : '#'

  const providerExplorerUrl = provider?.publicKey
    ? `https://stellar.expert/explorer/testnet/account/${provider.publicKey}`
    : '#'

  return (
    <div className="stat-card">
      <div className="card-header">
        <span className="card-title">WALLETS</span>
        <span style={{ fontSize: '0.5rem', color: 'var(--text-muted)' }}>Dual-Agent</span>
      </div>

      {/* Agent Wallet */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '6px 8px',
        background: 'rgba(239, 68, 68, 0.06)',
        borderRadius: '6px',
        marginBottom: '6px'
      }}>
        <div>
          <div style={{ fontSize: '0.55rem', color: '#ef4444', fontWeight: 600 }}>
            AGENT (Payer)
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {xlm.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginLeft: '4px' }}>XLM</span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          {publicKey && (
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: '0.5rem', color: 'var(--accent-blue)', textDecoration: 'none' }}
            >
              {publicKey.substring(0, 4)}...{publicKey.slice(-4)} (↗)
            </a>
          )}
          <div style={{ fontSize: '0.45rem', color: '#ef4444', marginTop: '2px', fontWeight: 700, letterSpacing: '0.5px' }}>OUTGOING</div>
        </div>
      </div>

      {/* Provider Wallet */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '6px 8px',
        background: 'rgba(16, 185, 129, 0.06)',
        borderRadius: '6px'
      }}>
        <div>
          <div style={{ fontSize: '0.55rem', color: '#10b981', fontWeight: 600 }}>
            PROVIDER (Earner)
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {provider
              ? provider.xlm.toLocaleString(undefined, { maximumFractionDigits: 2 })
              : '—'}
            <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginLeft: '4px' }}>XLM</span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          {provider?.publicKey && (
            <a
              href={providerExplorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: '0.5rem', color: 'var(--accent-blue)', textDecoration: 'none' }}
            >
              {provider.publicKey.substring(0, 4)}...{provider.publicKey.slice(-4)} (↗)
            </a>
          )}
          <div style={{ fontSize: '0.45rem', color: '#10b981', marginTop: '2px', fontWeight: 700, letterSpacing: '0.5px' }}>INCOMING</div>
        </div>
      </div>

      {/* Flow indicator */}
      <div style={{
        textAlign: 'center',
        fontSize: '0.5rem',
        color: 'var(--text-muted)',
        marginTop: '6px',
        padding: '3px',
        background: 'rgba(255,255,255,0.02)',
        borderRadius: '4px'
      }}>
        Agent -{'>'} XLM -{'>'} Provider (on-chain)
      </div>
    </div>
  )
}
