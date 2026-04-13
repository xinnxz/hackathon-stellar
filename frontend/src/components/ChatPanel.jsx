import { useRef, useEffect, useState } from 'react'

/**
 * ChatPanel
 * =========
 * Panel percakapan user ↔ agent.
 * Menampilkan reasoning agent, indicator votes, dan command responses.
 * Auto-scroll ke bawah saat ada pesan baru.
 */
export default function ChatPanel({ messages = [], onSend }) {
  const messagesEndRef = useRef(null)
  const [input, setInput] = useState('')

  // Auto-scroll ke bawah
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (input.trim()) {
      onSend(input.trim())
      setInput('')
    }
  }

  return (
    <div className="left-panel">
      <div className="chat-header">AGENT LOGS</div>
      
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-message agent" style={{ opacity: 0.5 }}>
            Type "start trading" to begin autonomous trading...
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`chat-message ${msg.role}`}>
            {msg.content}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-container" onSubmit={handleSubmit}>
        <input
          className="chat-input"
          type="text"
          placeholder='Type "start trading", "status", "balance"...'
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
      </form>
    </div>
  )
}
