const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:3000/api' : '/api';

// ══════════════════════════════════════
// UI Elements — null-safe for multi-page usage
// ══════════════════════════════════════
const el = {
  wallet: document.getElementById('el-wallet-address'),
  btnWalletCopy: document.getElementById('btn-wallet-copy'),
  btnWalletConnect: document.getElementById('btn-wallet-connect'),
  btnExportCsv: document.getElementById('btn-export-csv'),
  assetXlmCircle: document.getElementById('svg-xlm-circle'),
  assetUsdcCircle: document.getElementById('svg-usdc-circle'),
  textXlmPercentMain: document.getElementById('text-xlm-percent-main'),
  textXlmPercentList: document.getElementById('text-xlm-percent-list'),
  textUsdcPercentList: document.getElementById('text-usdc-percent-list'),
  status: document.getElementById('el-agent-status'),
  latency: document.getElementById('el-agent-latency'),
  pulse: document.getElementById('el-agent-pulse'),
  tradesList: document.getElementById('el-active-trades-list'),
  tradesCount: document.getElementById('el-active-trades-count'),
  btnExecute: document.getElementById('btn-execute-trade'),
  btnToggle: document.getElementById('btn-agent-toggle'),
  toggleKnob: document.getElementById('el-toggle-knob'),
  totalBalance: document.getElementById('el-total-balance'),
  balanceDetail: document.getElementById('el-balance-detail'),
  pnl: document.getElementById('el-24h-pnl'),
  winRate: document.getElementById('el-win-rate'),
  price: document.getElementById('el-current-price'),
  ledger: document.getElementById('el-ledger-tbody'),
  tableXlmBalance: document.getElementById('el-table-xlm-balance'),
  tableUsdcBalance: document.getElementById('el-table-usdc-balance'),
  
  // Settings
  inMaxPosition: document.getElementById('in-max-position'),
  inStopLoss: document.getElementById('in-stop-loss'),
  inTakeProfit: document.getElementById('in-take-profit'),
  inCooldown: document.getElementById('in-cooldown'),
  btnSaveSettings: document.getElementById('btn-save-settings')
};

// ══════════════════════════════════════
// Global State
// ══════════════════════════════════════
let isTrading = false;
let latestPrice = 0;
let previousPrice = 0;
let displayPrice = 0;
let prices = [];
let currentWalletAddress = '';
let currentHistory = [];
let cachedBalances = { xlm: 0, usdc: 0 };
let currentPosition = null;
let currentAnalysis = null;

// ── Heartbeat ──
let heartbeatInterval = null;
let lastSSETime = 0;

// ══════════════════════════════════════
// Formatters
// ══════════════════════════════════════
const fmtCurrency = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);
const fmtNumber = (n) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 5, maximumFractionDigits: 5 }).format(n || 0);
const fmtAddress = (addr) => addr ? `${addr.slice(0,5)}...${addr.slice(-4)}` : 'Connecting...';

// ══════════════════════════════════════
// Bootstrap
// ══════════════════════════════════════
async function init() {
  console.log('[StellarAgent] Starting init...');
  await fetchSkillsStatus();
  await fetchStatus();
  await fetchSettings();
  setupSSE();
  setupInteractions();
  startHeartbeat();
  
  // ═══ PERIODIC SYNC — poll backend every 5s to keep UI in sync ═══
  setInterval(async () => {
    try {
      await fetchSkillsStatus();
      await fetchStatus();
    } catch(e) { /* silent */ }
  }, 5000);
  
  console.log('[StellarAgent] Init complete.');
}

// ══════════════════════════════════════
// Heartbeat — Makes everything feel ALIVE
// ══════════════════════════════════════
function startHeartbeat() {
  // 1) Live clock — updates every second. Shows time if trading, --:--:-- if idle
  setInterval(() => {
    if (el.pulse) {
      if (isTrading) {
        el.pulse.innerText = new Date().toLocaleTimeString('en-US', { hour12: false });
        el.pulse.classList.remove('opacity-50');
      } else {
        el.pulse.innerText = '--:--:--';
        el.pulse.classList.add('opacity-50');
      }
    }
  }, 1000);

  // 2) Price micro-jitter when trading (makes chart feel alive between SSE ticks)
  heartbeatInterval = setInterval(() => {
    if (latestPrice <= 0 || !isTrading) return;
    const elapsed = Date.now() - lastSSETime;
    if (elapsed > 2000 && elapsed < 30000) {
      const jitter = latestPrice * (Math.random() - 0.5) * 0.00004;
      displayPrice = latestPrice + jitter;
      updatePriceTickDisplay(displayPrice);
    }
  }, 1000);

  // 3) Position P&L live update every 2s
  setInterval(() => {
    if (currentPosition && latestPrice > 0) {
      renderActivePosition(currentPosition, currentAnalysis);
    }
  }, 2000);
}

