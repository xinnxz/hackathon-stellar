const API_URL = 'http://localhost:3000/api';

// UI Elements mapping — null-safe for multi-page usage
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
  pnl: document.getElementById('el-24h-pnl'),
  winRate: document.getElementById('el-win-rate'),
  price: document.getElementById('el-current-price'),
  chartFill: document.getElementById('chart-path-fill'),
  chartLine: document.getElementById('chart-path-line'),
  ledger: document.getElementById('el-ledger-tbody')
};

// Global State
let isTrading = false;
let latestPrice = 0;
let prices = [];
let currentWalletAddress = '';
let currentHistory = [];
let cachedBalances = { xlm: 0, usdc: 0 };

// Formatters
const fmtCurrency = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);
const fmtNumber = (n) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 5, maximumFractionDigits: 5 }).format(n || 0);
const fmtAddress = (addr) => addr ? `${addr.slice(0,5)}...${addr.slice(-4)}` : 'Connecting...';

// ══════════════════════════════════════
// Bootstrap
// ══════════════════════════════════════
async function init() {
  await fetchSkillsStatus();  // Prices first (so chart loads with historical data)
  await fetchStatus();         // Then balances (needs latestPrice for calculation)
  setupSSE();
  setupInteractions();
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
      cachedBalances.xlm = data.balances.xlm || 0;
      cachedBalances.usdc = data.balances.usdc || 0;
      
      if (el.wallet) el.wallet.innerText = fmtAddress(currentWalletAddress);
      
      if (latestPrice > 0) {
        updateTotalBalance(cachedBalances.xlm, cachedBalances.usdc);
        updateAssetAllocation(cachedBalances.xlm, cachedBalances.usdc, latestPrice);
      }
    }
  } catch (e) {
    console.error('Failed to fetch /status', e);
  }
}

async function fetchSkillsStatus() {
  try {
    const res = await fetch(`${API_URL}/skills-status`);
    const data = await res.json();
    
    // ═══ PRICE DATA (from price-history.json) ═══
    if (data.latestPrice) {
      latestPrice = data.latestPrice;
    }
    
    if (data.prices && data.prices.length > 0) {
      prices = data.prices.map(p => p.price);
      
      // Calculate % change from first to last price point
      const firstPrice = prices[0];
      const change = firstPrice > 0 ? ((latestPrice - firstPrice) / firstPrice) * 100 : 0;
      updatePriceDisplay(latestPrice, change);
      renderChart();
    }
    
    // ═══ TRADE DATA (from trade-state.json) ═══
    // trade-state.json has: { trades: [...], totalPnL, winningTrades, losingTrades }
    if (data.trades) {
      const tradeData = data.trades;
      
      // PnL — note: backend uses "totalPnL" (capital L)
      const pnl = tradeData.totalPnL || tradeData.totalPnl || 0;
      if (el.pnl) {
        el.pnl.innerText = `${pnl >= 0 ? '+' : ''}${fmtCurrency(pnl)}`;
        el.pnl.className = `text-3xl font-bold mono text-${pnl >= 0 ? 'emerald' : 'red'}-400`;
      }
      
      // Win Rate — calculated from winningTrades / totalTrades
      const totalTrades = (tradeData.winningTrades || 0) + (tradeData.losingTrades || 0);
      const winRate = totalTrades > 0 ? ((tradeData.winningTrades || 0) / totalTrades) * 100 : 0;
      if (el.winRate) el.winRate.innerText = `${winRate.toFixed(0)}%`;
      
      // Transaction History — field is "trades" (array), not "history"
      const historyArray = tradeData.trades || tradeData.history || [];
      if (el.ledger) renderLedger(historyArray);
      
      // Active Trades (open positions)
      if (el.tradesList) renderActiveTrades(tradeData.openPositions || []);
    }
  } catch (e) {
    console.error('Failed to fetch /skills-status', e);
  }
}

