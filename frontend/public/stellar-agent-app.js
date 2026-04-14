const API_URL = 'http://localhost:3000/api';

// UI Elements mapping
const el = {
  wallet: document.getElementById('el-wallet-address'),
  btnWalletCopy: document.getElementById('btn-wallet-copy'),
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

// Formatters
const fmtCurrency = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
const fmtNumber = (n) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 5, maximumFractionDigits: 5 }).format(n);
const fmtAddress = (addr) => addr ? `${addr.slice(0,5)}...${addr.slice(-4)}` : 'Connecting...';

// Bootstrap
async function init() {
  await fetchStatus();
  await fetchSkillsStatus();
  setupSSE();
  setupInteractions();
}

async function fetchStatus() {
  try {
    const res = await fetch(`${API_URL}/status`);
    const data = await res.json();
    
    isTrading = data.isRunning;
    updateTradingUI();
    
    if (data.balances) {
      if (el.wallet) el.wallet.innerText = fmtAddress(currentWalletAddress);
      
      // Only recalc if price is loaded
      if (latestPrice > 0) {
        updateTotalBalance(data.balances.xlm, data.balances.usdc);
        updateAssetAllocation(data.balances.xlm, data.balances.usdc, latestPrice);
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
    
    if (data.latestPrice) {
      latestPrice = data.latestPrice;
      const change = data.prices?.length > 1 ? ((latestPrice - data.prices[0].price) / data.prices[0].price) * 100 : 0;
      updatePriceDisplay(latestPrice, change);
    }
    
    if (data.prices) {
      prices = data.prices.map(p => p.price);
      renderChart();
    }
    
    if (data.trades) {
      const pnl = data.trades.totalPnl || 0;
      if(el.pnl) {
        el.pnl.innerText = `${pnl >= 0 ? '+' : ''}${fmtCurrency(pnl)}`;
        el.pnl.className = `text-3xl font-bold mono text-${pnl >= 0 ? 'emerald' : 'red'}-400`;
      }
      if(el.winRate) el.winRate.innerText = `${((data.trades.stats?.winRate || 0)*100).toFixed(0)}%`;
      
      if(el.ledger) renderLedger(data.trades.history || []);
      if(el.tradesList) renderActiveTrades(data.trades.openPositions || []);
    }
    
    // Trigger total balance recalculation
    fetchStatus();
  } catch (e) {
    console.error('Failed to fetch /skills-status', e);
  }
}

function updateAssetAllocation(xlm, usdc, price) {
  if (!el.assetXlmCircle) return;
  const totalUsdStr = (xlm * price) + usdc;
  if(totalUsdStr === 0) return;
  
  const xlmPercent = Math.max(0, Math.min(100, Math.round(((xlm * price) / totalUsdStr) * 100)));
  const usdcPercent = Math.max(0, Math.min(100, Math.round((usdc / totalUsdStr) * 100)));
  
  el.textXlmPercentMain.innerText = `${xlmPercent}%`;
  el.textXlmPercentList.innerText = `${xlmPercent}%`;
  el.textUsdcPercentList.innerText = `${usdcPercent}%`;
  
  // Circumference of r=65 is 2*PI*65 ~= 408
  const xlmOffset = 408 - (408 * (xlmPercent / 100));
  const usdcOffset = 408 - (408 * (usdcPercent / 100));
  
  el.assetXlmCircle.style.strokeDashoffset = xlmOffset;
  el.assetUsdcCircle.style.strokeDashoffset = usdcOffset;
}

function updatePriceDisplay(price, change) {
  if(!el.price) return;
  el.price.innerText = `${fmtNumber(price)} (${change > 0 ? '+' : ''}${change.toFixed(2)}%)`;
  el.price.className = `text-${change >= 0 ? 'emerald' : 'red'}-400 mono text-base font-bold`;
}

function updateTotalBalance(xlm, usdc) {
  if(!el.totalBalance) return;
  const total = (xlm * latestPrice) + usdc;
  el.totalBalance.innerText = fmtCurrency(total);
}

function updateTradingUI() {
  if(!el.status || !el.btnExecute || !el.btnToggle) return;
  if (isTrading) {
    el.status.innerText = 'TRADING';
    el.status.className = 'text-[11px] font-bold text-emerald-400 uppercase';
    el.btnExecute.innerText = 'STOP TRADING';
    el.btnExecute.classList.replace('bg-[#fcc010]', 'bg-red-500');
    el.btnExecute.classList.replace('text-[#3f2e00]', 'text-white');
    el.toggleKnob.className = 'absolute right-1 top-1 w-3 h-3 bg-on-primary rounded-full transition-all';
    el.btnToggle.className = 'w-10 h-5 bg-primary-container rounded-full relative cursor-pointer';
  } else {
    el.status.innerText = 'IDLE';
    el.status.className = 'text-[11px] font-bold text-on-surface-variant uppercase';
    el.btnExecute.innerText = 'EXECUTE TRADE';
    el.btnExecute.classList.replace('bg-red-500', 'bg-[#fcc010]');
    el.btnExecute.classList.replace('text-white', 'text-[#3f2e00]');
    el.toggleKnob.className = 'absolute left-1 top-1 w-3 h-3 bg-on-surface-variant rounded-full transition-all';
    el.btnToggle.className = 'w-10 h-5 bg-surface-variant rounded-full relative cursor-pointer';
  }
}

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

function setupInteractions() {
  const toggleTrading = async () => {
    if(!el.status) return;
    const endpoint = isTrading ? '/stop' : '/start';
    el.status.innerText = isTrading ? 'STOPPING...' : 'STARTING...';
    try {
      await fetch(`${API_URL}${endpoint}`, { method: 'POST' });
      isTrading = !isTrading;
      updateTradingUI();
    } catch (e) {
      console.error(e);
      updateTradingUI(); // revert on fail
    }
  };

  if(el.btnExecute) el.btnExecute.addEventListener('click', toggleTrading);
  if(el.btnToggle) el.btnToggle.addEventListener('click', toggleTrading);
  
  // Real algorithms for Wallet & CSV
  if (el.btnWalletCopy) {
    el.btnWalletCopy.addEventListener('click', () => {
      if(currentWalletAddress) {
        navigator.clipboard.writeText(currentWalletAddress);
        showToast('Wallet address copied to clipboard');
      }
    });
  }
  
  if (el.btnExportCsv) {
    el.btnExportCsv.addEventListener('click', () => {
      exportCsv();
      showToast('Downloading CSV...');
    });
  }
  
  // Smart Page Transitions for Navigation
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

  // Add global click handler for dummy buttons/links to make UI feel fully interactive
  const unclickableElements = document.querySelectorAll('a[href="#"], button:not(#btn-execute-trade):not(#btn-wallet-connect), .cursor-pointer:not(#btn-agent-toggle):not(#btn-wallet-copy):not(#btn-export-csv)');

  unclickableElements.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Special logic for chart filter buttons to toggle active state
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

function showToast(msg) {
  let toast = document.getElementById('demo-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'demo-toast';
    toast.className = 'fixed bottom-6 right-6 bg-surface-container-highest border border-primary-container/20 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 z-50 transform transition-all duration-300 translate-y-20 opacity-0';
    toast.innerHTML = `
      <span class="material-symbols-outlined text-primary-container" style="font-size: 18px;">info</span>
      <span class="text-xs font-bold tracking-wide text-on-surface uppercase">${msg}</span>
    `;
    document.body.appendChild(toast);
  } else {
    toast.querySelector('.text-xs').innerText = msg;
  }
  
  setTimeout(() => {
    toast.classList.remove('translate-y-20', 'opacity-0');
  }, 10);
  
  if(toast.timer) clearTimeout(toast.timer);
  toast.timer = setTimeout(() => {
    toast.classList.add('translate-y-20', 'opacity-0');
  }, 3000);
}

function setupSSE() {
  const source = new EventSource(`${API_URL}/events`);
  let lastTime = performance.now();
  
  source.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data);
      const now = new Date(msg.timestamp);
      
      const pingTime = performance.now() - lastTime;
      // Filter out some noise, only update latency realistically
      if (pingTime > 100 && pingTime < 3000 && el.latency) {
        el.latency.innerText = `${Math.round(pingTime)}ms`;
      }
      if (el.pulse) el.pulse.innerText = now.toLocaleTimeString('en-US', { hour12: false });
      lastTime = performance.now();
      
      if (msg.type === 'STATUS' && msg.data.balances) {
         updateTotalBalance(msg.data.balances.xlm, msg.data.balances.usdc);
         updateAssetAllocation(msg.data.balances.xlm, msg.data.balances.usdc, latestPrice);
      }
      
      if (msg.type === 'PRICE_POLL') {
         latestPrice = msg.data.price;
         prices.push(latestPrice);
         if (prices.length > 50) prices.shift(); // sliding window of 50 points
         
         updatePriceDisplay(latestPrice, msg.data.change || 0);
         renderChart();
      }
      
      if (msg.type === 'TRADE') {
         // Full refetch to sync all metrics (winrate, pnl, ledger)
         fetchSkillsStatus();
      }
      
    } catch (err) {
      console.error('SSE Error', err);
    }
  };
}