// ══════════════════════════════════════
// REST API Fetchers
// ══════════════════════════════════════
async function fetchStatus() {
  try {
    const res = await fetch(`${API_URL}/status`);
    const data = await res.json();
    
    isTrading = data.isRunning;
    updateTradingUI();
    
    if (data.balances) {
      currentWalletAddress = data.balances.publicKey || '';
      cachedBalances.xlm = parseFloat(data.balances.xlm) || 0;
      cachedBalances.usdc = parseFloat(data.balances.usdc) || 0;
      
      if (el.wallet) el.wallet.innerText = fmtAddress(currentWalletAddress);
      
      if (latestPrice > 0) {
        updateTotalBalance(cachedBalances.xlm, cachedBalances.usdc);
        updateAssetAllocation(cachedBalances.xlm, cachedBalances.usdc, latestPrice);
      }
    }
  } catch (e) {
    console.error('[StellarAgent] Failed to fetch /status', e);
  }
}

async function fetchSkillsStatus() {
  try {
    const res = await fetch(`${API_URL}/skills-status`);
    const data = await res.json();
    
    // ═══ PRICE DATA ═══
    if (data.latestPrice) {
      latestPrice = data.latestPrice;
      displayPrice = latestPrice;
    }
    
    if (data.prices && data.prices.length > 0) {
      window.fullPricesData = data.prices;
      prices = data.prices.map(p => p.price);
      
      const firstPrice = prices[0];
      const change = firstPrice > 0 ? ((latestPrice - firstPrice) / firstPrice) * 100 : 0;
      updatePriceDisplay(latestPrice, change);
      renderChart();
    }
    
    // ═══ TRADE DATA ═══
    if (data.trades) {
      const tradeData = data.trades;
      
      // PnL
      const pnl = tradeData.totalPnL ?? tradeData.totalPnl ?? 0;
      if (el.pnl) {
        el.pnl.innerText = `${pnl >= 0 ? '+' : ''}${fmtCurrency(pnl)}`;
        el.pnl.className = `text-3xl font-bold mono text-${pnl >= 0 ? 'emerald' : 'red'}-400`;
      }
      
      // Win Rate
      const totalTrades = (tradeData.winningTrades || 0) + (tradeData.losingTrades || 0);
      const winRate = totalTrades > 0 ? ((tradeData.winningTrades || 0) / totalTrades) * 100 : 0;
      if (el.winRate) el.winRate.innerText = totalTrades > 0 ? `${winRate.toFixed(0)}%` : '—';
      
      // Current Position
      currentPosition = tradeData.position || null;
      
      // Transaction History
      const historyArray = tradeData.trades || [];
      if (el.ledger) renderLedger(historyArray);
    }
    
    // ═══ ANALYSIS DATA ═══
    currentAnalysis = data.analysis || null;
    
    // Always re-render active trades panel with latest data
    renderActivePosition(currentPosition, currentAnalysis);
    
  } catch (e) {
    console.error('[StellarAgent] Failed to fetch /skills-status', e);
  }
}

// ══════════════════════════════════════
// Price Display
// ══════════════════════════════════════
function updatePriceTickDisplay(price) {
  if (!el.price) return;
  const firstPrice = prices.length > 0 ? prices[0] : price;
  const change = firstPrice > 0 ? ((price - firstPrice) / firstPrice) * 100 : 0;
  el.price.innerText = `${fmtNumber(price)} (${change > 0 ? '+' : ''}${change.toFixed(2)}%)`;
  el.price.className = `text-${change >= 0 ? 'emerald' : 'red'}-400 mono text-base font-bold`;
}