// ══════════════════════════════════════
// Data Display Updaters
// ══════════════════════════════════════
function updateAssetAllocation(xlm, usdc, price) {
  const xlmUsd = xlm * price;
  const totalUsd = xlmUsd + usdc;
  if (totalUsd === 0) return;
  
  const xlmPercent = Math.max(0, Math.min(100, Math.round((xlmUsd / totalUsd) * 100)));
  const usdcPercent = 100 - xlmPercent;
  
  if (el.textXlmPercentMain) el.textXlmPercentMain.innerText = `${xlmPercent}%`;
  if (el.textXlmPercentList) el.textXlmPercentList.innerText = `${xlmPercent}%`;
  if (el.textUsdcPercentList) el.textUsdcPercentList.innerText = `${usdcPercent}%`;
  
  // Circumference = 2 * PI * r. For r=65: ~408
  if (el.assetXlmCircle) {
    const xlmOffset = 408 - (408 * (xlmPercent / 100));
    const usdcOffset = 408 - (408 * (usdcPercent / 100));
    el.assetXlmCircle.style.strokeDashoffset = xlmOffset;
    el.assetUsdcCircle.style.strokeDashoffset = usdcOffset;
  }
}

function updatePriceDisplay(price, change) {
  if (!el.price) return;
  el.price.innerText = `${fmtNumber(price)} (${change > 0 ? '+' : ''}${change.toFixed(2)}%)`;
  el.price.className = `text-${change >= 0 ? 'emerald' : 'red'}-400 mono text-base font-bold`;
}

function updateTotalBalance(xlm, usdc) {
  if (!el.totalBalance) return;
  const total = (xlm * latestPrice) + usdc;
  el.totalBalance.innerText = fmtCurrency(total);
}