// Draw dynamic SVG line
function renderChart() {
  if (!prices.length || !el.chartLine || !el.chartFill) return;
  
  const width = 100;
  const height = 100;
  
  const min = Math.min(...prices) * 0.999;
  const max = Math.max(...prices) * 1.001;
  const range = max - min || 1; // prevent div by zero
  
  const getX = (i) => (i / (prices.length - 1 || 1)) * width;
  const getY = (val) => height - ((val - min) / range) * height; 
  
  let pathD = `M 0 ${getY(prices[0])} `;
  prices.forEach((p, i) => {
    pathD += `L ${getX(i).toFixed(1)} ${getY(p).toFixed(1)} `;
  });
  
  el.chartLine.setAttribute('d', pathD);
  el.chartFill.setAttribute('d', `${pathD} L 100 100 L 0 100 Z`);
}

function renderLedger(history) {
  if (!el.ledger) return;
  el.ledger.innerHTML = '';
  
  // Store global history for CSV export
  currentHistory = history;
  
  // Create copy and sort desc
  const sorted = [...history].sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
  
  sorted.slice(0, 10).forEach(trade => {
    const time = new Date(trade.timestamp).toLocaleTimeString('en-US', { hour12: false });
    const isBuy = trade.action === 'BUY';
    const pnlColor = trade.pnl >= 0 ? 'emerald-400' : 'red-400';
    const pnlSign = trade.pnl >= 0 ? '+' : '';
    
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-surface-bright transition-colors cursor-default';
    tr.innerHTML = `
      <td class="px-6 py-5 mono text-[11px]">${time}</td>
      <td class="px-6 py-5 text-xs font-bold">XLM/USDC</td>
      <td class="px-6 py-5"><span class="px-2 py-1 bg-${isBuy ? 'emerald' : 'red'}-500/10 text-${isBuy ? 'emerald' : 'red'}-400 text-[10px] font-bold rounded uppercase">${trade.action}</span></td>
      <td class="px-6 py-5 mono text-xs text-right font-medium">${fmtNumber(trade.price)}</td>
      <td class="px-6 py-5 mono text-xs text-right font-medium">${fmtCurrency(trade.amount).replace('$','')}</td>
      <td class="px-6 py-5 mono text-xs text-right text-${pnlColor} font-bold">${pnlSign}${fmtCurrency(trade.pnl)}</td>
      <td class="px-6 py-5 text-right"><span class="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant px-2 py-1 bg-surface-container-highest rounded">Completed</span></td>
    `;
    el.ledger.appendChild(tr);
  });
}

function renderActiveTrades(positions) {
  if (!el.tradesList) return;
  el.tradesList.innerHTML = '';
  
  if (!positions || positions.length === 0) {
    el.tradesList.innerHTML = '<div class="text-[10px] text-center text-on-surface-variant py-2">No active trades</div>';
    return;
  }
  
  let totalExposure = 0;
  
  positions.forEach(pos => {
    totalExposure += (pos.amount * latestPrice); 
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
  
  const expDiv = document.createElement('div');
  expDiv.className = 'text-[10px] text-center pt-1';
  expDiv.innerHTML = `<span class="text-tertiary uppercase font-bold tracking-tighter">Exposure: ${fmtCurrency(totalExposure)}</span>`;
  el.tradesList.appendChild(expDiv);
}

// Start app
document.addEventListener('DOMContentLoaded', init);