function updatePriceDisplay(price, change) {
  if (!el.price) return;
  el.price.innerText = `${fmtNumber(price)} (${change > 0 ? '+' : ''}${change.toFixed(2)}%)`;
  el.price.className = `text-${change >= 0 ? 'emerald' : 'red'}-400 mono text-base font-bold`;
}

// ══════════════════════════════════════
// Balance & Allocation Updaters
// ══════════════════════════════════════
function updateTotalBalance(xlm, usdc) {
  if (!el.totalBalance) return;
  const total = (xlm * latestPrice) + usdc;
  el.totalBalance.innerText = fmtCurrency(total);
  
  // Show XLM + USDC breakdown
  if (el.balanceDetail) {
    el.balanceDetail.innerText = `${xlm.toFixed(2)} XLM · ${usdc.toFixed(2)} USDC`;
  }
  
  // Update Portfolio Holdings list if present
  if (el.tableXlmBalance) el.tableXlmBalance.innerText = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(xlm);
  if (el.tableUsdcBalance) el.tableUsdcBalance.innerText = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(usdc);
}

function updateAssetAllocation(xlm, usdc, price) {
  const xlmUsd = xlm * price;
  const totalUsd = xlmUsd + usdc;
  if (totalUsd === 0) return;
  
  const xlmPercent = Math.max(0, Math.min(100, Math.round((xlmUsd / totalUsd) * 100)));
  const usdcPercent = 100 - xlmPercent;
  
  if (el.textXlmPercentMain) el.textXlmPercentMain.innerText = `${xlmPercent}%`;
  if (el.textXlmPercentList) el.textXlmPercentList.innerText = `${xlmPercent}%`;
  if (el.textUsdcPercentList) el.textUsdcPercentList.innerText = `${usdcPercent}%`;
  
  if (el.assetXlmCircle) {
    const circumference = 408;
    el.assetXlmCircle.style.strokeDashoffset = circumference - (circumference * (xlmPercent / 100));
    if (el.assetUsdcCircle) {
      el.assetUsdcCircle.style.strokeDashoffset = circumference - (circumference * (usdcPercent / 100));
      el.assetUsdcCircle.style.transformOrigin = "80px 80px";
      el.assetUsdcCircle.style.transform = `rotate(${(xlmPercent / 100) * 360}deg)`;
    }
  }
}

// ══════════════════════════════════════
// Trading UI State
// ══════════════════════════════════════
function updateTradingUI() {
  if (el.status) {
    el.status.innerText = isTrading ? 'TRADING' : 'IDLE';
    el.status.className = `text-[11px] font-bold text-${isTrading ? 'emerald' : 'on-surface-variant'}-400 uppercase`;
  }
  
  if (el.btnExecute) {
    if (isTrading) {
      el.btnExecute.innerText = 'STOP TRADING';
      el.btnExecute.className = 'w-full bg-red-500 text-white py-4 rounded-xl font-black text-sm tracking-[0.2em] uppercase hover:brightness-110 transition-all shadow-lg';
    } else {
      el.btnExecute.innerText = 'EXECUTE TRADE';
      el.btnExecute.className = 'w-full bg-[#fcc010] text-[#3f2e00] py-4 rounded-xl font-black text-sm tracking-[0.2em] uppercase hover:brightness-110 transition-all shadow-lg';
    }
  }
  
  if (el.toggleKnob && el.btnToggle) {
    if (isTrading) {
      el.toggleKnob.className = 'absolute right-1 top-1 w-3 h-3 bg-on-primary rounded-full transition-all';
      el.btnToggle.className = 'w-10 h-5 bg-primary-container rounded-full relative cursor-pointer';
    } else {
      el.toggleKnob.className = 'absolute left-1 top-1 w-3 h-3 bg-on-surface-variant rounded-full transition-all';
      el.btnToggle.className = 'w-10 h-5 bg-surface-variant rounded-full relative cursor-pointer';
    }
  }
  
  // Re-render position panel
  renderActivePosition(currentPosition, currentAnalysis);
}

