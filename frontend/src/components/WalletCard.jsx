/**
 * WalletCard
 * ==========
 * Menampilkan saldo XLM dan USDC dari wallet agent.
 * Public key ditampilkan dengan link ke stellar.expert.
 */
export default function WalletCard({ balances = {} }) {
  const { xlm = 0, usdc = 0, publicKey = '' } = balances
  
  const explorerUrl = publicKey 
    ? `https://stellar.expert/explorer/testnet/account/${publicKey}`
    : '#'

  return (
    <div className="stat-card">
      <div className="card-header">
        <span className="card-title">💰 Wallet</span>
        {publicKey && (
          <a 
            href={explorerUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ fontSize: '0.6rem', color: 'var(--accent-blue)', textDecoration: 'none' }}
          >
            explorer ↗
          </a>
        )}
      </div>
      
      <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '2px' }}>XLM</div>
          <div style={{ 
            fontFamily: 'var(--font-mono)', 
            fontWeight: 700, 
            fontSize: '1.1rem',
            color: 'var(--text-primary)'
          }}>
            {xlm.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '2px' }}>USDC</div>
          <div style={{ 
            fontFamily: 'var(--font-mono)', 
            fontWeight: 700, 
            fontSize: '1.1rem',
            color: 'var(--accent-blue)'
          }}>
            ${usdc.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>
    </div>
  )
}