function updateTradingUI() {
  // Update status text even if other elements are missing
  if (el.status) {
    if (isTrading) {
      el.status.innerText = 'TRADING';
      el.status.className = 'text-[11px] font-bold text-emerald-400 uppercase';
    } else {
      el.status.innerText = 'IDLE';
      el.status.className = 'text-[11px] font-bold text-on-surface-variant uppercase';
    }
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
    let row = [
      new Date(trade.timestamp).toISOString(),
      "XLM/USDC",
      trade.action,
      trade.price,
      trade.amount,
      trade.pnl || 0,
      trade.txHash || ''
    ];
    csvContent += row.join(",") + "\n";
  });
  
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `stellar_trades_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ══════════════════════════════════════
// Interactions
// ══════════════════════════════════════
function setupInteractions() {
  // Toggle trading ON/OFF
  const toggleTrading = async () => {
    const endpoint = isTrading ? '/stop' : '/start';
    if (el.status) el.status.innerText = isTrading ? 'STOPPING...' : 'STARTING...';
    
    try {
      const res = await fetch(`${API_URL}${endpoint}`, { method: 'POST' });
      const data = await res.json();
      
      if (data.error) {
        showToast(`Error: ${data.error}`);
        updateTradingUI(); // revert
        return;
      }
      
      isTrading = !isTrading;
      updateTradingUI();
      showToast(isTrading ? '🚀 Trading started!' : '⏸️ Trading stopped.');
    } catch (e) {
      console.error('Toggle trade error:', e);
      showToast('Failed to connect to backend server.');
      updateTradingUI(); // revert
    }
  };

  if (el.btnExecute) el.btnExecute.addEventListener('click', toggleTrading);
  if (el.btnToggle) el.btnToggle.addEventListener('click', toggleTrading);
  
  // Copy wallet address
  if (el.btnWalletCopy) {
    el.btnWalletCopy.addEventListener('click', () => {
      if (currentWalletAddress) {
        navigator.clipboard.writeText(currentWalletAddress);
        showToast('Wallet address copied to clipboard');
      }
    });
  }
  
  // Export CSV
  if (el.btnExportCsv) {
    el.btnExportCsv.addEventListener('click', () => {
      exportCsv();
      showToast('Downloading CSV...');
    });
  }
  
  // View Explorer — opens Stellar Expert for agent wallet
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
  const navLinks = document.querySelectorAll('nav a');
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const targetHref = link.getAttribute('href');
      if (!targetHref || targetHref === '#' || window.location.pathname.endsWith(targetHref)) return;
      
      e.preventDefault();
      const mainEl = document.querySelector('main');
      if (mainEl) {
        mainEl.style.transition = 'opacity 0.2s ease-out, transform 0.2s ease-out';
        mainEl.style.opacity = 0;
        mainEl.style.transform = 'translateY(10px)';
      }
      
      document.body.style.cursor = 'wait';
      setTimeout(() => {
        window.location.href = targetHref;
      }, 200);
    });
  });
  
  // ═══ Dummy Elements — show toast on click ═══
  const unclickableElements = document.querySelectorAll('a[href="#"], button:not(#btn-execute-trade):not(#btn-wallet-connect), .cursor-pointer:not(#btn-agent-toggle):not(#btn-wallet-copy):not(#btn-export-csv)');
  unclickableElements.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Chart timeframe toggle (visual only)
      if (item.parentNode && item.parentNode.classList.contains('bg-surface-container-lowest')) {
        const siblings = item.parentNode.querySelectorAll('button');
        siblings.forEach(s => {
          s.classList.remove('bg-surface-variant', 'text-primary-container', 'rounded');
          s.classList.add('text-on-surface-variant');
        });
        item.classList.remove('text-on-surface-variant');
        item.classList.add('bg-surface-variant', 'text-primary-container', 'rounded');
        showToast('Chart timeframe updated.');
        return;
      }
      
      showToast('This feature is restricted in the current runtime environment.');
    });
  });
}

// ══════════════════════════════════════
// Toast Notification
// ══════════════════════════════════════
function showToast(msg) {
  let toast = document.getElementById('demo-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'demo-toast';
    toast.className = 'fixed bottom-6 right-6 bg-surface-container-highest border border-primary-container/20 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 z-50 transform transition-all duration-300 translate-y-20 opacity-0';
    toast.innerHTML = `
      <span class="material-symbols-outlined text-primary-container" style="font-size: 18px;">info</span>
      <span class="text-xs font-bold tracking-wide text-on-surface uppercase toast-msg">${msg}</span>
    `;
    document.body.appendChild(toast);
  } else {
    const msgEl = toast.querySelector('.toast-msg');
    if (msgEl) msgEl.innerText = msg;
  }
  
  setTimeout(() => {
    toast.classList.remove('translate-y-20', 'opacity-0');
  }, 10);
  
  if (toast.timer) clearTimeout(toast.timer);
  toast.timer = setTimeout(() => {
    toast.classList.add('translate-y-20', 'opacity-0');
  }, 3000);
}

// ══════════════════════════════════════
// SSE Real-Time Stream
// ══════════════════════════════════════
function setupSSE() {
  const source = new EventSource(`${API_URL}/events`);
  let lastTime = performance.now();
  
  source.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data);
      const now = new Date(msg.timestamp);
      
      // Latency measurement
      const pingTime = performance.now() - lastTime;
      if (pingTime > 100 && pingTime < 3000 && el.latency) {
        el.latency.innerText = `${Math.round(pingTime)}ms`;
      }
      if (el.pulse) el.pulse.innerText = now.toLocaleTimeString('en-US', { hour12: false });
      lastTime = performance.now();
      
      // ═══ Handle SSE event types ═══
      if (msg.type === 'STATUS' && msg.data.balances) {
        cachedBalances.xlm = msg.data.balances.xlm;
        cachedBalances.usdc = msg.data.balances.usdc;
        if (msg.data.balances.publicKey) {
          currentWalletAddress = msg.data.balances.publicKey;
          if (el.wallet) el.wallet.innerText = fmtAddress(currentWalletAddress);
        }
        
        if (latestPrice > 0) {
          updateTotalBalance(cachedBalances.xlm, cachedBalances.usdc);
          updateAssetAllocation(cachedBalances.xlm, cachedBalances.usdc, latestPrice);
        }
      }
      
      if (msg.type === 'PRICE_POLL') {
        latestPrice = msg.data.price;
        prices.push(latestPrice);
        if (prices.length > 100) prices.shift(); // sliding window
        
        updatePriceDisplay(latestPrice, msg.data.change || 0);
        renderChart();
        
        // Recalculate balance with new price
        if (cachedBalances.xlm > 0) {
          updateTotalBalance(cachedBalances.xlm, cachedBalances.usdc);
          updateAssetAllocation(cachedBalances.xlm, cachedBalances.usdc, latestPrice);
        }
      }
      
      if (msg.type === 'TRADE') {
        // Full refetch to sync all metrics
        fetchSkillsStatus();
        fetchStatus();
        showToast(`Trade executed: ${msg.data.action} ${msg.data.amount} XLM @ $${(msg.data.price || 0).toFixed(5)}`);
      }
      
    } catch (err) {
      // Ignore parse errors from ping/keepalive messages
    }
  };
  
  source.onerror = () => {
    if (el.status) {
      el.status.innerText = 'OFFLINE';
      el.status.className = 'text-[11px] font-bold text-red-400 uppercase';
    }
  };
}

// ══════════════════════════════════════
// SVG Chart Renderer
// ══════════════════════════════════════
function renderChart() {
  if (!prices.length || !el.chartLine || !el.chartFill) return;
  
  const width = 100;
  const height = 100;
  
  const min = Math.min(...prices) * 0.999;
  const max = Math.max(...prices) * 1.001;
  const range = max - min || 1;
  
  const getX = (i) => (i / (prices.length - 1 || 1)) * width;
  const getY = (val) => height - ((val - min) / range) * height; 
  
  let pathD = `M 0 ${getY(prices[0]).toFixed(1)} `;
  prices.forEach((p, i) => {
    pathD += `L ${getX(i).toFixed(1)} ${getY(p).toFixed(1)} `;
  });
  
  el.chartLine.setAttribute('d', pathD);
  el.chartFill.setAttribute('d', `${pathD} L 100 100 L 0 100 Z`);
}

// ══════════════════════════════════════
// Ledger Table Renderer
// ══════════════════════════════════════
function renderLedger(history) {
  if (!el.ledger) return;
  el.ledger.innerHTML = '';
  
  // Store globally for CSV export
  currentHistory = history;
  
  // Sort descending by timestamp
  const sorted = [...history].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
  sorted.slice(0, 15).forEach(trade => {
    const time = new Date(trade.timestamp).toLocaleTimeString('en-US', { hour12: false });
    const date = new Date(trade.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const isBuy = trade.action === 'BUY';
    const pnlVal = trade.pnl || 0;
    const pnlColor = pnlVal >= 0 ? 'emerald-400' : 'red-400';
    const pnlSign = pnlVal >= 0 ? '+' : '';
    
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-surface-bright transition-colors cursor-default';
    tr.innerHTML = `
      <td class="px-6 py-5 mono text-[11px]"><div>${time}</div><div class="text-on-surface-variant text-[9px]">${date}</div></td>
      <td class="px-6 py-5 text-xs font-bold">XLM/USDC</td>
      <td class="px-6 py-5"><span class="px-2 py-1 bg-${isBuy ? 'emerald' : 'red'}-500/10 text-${isBuy ? 'emerald' : 'red'}-400 text-[10px] font-bold rounded uppercase">${trade.action}</span></td>
      <td class="px-6 py-5 mono text-xs text-right font-medium">${fmtNumber(trade.price)}</td>
      <td class="px-6 py-5 mono text-xs text-right font-medium">${trade.amount} XLM</td>
      <td class="px-6 py-5 mono text-xs text-right text-${pnlColor} font-bold">${pnlVal !== 0 && pnlVal !== null ? pnlSign + fmtCurrency(pnlVal) : '—'}</td>
      <td class="px-6 py-5 text-right">
        <a href="https://stellar.expert/explorer/testnet/tx/${trade.txHash}" target="_blank" class="text-[10px] font-bold uppercase tracking-widest text-primary-container/80 hover:text-primary-container px-2 py-1 bg-primary-container/5 hover:bg-primary-container/10 rounded transition-colors">${trade.txHash ? trade.txHash.substring(0,8) + '...' : 'N/A'}</a>
      </td>
    `;
    el.ledger.appendChild(tr);
  });
}

// ══════════════════════════════════════
// Active Trades Renderer
// ══════════════════════════════════════
function renderActiveTrades(positions) {
  if (!el.tradesList) return;
  el.tradesList.innerHTML = '';
  
  // Update count badge
  if (el.tradesCount) {
    el.tradesCount.innerText = positions?.length ? String(positions.length).padStart(2, '0') : '00';
  }
  
  if (!positions || positions.length === 0) {
    el.tradesList.innerHTML = '<div class="text-[10px] text-center text-on-surface-variant py-2">No active trades</div>';
    return;
  }
  
  positions.forEach(pos => {
    const isBuy = pos.side === 'BUY';
    const color = isBuy ? 'emerald-400' : 'red-400';
    const sign = isBuy ? '+' : '-';
    
    const div = document.createElement('div');
    div.className = 'flex justify-between items-center text-[10px] mono border-b border-outline-variant/5 pb-2';
    div.innerHTML = `
      <span class="text-${color} font-bold uppercase">XLM/USDC ${pos.side}</span>
      <span class="text-on-surface">${sign}${fmtNumber(pos.amount)} XLM</span>
    `;
    el.tradesList.appendChild(div);
  });
}

// ══════════════════════════════════════
// Start Application
// ══════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  // Entrance animation
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