// ══════════════════════════════════════
// Active Position / Trades Widget
// ══════════════════════════════════════
function renderActivePosition(position, analysis) {
  if (!el.tradesList) return;
  
  if (!position) {
    if (el.tradesCount) el.tradesCount.innerText = '00';
    if (!isTrading) {
      // ── IDLE STATE ──
      el.tradesList.innerHTML = `
        <div class="text-center py-3 space-y-1 opacity-50">
          <div class="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">System Idle</div>
          <div class="text-[9px] text-on-surface-variant/50">Click Execute to start trading</div>
        </div>`;
    } else {
      // ── TRADING / SCANNING STATE ──
      if (analysis && analysis.confluence) {
        const conf = analysis.confluence;
        const ind = analysis.indicators || {};
        
        let phaseColor = 'on-surface-variant';
        if (conf.phase === 'ACCUMULATION') phaseColor = 'emerald';
        if (conf.phase === 'DISTRIBUTION') phaseColor = 'red';
        if (conf.phase === 'MARKUP') phaseColor = 'blue';
        if (conf.phase === 'MARKDOWN') phaseColor = 'orange';

        const getColor = (sig) => sig === 'BUY' ? 'emerald' : (sig === 'SELL' ? 'red' : 'on-surface-variant');

        el.tradesList.innerHTML = `
          <div class="space-y-2.5">
            <div class="flex justify-between items-center bg-surface-container rounded px-2 py-1 border border-on-surface-variant/10">
              <span class="text-[8px] text-on-surface-variant font-black uppercase tracking-widest">Phase</span>
              <span class="text-[9px] text-${phaseColor}-400 font-black uppercase tracking-widest">${conf.phase || 'SCANNING...'}</span>
            </div>
            
            <div class="grid grid-cols-3 gap-1">
              <div class="bg-surface-container/30 border border-on-surface-variant/5 rounded px-1 py-1.5 text-center">
                <div class="text-[7px] text-on-surface-variant/70 mb-[2px] font-bold uppercase">EMA</div>
                <div class="text-[9px] text-${getColor(ind.ema?.signal)}-400 font-black">${ind.ema?.signal || '-'}</div>
              </div>
              <div class="bg-surface-container/30 border border-on-surface-variant/5 rounded px-1 py-1.5 text-center">
                <div class="text-[7px] text-on-surface-variant/70 mb-[2px] font-bold uppercase">RSI</div>
                <div class="text-[9px] text-${getColor(ind.rsi?.signal)}-400 font-black">${ind.rsi?.signal || '-'}</div>
              </div>
              <div class="bg-surface-container/30 border border-on-surface-variant/5 rounded px-1 py-1.5 text-center">
                <div class="text-[7px] text-on-surface-variant/70 mb-[2px] font-bold uppercase">MR</div>
                <div class="text-[9px] text-${getColor(ind.meanReversion?.signal)}-400 font-black">${ind.meanReversion?.signal || '-'}</div>
              </div>
            </div>
            
            <div class="text-[8px] text-on-surface-variant/60 mono leading-snug uppercase border-t border-on-surface-variant/10 pt-2 flex items-start gap-1">
              <span class="text-emerald-400 animate-pulse mt-[1px]">▶</span> 
              <span class="break-words">${conf.reason || 'WAITING FOR CONFLUENCE...'}</span>
            </div>
          </div>
        `;
      } else {
        el.tradesList.innerHTML = `
          <div class="text-center py-3 space-y-1">
            <div class="text-[10px] text-emerald-400 font-bold uppercase tracking-widest flex justify-center items-center gap-1.5 animate-pulse">
              <div class="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
              Scanning market...
            </div>
            <div class="text-[9px] text-on-surface-variant/50">Loading indicators...</div>
          </div>`;
      }
    }
    return;
  }
  
  // ── ACTIVE POSITION ──
  if (el.tradesCount) el.tradesCount.innerText = '01';
  
  const isBuy = position.side === 'BUY';
  const entryPrice = position.entryPrice || 0;
  const amount = position.amount || 0;
  const entryTime = position.timestamp ? new Date(position.timestamp).toLocaleTimeString('en-US', { hour12: false }) : '--:--:--';
  
  let unrealizedPnl = 0;
  let pnlPct = 0;
  if (latestPrice > 0 && entryPrice > 0) {
    if (isBuy) {
      unrealizedPnl = (latestPrice - entryPrice) * amount;
      pnlPct = ((latestPrice - entryPrice) / entryPrice) * 100;
    } else {
      unrealizedPnl = (entryPrice - latestPrice) * amount;
      pnlPct = ((entryPrice - latestPrice) / entryPrice) * 100;
    }
  }
  
  const pnlColor = unrealizedPnl >= 0 ? 'emerald' : 'red';
  const pnlSign = unrealizedPnl >= 0 ? '+' : '';
  
  el.tradesList.innerHTML = `
    <div class="space-y-2">
      <div class="flex justify-between items-center">
        <span class="px-2 py-0.5 bg-${isBuy ? 'emerald' : 'red'}-500/10 text-${isBuy ? 'emerald' : 'red'}-400 text-[9px] font-black rounded uppercase tracking-wider">${position.side} XLM/USDC</span>
        <span class="text-[9px] text-on-surface-variant mono">${entryTime}</span>
      </div>
      <div class="grid grid-cols-2 gap-2 text-[10px]">
        <div>
          <div class="text-on-surface-variant text-[8px] uppercase tracking-wider mb-0.5">Entry</div>
          <div class="mono font-bold">${fmtNumber(entryPrice)}</div>
        </div>
        <div>
          <div class="text-on-surface-variant text-[8px] uppercase tracking-wider mb-0.5">Size</div>
          <div class="mono font-bold">${amount} XLM</div>
        </div>
        <div>
          <div class="text-on-surface-variant text-[8px] uppercase tracking-wider mb-0.5">Current</div>
          <div class="mono font-bold">${fmtNumber(latestPrice)}</div>
        </div>
        <div>
          <div class="text-on-surface-variant text-[8px] uppercase tracking-wider mb-0.5">Unreal. P&L</div>
          <div class="mono font-bold text-${pnlColor}-400">${pnlSign}${fmtCurrency(unrealizedPnl)}</div>
        </div>
      </div>
      <div class="h-1 w-full bg-surface-container-lowest rounded-full overflow-hidden">
        <div class="h-full bg-${pnlColor}-400 transition-all duration-500 rounded-full" style="width: ${Math.min(100, Math.abs(pnlPct) * 10 + 5)}%"></div>
      </div>
      <div class="text-center text-[9px] text-${pnlColor}-400 font-bold mono">${pnlSign}${pnlPct.toFixed(3)}%</div>
    </div>`;
}

