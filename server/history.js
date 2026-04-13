/**
 * history.js
 * ==========
 * Event history store — menyimpan semua aktivitas agent untuk dashboard.
 * 
 * PENJELASAN:
 * Setiap aksi agent (bayar MPP, bayar x402, analisis, trade) disimpan
 * sebagai "event" yang dikirim ke dashboard via SSE (Server-Sent Events).
 * 
 * Event types:
 * - PRICE_POLL:  Ambil data harga via MPP
 * - X402_INTEL:  Beli market data via x402
 * - ANALYSIS:    Hasil analisis indikator
 * - TRADE:       Eksekusi buy/sell di SDEX
 * - RISK:        Alert risk management
 * - STATUS:      Status update (balance, budget)
 * - CHAT:        Pesan user ↔ agent
 */

export class History {
  constructor() {
    this.events = [];
    this.sseClients = [];     // Connected SSE clients
    this.maxEvents = 200;     // Keep last 200 events
  }

  /**
   * addEvent(type, data)
   * Tambah event baru dan broadcast ke semua SSE clients.
   * 
   * PENJELASAN SSE:
   * Server-Sent Events = HTTP stream satu arah (server → client).
   * Dashboard connect ke GET /api/events dan menerima update real-time.
   * Setiap event dikirim sebagai "data: JSON\n\n" format.
   */
  addEvent(type, data) {
    const event = {
      id: this.events.length + 1,
      type,
      data,
      timestamp: new Date().toISOString()
    };
    
    this.events.push(event);
    
    // Keep only last N events (memory management)
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }
    
    // Broadcast to all SSE clients
    this.broadcast(event);
    
    return event;
  }

  /**
   * addSSEClient(res)
   * Register new SSE client connection.
   * 
   * SETUP SSE:
   * - Content-Type: text/event-stream
   * - Connection: keep-alive  
   * - Cache-Control: no-cache
   * - Kirim comment setiap 15 detik agar koneksi tidak timeout
   */
  addSSEClient(res) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    // Send initial connection event
    res.write(`data: ${JSON.stringify({ type: 'CONNECTED', timestamp: new Date().toISOString() })}\n\n`);

    this.sseClients.push(res);

    // Keep-alive ping every 15 seconds
    const keepAlive = setInterval(() => {
      res.write(': ping\n\n');
    }, 15000);

    // Remove client on disconnect
    res.on('close', () => {
      clearInterval(keepAlive);
      this.sseClients = this.sseClients.filter(c => c !== res);
    });
  }

  /**
   * broadcast(event)
   * Kirim event ke semua connected SSE clients.
   */
  broadcast(event) {
    const data = `data: ${JSON.stringify(event)}\n\n`;
    this.sseClients.forEach(client => {
      try {
        client.write(data);
      } catch (e) {
        // Client disconnected, will be cleaned up
      }
    });
  }

  /**
   * getAll() → semua events (untuk dashboard initial load)
   * getByType(type) → filter events by type
   */
  getAll() {
    return this.events;
  }

  getByType(type) {
    return this.events.filter(e => e.type === type);
  }

  getRecent(count = 20) {
    return this.events.slice(-count);
  }
}
