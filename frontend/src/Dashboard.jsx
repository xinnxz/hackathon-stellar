import { useState, useEffect, useCallback } from 'react'
import './index.css'
import ChatPanel from './components/ChatPanel'
import IndicatorPanel from './components/IndicatorPanel'
import PipelineViz from './components/PipelineViz'
import PnLTracker from './components/PnLTracker'
import WalletCard from './components/WalletCard'
import BudgetGauge from './components/BudgetGauge'
import PaymentTracker from './components/PaymentTracker'
import TradingChart from './components/TradingChart'
import ReasoningPanel from './components/ReasoningPanel'
import TxVerifier from './components/TxVerifier'

const API_URL = 'http://localhost:3000'

function Dashboard() {
  // ═══ STATE ═══
  const [isRunning, setIsRunning] = useState(false)
  const [messages, setMessages] = useState([])
  const [balances, setBalances] = useState({ xlm: 0, usdc: 0, publicKey: '' })
  const [budget, setBudget] = useState({ total: 1, spent: 0, remaining: 1, percentUsed: 0, payments: [] })
  const [indicators, setIndicators] = useState(null)
  const [confluence, setConfluence] = useState(null)
  const [pipeline, setPipeline] = useState({})
  const [trades, setTrades] = useState([])
  const [payments, setPayments] = useState([])
  const [pnl, setPnl] = useState({ totalPnL: 0, totalTrades: 0, winRate: 0, winningTrades: 0, losingTrades: 0 })
  const [priceHistory, setPriceHistory] = useState([])
  const [connected, setConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)

  // ═══ POLLING: Skills Status (budget, prices, trades) — every 3s ═══
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`${API_URL}/api/skills-status`)
        if (!res.ok) return
        const data = await res.json()

        // Budget
        if (data.budget) {
          setBudget(data.budget)
          // Extract payments from budget for PaymentTracker
          if (data.budget.payments?.length) {
            setPayments(data.budget.payments.map(p => ({
              type: p.type,
              amount: p.amount,
              detail: p.txHash
                ? `${p.method || p.type} → TX: ${p.txHash.substring(0, 8)}...`
                : (p.service || p.type),
              txHash: p.txHash,
              explorerUrl: p.explorerUrl,
              timestamp: p.timestamp
            })))
          }
        }

        // Price history
        if (data.prices?.length) {
          setPriceHistory(data.prices.map(p => ({
            price: p.price,
            time: new Date(p.timestamp).toLocaleTimeString(),
            paid: p.paid,
            txHash: p.txHash
          })))
        }

        // Trade state
        if (data.trades) {
          const ts = data.trades
          setPnl({
            totalPnL: ts.totalPnL || 0,
            totalTrades: ts.trades?.length || 0,
            winRate: ts.trades?.length > 0
              ? Math.round(((ts.winningTrades || 0) / ts.trades.length) * 100)
              : 0,
            winningTrades: ts.winningTrades || 0,
            losingTrades: ts.losingTrades || 0
          })
          if (ts.trades?.length) setTrades(ts.trades)
        }

        setLastUpdate(new Date().toLocaleTimeString())
      } catch (e) {
        // Server not running — silent fail
      }
    }

    const interval = setInterval(poll, 3000)
    poll()
    return () => clearInterval(interval)
  }, [])

  // ═══ POLLING: Agent Status + Wallet — every 5s ═══
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`${API_URL}/api/status`)
        if (!res.ok) return
        const data = await res.json()

        if (data.balances) {
          setBalances({
            xlm: data.balances.xlm || 0,
            usdc: data.balances.usdc || 0,
            publicKey: data.balances.publicKey || data.publicKey || ''
          })
        }
        setIsRunning(data.isRunning || false)
        setConnected(true)
      } catch (e) {
        setConnected(false)
      }
    }

    const interval = setInterval(poll, 5000)
    poll()
    return () => clearInterval(interval)
  }, [])

  // ═══ SSE CONNECTION (real-time events) ═══
  useEffect(() => {
    let evtSource
    try {
      evtSource = new EventSource(`${API_URL}/api/events`)
      evtSource.onopen = () => setConnected(true)
      evtSource.onerror = () => { /* will reconnect automatically */ }
      evtSource.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data)
          handleEvent(event)
        } catch (err) { /* ignore parse errors */ }
      }
    } catch (e) { /* SSE not available */ }

    return () => evtSource?.close()
  }, [])

  // ═══ EVENT HANDLER (SSE) ═══
  const handleEvent = useCallback((event) => {
    switch (event.type) {
      case 'CHAT':
        setMessages(prev => [...prev.slice(-50), {
          role: event.data.role,
          content: event.data.content,
          timestamp: event.timestamp
        }])
        break

      case 'ANALYSIS':
        if (event.data.indicators) setIndicators(event.data.indicators)
        if (event.data.confluence) setConfluence(event.data.confluence)
        break

      case 'PIPELINE':
        setPipeline(prev => ({
          ...prev,
          [event.data.step]: { name: event.data.name, status: event.data.status }
        }))
        break

      case 'TRADE':
        setTrades(prev => [...prev.slice(-20), {
          action: event.data.action,
          amount: event.data.amount,
          price: event.data.price,
          pnl: event.data.pnl,
          txHash: event.data.txHash,
          timestamp: event.timestamp
        }])
        break

      case 'RISK':
        setMessages(prev => [...prev.slice(-50), {
          role: 'agent',
          content: `[RISK] ${event.data.reason}`,
          timestamp: event.timestamp
        }])
        break

      case 'OPENCLAW_SKILL':
        setMessages(prev => [...prev.slice(-50), {
          role: 'agent',
          content: `[SKILL] ${event.data.skill} executed`,
          timestamp: event.timestamp
        }])
        break
    }
  }, [])

  // ═══ API CALLS ═══
  const startTrading = async () => {
    try {
      await fetch(`${API_URL}/api/start`, { method: 'POST' })
      setIsRunning(true)
    } catch (err) { console.error('Failed:', err) }
  }

  const stopTrading = async () => {
    try {
      await fetch(`${API_URL}/api/stop`, { method: 'POST' })
      setIsRunning(false)
    } catch (err) { console.error('Failed:', err) }
  }

  const sendChat = async (message) => {
    setMessages(prev => [...prev, { role: 'user', content: message, timestamp: new Date().toISOString() }])
    try {
      await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      })
    } catch (err) { console.error('Chat error:', err) }
  }

  // ═══ RENDER ═══
  return (
    <>
      {/* HEADER */}
      <header className="header">
        <div className="header-left">
          <span className="header-logo">StellarTradeAgent</span>
          <span className={`header-badge ${isRunning ? 'live' : 'idle'}`}>
            {isRunning ? 'LIVE' : 'IDLE'}
          </span>
          <span className={`header-badge ${connected ? 'live' : 'idle'}`}>
            {connected ? 'CONNECTED' : 'OFFLINE'}
          </span>
          {lastUpdate && (
            <span className="header-badge" style={{opacity: 0.5, fontSize: '0.7rem'}}>
              Updated: {lastUpdate}
            </span>
          )}
        </div>
        <div className="header-right">
          <span className="header-wallet">
            {balances.publicKey ? `${balances.publicKey.substring(0, 6)}...${balances.publicKey.slice(-4)}` : 'No wallet'}
          </span>
          {!isRunning ? (
            <button className="btn btn-start" onClick={startTrading}>Start Trading</button>
          ) : (
            <button className="btn btn-stop" onClick={stopTrading}>Stop Trading</button>
          )}
        </div>
      </header>

      {/* DASHBOARD */}
      <main className="dashboard">
        {/* LEFT: Chat Panel */}
        <ChatPanel messages={messages} onSend={sendChat} />

        {/* RIGHT: Stats + Visualizations */}
        <div className="right-panel">
          {/* Row 1: Wallet | Budget | P&L */}
          <WalletCard balances={balances} />
          <BudgetGauge budget={budget} />
          <PnLTracker pnl={pnl} budget={budget} trades={trades} />

          {/* Row 2: Pipeline */}
          <div className="card span-full">
            <div className="card-header">
              <span className="card-title">DECISION PIPELINE</span>
              <span style={{fontSize: '0.7rem', opacity: 0.5}}>
                {priceHistory.length} sequence | {trades.length} executions
              </span>
            </div>
            <PipelineViz pipeline={pipeline} />
          </div>

          {/* Row 3: Reasoning Panel + TX Verifier */}
          <ReasoningPanel 
            indicators={indicators}
            confluence={confluence}
            latestPrice={priceHistory.length ? priceHistory[priceHistory.length - 1]?.price : null}
            latestTrade={trades.length ? trades[trades.length - 1] : null}
            pipeline={pipeline}
            budget={budget}
          />
          <TxVerifier payments={payments} trades={trades} />

          {/* Row 4: Indicators | Chart | Log */}
          <IndicatorPanel indicators={indicators} confluence={confluence} />
          <TradingChart priceHistory={priceHistory} />
          <PaymentTracker payments={payments} />
        </div>
      </main>
    </>
  )
}

export default Dashboard