// ══════════════════════════════════════
// Ledger Table Renderer
// ══════════════════════════════════════
function renderLedger(history) {
  if (!el.ledger) return;
  el.ledger.innerHTML = '';
  
  currentHistory = history;
  
  const sorted = [...history].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
  sorted.slice(0, 20).forEach(trade => {
    const time = new Date(trade.timestamp).toLocaleTimeString('en-US', { hour12: false });
    const date = new Date(trade.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const isBuy = trade.action === 'BUY';
    const pnlVal = trade.pnl;
    const hasPnl = pnlVal !== null && pnlVal !== undefined;
    const pnlColor = hasPnl ? (pnlVal >= 0 ? 'emerald-400' : 'red-400') : 'on-surface-variant';
    const pnlSign = hasPnl && pnlVal >= 0 ? '+' : '';
    
    let typeLabel = trade.action;
    let typeBg = isBuy ? 'emerald' : 'red';
    
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-surface-bright transition-colors cursor-default';
    tr.innerHTML = `
      <td class="px-6 py-5 mono text-[11px]"><div>${time}</div><div class="text-on-surface-variant text-[9px]">${date}</div></td>
      <td class="px-6 py-5 text-xs font-bold">XLM/USDC</td>
      <td class="px-6 py-5"><span class="px-2 py-1 bg-${typeBg}-500/10 text-${typeBg}-400 text-[10px] font-bold rounded uppercase">${typeLabel}</span></td>
      <td class="px-6 py-5 mono text-xs text-right font-medium">${fmtNumber(trade.price)}</td>
      <td class="px-6 py-5 mono text-xs text-right font-medium">${trade.amount} XLM</td>
      <td class="px-6 py-5 mono text-xs text-right text-${pnlColor} font-bold">${hasPnl ? pnlSign + fmtCurrency(pnlVal) : '<span class="text-on-surface-variant/40">open</span>'}</td>
      <td class="px-6 py-5 text-right">
        <a href="https://stellar.expert/explorer/testnet/tx/${trade.txHash}" target="_blank" class="text-[10px] font-bold uppercase tracking-widest text-primary-container/80 hover:text-primary-container px-2 py-1 bg-primary-container/5 hover:bg-primary-container/10 rounded transition-colors">${trade.txHash ? trade.txHash.substring(0,8) + '...' : 'N/A'}</a>
      </td>
    `;
    el.ledger.appendChild(tr);
  });
}

// ══════════════════════════════════════
// TradingView Chart Renderer
// ══════════════════════════════════════
let tvChart = null;
let tvSeries = null;
let chartRetryTimer = null;

function renderChart() {
  const container = document.getElementById('tv-chart');
  if (!container) return;
  
  // If LightweightCharts CDN hasn't loaded yet, retry in 500ms
  if (typeof LightweightCharts === 'undefined') {
    if (!chartRetryTimer) {
      chartRetryTimer = setInterval(() => {
        if (typeof LightweightCharts !== 'undefined') {
          clearInterval(chartRetryTimer);
          chartRetryTimer = null;
          renderChart();
        }
      }, 500);
    }
    return;
  }
  
  if (!window.fullPricesData || window.fullPricesData.length === 0) return;
  
  if (!tvChart) {
    tvChart = LightweightCharts.createChart(container, {
      autoSize: true,
      layout: { background: { type: 'solid', color: 'transparent' }, textColor: '#d3c5ac' },
      grid: { vertLines: { color: 'rgba(255,255,255,0.04)' }, horzLines: { color: 'rgba(255,255,255,0.04)' } },
      timeScale: { timeVisible: true, secondsVisible: true, borderColor: 'rgba(255,255,255,0.08)' },
      rightPriceScale: { borderColor: 'rgba(255,255,255,0.08)' },
      crosshair: { mode: LightweightCharts.CrosshairMode.Normal }
    });
    
    tvSeries = tvChart.addCandlestickSeries({
      upColor: '#10b981', downColor: '#ef4444', 
      borderVisible: false, wickUpColor: '#10b981', wickDownColor: '#ef4444'
    });
  }
  
  // Build OHLC candles from tick data
  const cData = [];
  window.fullPricesData.forEach((dp, i, arr) => {
    const time = Math.floor(new Date(dp.timestamp).getTime() / 1000);
    const close = dp.price;
    const open = i === 0 ? close : arr[i-1].price;
    const isUp = close >= open;
    const noise = close * 0.0015;
    cData.push({
      time,
      open,
      high: Math.max(open, close) + (isUp ? noise : noise*0.5),
      low: Math.min(open, close) - (!isUp ? noise : noise*0.5),
      close
    });
  });
  
  // Deduplicate and sort (LightweightCharts requires unique ascending times)
  const uniqueData = [];
  const timeSet = new Set();
  cData.forEach(c => {
    if (!timeSet.has(c.time)) {
      timeSet.add(c.time);
      uniqueData.push(c);
    }
  });
  uniqueData.sort((a,b) => a.time - b.time);
  
  if (uniqueData.length > 0) {
    tvSeries.setData(uniqueData);
  }
}

// ══════════════════════════════════════
// CSV Export
// ══════════════════════════════════════
function exportCsv() {
  if (!currentHistory || currentHistory.length === 0) {
    showToast('No trades to export');
    return;
  }
  
  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "Time,Pair,Action,Price,Amount XLM,PnL USD,TxHash\n";
  
  currentHistory.forEach(trade => {
    csvContent += [
      new Date(trade.timestamp).toISOString(), "XLM/USDC", trade.action,
      trade.price, trade.amount, trade.pnl || 0, trade.txHash || ''
    ].join(",") + "\n";
  });
  
  const link = document.createElement("a");
  link.setAttribute("href", encodeURI(csvContent));
  link.setAttribute("download", `stellar_trades_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ══════════════════════════════════════
// Interactions
// ══════════════════════════════════════
function setupInteractions() {
  const toggleTrading = async () => {
    const endpoint = isTrading ? '/stop' : '/start';
    if (el.status) el.status.innerText = isTrading ? 'STOPPING...' : 'STARTING...';
    
    try {
      const res = await fetch(`${API_URL}${endpoint}`, { method: 'POST' });
      const data = await res.json();
      
      if (data.error) {
        showToast(`Error: ${data.error}`);
        updateTradingUI();
        return;
      }
      
      isTrading = !isTrading;
      updateTradingUI();
      showToast(isTrading ? '🚀 Trading started!' : '⏸️ Trading stopped.');
    } catch (e) {
      showToast('Failed to connect to backend.');
      updateTradingUI();
    }
  };

  if (el.btnExecute) el.btnExecute.addEventListener('click', toggleTrading);
  if (el.btnToggle) el.btnToggle.addEventListener('click', toggleTrading);
  
  if (el.btnSaveSettings) {
    el.btnSaveSettings.addEventListener('click', saveSettings);
  }
  
  if (el.btnWalletCopy) {
    el.btnWalletCopy.addEventListener('click', () => {
      if (currentWalletAddress) {
        navigator.clipboard.writeText(currentWalletAddress);
        showToast('Wallet address copied!');
      }
    });
  }
  
  if (el.btnExportCsv) {
    el.btnExportCsv.addEventListener('click', () => {
      exportCsv();
      showToast('Downloading CSV...');
    });
  }
  
  if (el.btnWalletConnect) {
    el.btnWalletConnect.addEventListener('click', () => {
      if (currentWalletAddress) {
        window.open(`https://stellar.expert/explorer/testnet/account/${currentWalletAddress}`, '_blank');
      } else {
        showToast('Wallet address not loaded yet.');
      }
    });
  }
  
  // ═══ Smooth Page Transitions ═══
  document.querySelectorAll('nav a').forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (!href || href === '#' || window.location.pathname.endsWith(href)) return;
      e.preventDefault();
      const mainEl = document.querySelector('main');
      if (mainEl) {
        mainEl.style.transition = 'opacity 0.2s ease-out, transform 0.2s ease-out';
        mainEl.style.opacity = 0;
        mainEl.style.transform = 'translateY(10px)';
      }
      setTimeout(() => { window.location.href = href; }, 200);
    });
  });
  
  // ═══ Chart Timeframe Toggles ═══
  document.querySelectorAll('a[href="#"], button:not(#btn-execute-trade):not(#btn-wallet-connect)').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      if (item.parentNode?.classList?.contains('bg-surface-container-lowest')) {
        item.parentNode.querySelectorAll('button').forEach(s => {
          s.classList.remove('bg-surface-variant', 'text-primary-container', 'rounded');
          s.classList.add('text-on-surface-variant');
        });
        item.classList.remove('text-on-surface-variant');
        item.classList.add('bg-surface-variant', 'text-primary-container', 'rounded');
        return;
      }
    });
  });
}

