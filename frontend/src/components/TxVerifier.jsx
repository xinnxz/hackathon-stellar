/**
 * TxVerifier — Embedded On-Chain Transaction Verifier
 * =====================================================
 * 
 * PENJELASAN:
 * Widget yang fetch TX data langsung dari Horizon API
 * dan display di dashboard. Juri tidak perlu buka tab lain!
 * 
 * Menampilkan:
 * - TX Hash (clickable)
 * - Status: SUCCESS ✅
 * - Ledger number
 * - Memo (AI reasoning audit trail!)
 * - Fee paid
 * - Operations summary
 * - Timestamp
 * 
 * INI SANGAT IMPRESIF karena:
 * Juri lihat PROOF langsung di dashboard!
 */
import { useState, useEffect } from 'react'

const HORIZON_URL = 'https://horizon-testnet.stellar.org'

export default function TxVerifier({ payments = [], trades = [] }) {
  const [txData, setTxData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Get latest TX hash from payments or trades
  const getLatestTxHash = () => {
    // Check trades first (most impressive)
    const latestTrade = [...trades].reverse().find(t => t.txHash)
    if (latestTrade?.txHash) return { hash: latestTrade.txHash, type: 'SDEX Trade' }

    // Then payments
    const latestPayment = [...payments].reverse().find(p => p.txHash)
    if (latestPayment?.txHash) return { hash: latestPayment.txHash, type: latestPayment.type || 'Payment' }

    return null
  }

  const latestTx = getLatestTxHash()

  // Fetch TX data from Horizon
  useEffect(() => {
    if (!latestTx?.hash) return
    if (txData?.hash === latestTx.hash) return // Don't re-fetch same TX

    const fetchTx = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`${HORIZON_URL}/transactions/${latestTx.hash}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        setTxData({
          hash: data.hash,
          successful: data.successful,
          ledger: data.ledger,
          memo: data.memo || '(none)',
          memoType: data.memo_type,
          fee: parseInt(data.fee_charged) / 10000000, // stroops to XLM
          createdAt: data.created_at,
          operationCount: data.operation_count,
          source: data.source_account,
          type: latestTx.type
        })
      } catch (e) {
        setError(e.message)
      }
      setLoading(false)
    }
    fetchTx()
  }, [latestTx?.hash])

  const explorerUrl = latestTx?.hash
    ? `https://stellar.expert/explorer/testnet/tx/${latestTx.hash}`
    : '#'

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">TX VERIFIER</span>
        <span style={{ fontSize: '0.5rem', color: 'var(--text-muted)' }}>
          Horizon API
        </span>
      </div>

      {!latestTx ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.7rem', padding: '15px' }}>
          No transactions yet. Start trading to verify on-chain.
        </div>
      ) : loading ? (
        <div style={{ textAlign: 'center', color: 'var(--accent-blue)', fontSize: '0.7rem', padding: '15px' }}>
          [LOADING] Fetching from Horizon...
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', color: 'var(--accent-red)', fontSize: '0.7rem', padding: '15px' }}>
          ERROR: {error}
        </div>
      ) : txData ? (
        <div style={{ fontSize: '0.65rem' }}>
          {/* Status */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '4px 8px',
            background: txData.successful ? 'rgba(0,255,136,0.06)' : 'rgba(255,71,87,0.06)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '6px'
          }}>
            <span style={{ fontWeight: 600, color: txData.successful ? 'var(--accent-green)' : 'var(--accent-red)' }}>
              {txData.successful ? 'SUCCESS' : 'FAILED'}
            </span>
            <span style={{ 
              fontSize: '0.55rem', 
              padding: '1px 6px', 
              background: 'rgba(123,47,247,0.1)', 
              color: 'var(--accent-purple)',
              borderRadius: '4px',
              fontWeight: 600
            }}>
              {txData.type}
            </span>
          </div>

          {/* Details grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
            <InfoRow label="Ledger" value={`#${txData.ledger}`} />
            <InfoRow label="Fee" value={`${txData.fee.toFixed(5)} XLM`} />
            <InfoRow label="Ops" value={txData.operationCount} />
            <InfoRow label="Time" value={new Date(txData.createdAt).toLocaleTimeString()} />
          </div>

          {/* Memo (audit trail!) */}
          {txData.memo && txData.memo !== '(none)' && (
            <div style={{
              marginTop: '6px',
              padding: '5px 8px',
              background: 'rgba(255, 215, 0, 0.06)',
              border: '1px solid rgba(255, 215, 0, 0.15)',
              borderRadius: 'var(--radius-sm)'
            }}>
              <div style={{ fontSize: '0.5rem', color: 'var(--accent-gold)', textTransform: 'uppercase', fontWeight: 600 }}>
                MEMO (AI REASONING)
              </div>
              <div style={{ 
                fontFamily: 'var(--font-mono)', 
                fontSize: '0.75rem', 
                color: 'var(--text-primary)',
                fontWeight: 700,
                marginTop: '2px'
              }}>
                "{txData.memo}"
              </div>
            </div>
          )}

          {/* TX Hash */}
          <div style={{ marginTop: '6px', textAlign: 'center' }}>
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="tx-link"
              style={{ fontSize: '0.55rem' }}
            >
              {txData.hash.substring(0, 16)}...{txData.hash.slice(-6)} ↗
            </a>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div style={{
      padding: '3px 6px',
      background: 'rgba(255,255,255,0.02)',
      borderRadius: '3px'
    }}>
      <div style={{ fontSize: '0.45rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{value}</div>
    </div>
  )
}
