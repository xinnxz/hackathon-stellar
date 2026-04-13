import { useState, useEffect, useRef, useCallback } from 'react'
import './index.css'
import ChatPanel from './components/ChatPanel'
import IndicatorPanel from './components/IndicatorPanel'
import PipelineViz from './components/PipelineViz'
import PnLTracker from './components/PnLTracker'
import WalletCard from './components/WalletCard'
import BudgetGauge from './components/BudgetGauge'
import PaymentTracker from './components/PaymentTracker'
import TradingChart from './components/TradingChart'

const API_URL = 'http://localhost:3000'

function App() {
  // ═══ STATE ═══
  const [isRunning, setIsRunning] = useState(false)
  const [messages, setMessages] = useState([])
  const [balances, setBalances] = useState({ xlm: 0, usdc: 0, publicKey: '' })
  const [budget, setBudget] = useState({ total: 1, spent: 0, remaining: 1, percentUsed: 0 })
  const [indicators, setIndicators] = useState(null)
  const [confluence, setConfluence] = useState(null)
  const [pipeline, setPipeline] = useState({})
  const [trades, setTrades] = useState([])
  const [payments, setPayments] = useState([])
  const [pnl, setPnl] = useState({ totalPnL: 0, totalTrades: 0, winRate: 0, winningTrades: 0, losingTrades: 0 })
  const [priceHistory, setPriceHistory] = useState([])
  const [connected, setConnected] = useState(false)

  // ═══ SSE CONNECTION ═══
  useEffect(() => {
    const evtSource = new EventSource(`${API_URL}/api/events`)

    evtSource.onopen = () => setConnected(true)
    evtSource.onerror = () => setConnected(false)

    evtSource.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data)
        handleEvent(event)
      } catch (err) {
        // Ignore parse errors (like ping)
      }
    }

    return () => evtSource.close()
  }, [])

  // ═══ EVENT HANDLER ═══
  const handleEvent = useCallback((event) => {
    switch (event.type) {
      case 'CONNECTED':
        setConnected(true)
        break

      case 'CHAT':
        setMessages(prev => [...prev.slice(-50), {
          role: event.data.role,
          content: event.data.content,
          timestamp: event.timestamp
        }])
        break

      case 'STATUS':
        if (event.data.balances) setBalances(event.data.balances)
        if (event.data.budget) setBudget(event.data.budget)
        if (event.data.risk) setPnl(event.data.risk)
        break

      case 'PRICE_POLL':
        setPayments(prev => [...prev.slice(-30), {
          type: 'MPP',
          amount: event.data.cost,
          detail: `$${event.data.price?.toFixed(4)} (${event.data.change > 0 ? '+' : ''}${event.data.change}%)`,
          timestamp: event.timestamp
        }])
        if (event.data.price) {
          setPriceHistory(prev => [...prev.slice(-30), { 
            price: event.data.price, 
            time: new Date(event.timestamp).toLocaleTimeString() 
          }])
        }
        break

      case 'X402_INTEL':
        setPayments(prev => [...prev.slice(-30), {
          type: 'x402',
          amount: event.data.cost,
          detail: event.data.service,
          timestamp: event.timestamp
        }])
        break

      case 'ANALYSIS':
        if (event.data.indicators) setIndicators(event.data.indicators)
        if (event.data.confluence) setConfluence(event.data.confluence)
        break

      case 'TRADE':
        setTrades(prev => [...prev.slice(-20), {
          action: event.data.action,
          amount: event.data.amount,
          price: event.data.price,
          pnl: event.data.pnl,
          pnlPercent: event.data.pnlPercent,
          txHash: event.data.txHash,
          timestamp: event.timestamp
        }])
        setPayments(prev => [...prev.slice(-30), {
          type: event.data.action === 'BUY' ? 'SDEX' : 'SELL',
          amount: event.data.amount,
          detail: `${event.data.action} ${event.data.amount} XLM @ $${event.data.price?.toFixed(4)}`,
          pnl: event.data.pnl,
          txHash: event.data.txHash,
          timestamp: event.timestamp
        }])
        break

      case 'PIPELINE':
        setPipeline(prev => ({
          ...prev,
          [event.data.step]: { name: event.data.name, status: event.data.status }
        }))
        break

      case 'RISK':
        // Show risk alerts in chat
        setMessages(prev => [...prev.slice(-50), {
          role: 'agent',
          content: `🛡️ Risk: ${event.data.reason}`,
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
    } catch (err) {
      console.error('Failed to start:', err)
    }
  }

  const stopTrading = async () => {
    try {
      await fetch(`${API_URL}/api/stop`, { method: 'POST' })
      setIsRunning(false)
    } catch (err) {
      console.error('Failed to stop:', err)
    }
  }

  const sendChat = async (message) => {
    try {
      setMessages(prev => [...prev, { role: 'user', content: message, timestamp: new Date().toISOString() }])
      await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      })
    } catch (err) {
      console.error('Chat error:', err)
    }
  }

  // ═══ RENDER ═══
  return (
    <>
      {/* HEADER */}
      <header className="header">
        <div className="header-left">
          <span className="header-logo">⚡ StellarTradeAgent</span>
          <span className={`header-badge ${isRunning ? 'live' : 'idle'}`}>
            {isRunning ? '● LIVE' : '○ IDLE'}
          </span>
          <span className={`header-badge ${connected ? 'live' : 'idle'}`}>
            {connected ? 'SSE ✓' : 'SSE ✗'}
          </span>
        </div>
        <div className="header-right">
          <span className="header-wallet">
            {balances.publicKey ? `${balances.publicKey.substring(0, 4)}...${balances.publicKey.slice(-4)}` : 'No wallet'}
          </span>
          {!isRunning ? (
            <button className="btn btn-start" onClick={startTrading}>▶ Start</button>
          ) : (
            <button className="btn btn-stop" onClick={stopTrading}>⏸ Stop</button>
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
          <PnLTracker pnl={pnl} budget={budget} />

          {/* Row 2: Pipeline (full width) */}
          <div className="card span-full">
            <div className="card-header">
              <span className="card-title">🔄 Decision Pipeline</span>
            </div>
            <PipelineViz pipeline={pipeline} />
          </div>

          {/* Row 3: Indicators | Chart | Log */}
          <IndicatorPanel indicators={indicators} confluence={confluence} />
          <TradingChart priceHistory={priceHistory} />
          <PaymentTracker payments={payments} />
        </div>
      </main>
    </>
  )
}

export default App