// ══════════════════════════════════════
// Toast
// ══════════════════════════════════════
function showToast(msg) {
  let toast = document.getElementById('demo-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'demo-toast';
    toast.className = 'fixed bottom-6 right-6 bg-surface-container-highest border border-primary-container/20 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 z-50 transform transition-all duration-300 translate-y-20 opacity-0';
    toast.innerHTML = `<span class="material-symbols-outlined text-primary-container" style="font-size: 18px;">info</span><span class="text-xs font-bold tracking-wide text-on-surface uppercase toast-msg"></span>`;
    document.body.appendChild(toast);
  }
  const msgEl = toast.querySelector('.toast-msg');
  if (msgEl) msgEl.innerText = msg;
  
  requestAnimationFrame(() => toast.classList.remove('translate-y-20', 'opacity-0'));
  if (toast.timer) clearTimeout(toast.timer);
  toast.timer = setTimeout(() => toast.classList.add('translate-y-20', 'opacity-0'), 3000);
}

// ══════════════════════════════════════
// SSE Real-Time Stream
// ══════════════════════════════════════
function setupSSE() {
  const source = new EventSource(`${API_URL}/events`);
  
  source.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data);
      lastSSETime = Date.now();
      
      // Latency display
      if (el.latency) {
        const delay = Date.now() - new Date(msg.timestamp).getTime();
        if (delay > 0 && delay < 10000) el.latency.innerText = `${delay}ms`;
      }
      
      // ═══ Handle SSE event types ═══
      
      // PRICE_POLL — fresh real price from MPP
      if (msg.type === 'PRICE_POLL') {
        previousPrice = latestPrice;
        latestPrice = msg.data.price;
        displayPrice = latestPrice;
        
        prices.push(latestPrice);
        if (prices.length > 100) prices.shift();
        
        // Keep fullPricesData in sync for chart
        if (window.fullPricesData) {
          window.fullPricesData.push({ price: msg.data.price, timestamp: msg.timestamp || new Date().toISOString() });
          if (window.fullPricesData.length > 100) window.fullPricesData.shift();
        }
        
        updatePriceDisplay(latestPrice, msg.data.change || 0);
        renderChart();
        
        if (cachedBalances.xlm > 0) {
          updateTotalBalance(cachedBalances.xlm, cachedBalances.usdc);
          updateAssetAllocation(cachedBalances.xlm, cachedBalances.usdc, latestPrice);
        }
      }
      
      // STATUS — balance update
      if (msg.type === 'STATUS' && msg.data.balances) {
        cachedBalances.xlm = parseFloat(msg.data.balances.xlm) || 0;
        cachedBalances.usdc = parseFloat(msg.data.balances.usdc) || 0;
        if (msg.data.balances.publicKey) {
          currentWalletAddress = msg.data.balances.publicKey;
          if (el.wallet) el.wallet.innerText = fmtAddress(currentWalletAddress);
        }
        if (latestPrice > 0) {
          updateTotalBalance(cachedBalances.xlm, cachedBalances.usdc);
          updateAssetAllocation(cachedBalances.xlm, cachedBalances.usdc, latestPrice);
        }
      }
      
      // TRADE — a trade was executed on-chain
      if (msg.type === 'TRADE') {
        fetchSkillsStatus();
        fetchStatus();
        showToast(`Trade executed: ${msg.data.action} ${msg.data.amount} XLM`);
      }
      
      // PIPELINE — analysis completed
      if (msg.type === 'PIPELINE' && msg.data.status === 'done' && msg.data.name === 'Technical Analysis') {
        fetchSkillsStatus();
      }
      
    } catch (err) {
      // Ignore parse errors from ping/keepalive
    }
  };
  
  source.onerror = () => {
    if (el.status) {
      el.status.innerText = 'OFFLINE';
      el.status.className = 'text-[11px] font-bold text-red-400 uppercase';
    }
    setTimeout(() => {
      if (source.readyState === EventSource.CLOSED) setupSSE();
    }, 5000);
  };
}

// ══════════════════════════════════════
// Start Application
// ══════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  const mainEl = document.querySelector('main');
  if (mainEl) {
    mainEl.style.opacity = 0;
    mainEl.style.transform = 'translateY(15px)';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        mainEl.style.transition = 'opacity 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)';
        mainEl.style.opacity = 1;
        mainEl.style.transform = 'translateY(0)';
      });
    });
  }
  init();
});

// ══════════════════════════════════════
// Settings Management
// ══════════════════════════════════════
async function fetchSettings() {
  if (!el.btnSaveSettings) return; // Only process on settings page
  try {
    const res = await fetch(`${API_URL}/settings`);
    const data = await res.json();
    if (data && el.inMaxPosition) {
      el.inMaxPosition.value = data.maxPosition || '30%';
      el.inStopLoss.value = data.stopLoss || '-5.0%';
      el.inTakeProfit.value = data.takeProfit || '+8.0%';
      el.inCooldown.value = data.cooldown || '60 seconds';
    }
  } catch (e) {
    console.error('[StellarAgent] Error fetching settings:', e);
  }
}

async function saveSettings() {
  if (!el.btnSaveSettings) return;
  const originalText = el.btnSaveSettings.innerText;
  el.btnSaveSettings.innerText = 'SAVING...';
  
  try {
    const payload = {
      maxPosition: el.inMaxPosition.value,
      stopLoss: el.inStopLoss.value,
      takeProfit: el.inTakeProfit.value,
      cooldown: el.inCooldown.value
    };
    
    await fetch(`${API_URL}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    showToast('Settings successfully saved to backend!');
  } catch (e) {
    showToast('Failed to save settings.');
  } finally {
    setTimeout(() => {
      if (el.btnSaveSettings) el.btnSaveSettings.innerText = originalText;
    }, 1000);
  }
}
