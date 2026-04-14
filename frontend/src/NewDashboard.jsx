import React from 'react';

function NewDashboard() {
  return (
    <div className="bg-surface text-on-surface overflow-hidden h-screen w-full font-inter">
      <header className="flex justify-between items-center w-full px-6 h-16 bg-[#07151d] fixed top-0 z-50 border-b border-outline-variant/10">
        <div className="flex items-center gap-8">
          <span className="text-xl font-bold tracking-tight text-[#fcc010]">StellarTradeAgent</span>
          <nav className="hidden md:flex gap-6">
            <a className="text-[#fcc010] border-b-2 border-[#fcc010] pb-1 font-bold text-sm tracking-wide" href="#">Markets</a>
            <a className="text-[#d3c5ac] font-medium text-sm tracking-wide hover:bg-[#1f2c34] transition-colors duration-150 px-2 rounded" href="#">Portfolio</a>
            <a className="text-[#d3c5ac] font-medium text-sm tracking-wide hover:bg-[#1f2c34] transition-colors duration-150 px-2 rounded" href="#">History</a>
            <a className="text-[#d3c5ac] font-medium text-sm tracking-wide hover:bg-[#1f2c34] transition-colors duration-150 px-2 rounded" href="#">Settings</a>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center bg-surface-container-low px-3 py-1.5 rounded-lg border border-outline-variant/20 gap-2">
            <span className="material-symbols-outlined text-primary-container" data-icon="account_balance_wallet">account_balance_wallet</span>
            <span className="mono text-xs font-medium">0x71C...4e92</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-container-low rounded-lg border border-outline-variant/10">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant">Mainnet</span>
          </div>
          <button className="bg-[#fcc010] text-[#3f2e00] px-4 py-2 rounded-lg font-bold text-sm hover:brightness-110 transition-all">
            Connect Wallet
          </button>
        </div>
      </header>

      <aside className="flex flex-col fixed left-0 top-16 bottom-0 w-80 z-40 bg-[#101d26] border-r border-outline-variant/10 overflow-y-auto">
        <div className="p-6 space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-surface-container-high rounded-lg flex items-center justify-center border border-outline-variant/30 text-primary-container">
              <span className="material-symbols-outlined" data-icon="psychology">psychology</span>
            </div>
            <div>
              <div className="text-[11px] font-black tracking-[0.1em] text-on-surface-variant uppercase">AI Command Hub</div>
              <div className="text-[10px] text-emerald-400 font-medium">Autonomous Mode: Active</div>
            </div>
          </div>
          <div className="bg-surface-container-high/40 p-4 rounded-xl border border-outline-variant/10">
            <div className="flex justify-between items-center mb-4">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">AI Agent Control</span>
              <div className="w-10 h-5 bg-primary-container rounded-full relative cursor-pointer">
                <div className="absolute right-1 top-1 w-3 h-3 bg-on-primary rounded-full"></div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-on-surface-variant uppercase tracking-wide">Status</span>
                <span className="text-[11px] font-bold text-emerald-400 uppercase">Searching</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-on-surface-variant uppercase tracking-wide">Latency</span>
                <span className="text-[11px] font-bold mono">14ms</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-on-surface-variant uppercase tracking-wide">Last Pulse</span>
                <span className="text-[11px] font-bold mono">10:42:01</span>
              </div>
            </div>
          </div>

          <div className="bg-surface-container-high/40 p-4 rounded-xl border border-outline-variant/10">
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-4 block">Risk Parameters</span>
            <div className="space-y-5">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-[11px] text-on-surface-variant uppercase tracking-wider">Leverage</span>
                  <span className="text-xs font-bold mono">5.0x</span>
                </div>
                <div className="h-1 w-full bg-surface-container-lowest rounded-full overflow-hidden">
                  <div className="h-full bg-primary-container" style={{ width: '50%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-[11px] text-on-surface-variant uppercase tracking-wider">Max Drawdown</span>
                  <span className="text-xs font-bold mono">2.5%</span>
                </div>
                <div className="h-1 w-full bg-surface-container-lowest rounded-full overflow-hidden">
                  <div className="h-full bg-tertiary-container" style={{ width: '25%' }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-surface-container-high/40 p-4 rounded-xl border border-outline-variant/10">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Active Trades</span>
              <span className="text-xs font-bold mono text-on-surface">04</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[10px] mono border-b border-outline-variant/5 pb-2">
                <span className="text-emerald-400 font-bold uppercase">XLM/USDC</span>
                <span className="text-on-surface">+$84.10</span>
              </div>
              <div className="flex justify-between items-center text-[10px] mono border-b border-outline-variant/5 pb-2">
                <span className="text-red-400 font-bold uppercase">ETH/USDC</span>
                <span className="text-on-surface">-$12.20</span>
              </div>
              <div className="text-[10px] text-center pt-1">
                <span className="text-tertiary uppercase font-bold tracking-tighter">Exposure: $32.4K</span>
              </div>
            </div>
          </div>

          <button className="w-full bg-[#fcc010] text-[#3f2e00] py-4 rounded-xl font-black text-sm tracking-[0.2em] uppercase hover:brightness-110 transition-all shadow-lg">
            Execute Trade
          </button>
        </div>

        <div className="mt-auto p-6 border-t border-outline-variant/10 bg-[#101d26]/80 backdrop-blur-sm">
          <div className="space-y-3">
            <a className="flex items-center gap-3 text-[11px] text-on-surface-variant uppercase tracking-wider hover:text-primary transition-colors" href="#">
              <span className="material-symbols-outlined text-[16px]" data-icon="help">help</span> Support
            </a>
            <a className="flex items-center gap-3 text-[11px] text-on-surface-variant uppercase tracking-wider hover:text-primary transition-colors" href="#">
              <span className="material-symbols-outlined text-[16px]" data-icon="code">code</span> API Docs
            </a>
          </div>
        </div>
      </aside>

      <main className="ml-80 mt-16 p-6 h-[calc(100vh-64px)] overflow-y-auto bg-surface">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-surface-container-low p-5 rounded-xl border-b border-primary-container/20">
            <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Total Balance</div>
            <div className="text-3xl font-bold mono text-primary-container">$142,503.22</div>
            <div className="text-[10px] mono text-emerald-400 mt-1">+1.4% VS PREV. SESSION</div>
          </div>
          <div className="bg-surface-container-low p-5 rounded-xl">
            <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">24h PnL</div>
            <div className="text-3xl font-bold mono text-emerald-400">+$4,210.50</div>
            <div className="text-[10px] mono text-on-surface-variant mt-1">REALIZED GAINS</div>
          </div>
          <div className="bg-surface-container-low p-5 rounded-xl">
            <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Win Rate</div>
            <div className="text-3xl font-bold mono text-on-surface">68%</div>
            <div className="flex gap-1 mt-2">
              <div className="h-1 flex-1 bg-emerald-500 rounded-full"></div>
              <div className="h-1 flex-1 bg-emerald-500 rounded-full"></div>
              <div className="h-1 flex-1 bg-emerald-500 rounded-full"></div>
              <div className="h-1 flex-1 bg-surface-variant rounded-full"></div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6 mb-6">
          <div className="col-span-12 xl:col-span-9 bg-surface-container p-6 rounded-xl relative overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold mono tracking-tight text-on-surface">XLM/USDC</h2>
                <span className="text-emerald-400 mono text-base font-bold">0.12482 (+2.41%)</span>
              </div>
              <div className="flex bg-surface-container-lowest p-1 rounded-lg gap-1 border border-outline-variant/10">
                <button className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest bg-surface-variant text-primary-container rounded">1m</button>
                <button className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant hover:text-on-surface">15m</button>
                <button className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant hover:text-on-surface">1h</button>
                <button className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant hover:text-on-surface">4h</button>
                <button className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant hover:text-on-surface">1d</button>
              </div>
            </div>

            <div className="h-[450px] w-full relative group bg-surface-container-lowest/30 rounded-lg">
              <img alt="Financial chart" className="w-full h-full object-cover rounded opacity-40 mix-blend-luminosity grayscale invert" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAQIEuJIzwBmAY5UmNhOBnkAcLX0tUI4UHELv7ixlfxZJwUObd9KsjPsLdCqk4EdZeJCqNc2qO6amBDCuum5eBp_dV62jZOZpnNT39W34SnTa-FOeNtJ0XeAcv3yCS6xLmgPvdRMzFsaaBh36p5rzaLh505GCbdOtXLIin4rt0F8i8PTOD8z5CBuzLRmXjkB3OfHdv_jA1_i5NyfDZP3BBF3uLNfoljKfJ1p4oLOtGZhyzC9eEvc59O-aMU-Mkug5dhNSUlgCAgjXA" />
              <div className="absolute inset-0 p-4">
                <div className="flex items-end h-full gap-1.5 opacity-20">
                  <div className="w-3 bg-emerald-500" style={{ height: '40%' }}></div>
                  <div className="w-3 bg-emerald-500" style={{ height: '45%' }}></div>
                  <div className="w-3 bg-red-500" style={{ height: '38%' }}></div>
                  <div className="w-3 bg-emerald-500" style={{ height: '50%' }}></div>
                  <div className="w-3 bg-emerald-500" style={{ height: '62%' }}></div>
                  <div className="w-3 bg-red-500" style={{ height: '55%' }}></div>
                  <div className="w-3 bg-emerald-500" style={{ height: '70%' }}></div>
                  <div className="w-3 bg-emerald-500" style={{ height: '75%' }}></div>
                  <div className="w-3 bg-red-500" style={{ height: '60%' }}></div>
                  <div className="w-3 bg-emerald-500" style={{ height: '85%' }}></div>
                  <div className="w-3 bg-red-500" style={{ height: '72%' }}></div>
                  <div className="w-3 bg-emerald-500" style={{ height: '88%' }}></div>
                </div>
              </div>
              <div className="absolute right-0 top-0 h-full w-20 border-l border-outline-variant/10 flex flex-col justify-between py-6 text-[10px] mono text-on-surface-variant bg-surface-container/50 backdrop-blur-sm">
                <span>0.1320</span>
                <span>0.1280</span>
                <span className="text-emerald-400 bg-emerald-400/10 px-1 border-y border-emerald-400/20">0.1248</span>
                <span>0.1200</span>
                <span>0.1160</span>
                <span>0.1120</span>
              </div>
            </div>
          </div>

          <div className="col-span-12 xl:col-span-3">
            <div className="bg-surface-container p-6 rounded-xl h-full border border-outline-variant/5">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-8 block">Asset Allocation</span>
              <div className="relative w-40 h-40 mx-auto mb-10">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="80" cy="80" fill="transparent" r="65" stroke="#1f2c34" strokeWidth="14"></circle>
                  <circle cx="80" cy="80" fill="transparent" r="65" stroke="#fcc010" strokeDasharray="408" strokeDashoffset="155" strokeWidth="14"></circle>
                  <circle cx="80" cy="80" fill="transparent" r="65" stroke="#0fd9fc" strokeDasharray="408" strokeDashoffset="340" strokeWidth="14"></circle>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <span className="text-[11px] text-on-surface-variant font-bold uppercase tracking-widest">XLM</span>
                  <span className="text-xl font-bold mono">62%</span>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-sm bg-primary-container"></div>
                    <span className="uppercase tracking-widest font-bold">XLM</span>
                  </div>
                  <span className="mono">62%</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-sm bg-tertiary-container"></div>
                    <span className="uppercase tracking-widest font-bold">USDC</span>
                  </div>
                  <span className="mono">28%</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-sm bg-surface-variant"></div>
                    <span className="uppercase tracking-widest font-bold">ETH</span>
                  </div>
                  <span className="mono">10%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-surface-container rounded-xl overflow-hidden mb-8 border border-outline-variant/10">
          <div className="px-6 py-5 border-b border-outline-variant/10 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-on-surface-variant" data-icon="receipt_long">receipt_long</span>
              <h3 className="text-[11px] font-bold text-on-surface-variant uppercase tracking-[0.2em]">Transaction Ledger</h3>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2 text-[10px] font-bold text-on-surface-variant cursor-pointer hover:text-primary transition-colors border border-outline-variant/20 px-3 py-1.5 rounded-lg">
                <span className="material-symbols-outlined text-[14px]" data-icon="download">download</span> EXPORT CSV
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-lowest/50 text-[10px] text-on-surface-variant uppercase font-bold tracking-widest">
                  <th className="px-6 py-4">Time</th>
                  <th className="px-6 py-4">Pair</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4 text-right">Price</th>
                  <th className="px-6 py-4 text-right">Amount</th>
                  <th className="px-6 py-4 text-right">PnL</th>
                  <th className="px-6 py-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/5">
                <tr className="hover:bg-surface-bright transition-colors cursor-default">
                  <td className="px-6 py-5 mono text-[11px]">14:22:45</td>
                  <td className="px-6 py-5 text-xs font-bold">XLM/USDC</td>
                  <td className="px-6 py-5"><span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded uppercase">Buy</span></td>
                  <td className="px-6 py-5 mono text-xs text-right font-medium">0.12421</td>
                  <td className="px-6 py-5 mono text-xs text-right font-medium">45,000.00</td>
                  <td className="px-6 py-5 mono text-xs text-right text-emerald-400 font-bold">+$142.20</td>
                  <td className="px-6 py-5 text-right">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant px-2 py-1 bg-surface-container-highest rounded">Completed</span>
                  </td>
                </tr>
                <tr className="hover:bg-surface-bright transition-colors cursor-default">
                  <td className="px-6 py-5 mono text-[11px]">13:10:02</td>
                  <td className="px-6 py-5 text-xs font-bold">XLM/USDC</td>
                  <td className="px-6 py-5"><span className="px-2 py-1 bg-red-500/10 text-red-400 text-[10px] font-bold rounded uppercase">Sell</span></td>
                  <td className="px-6 py-5 mono text-xs text-right font-medium">0.12350</td>
                  <td className="px-6 py-5 mono text-xs text-right font-medium">12,500.00</td>
                  <td className="px-6 py-5 mono text-xs text-right text-red-400 font-bold">-$24.15</td>
                  <td className="px-6 py-5 text-right">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant px-2 py-1 bg-surface-container-highest rounded">Filled</span>
                  </td>
                </tr>
                <tr className="hover:bg-surface-bright transition-colors cursor-default">
                  <td className="px-6 py-5 mono text-[11px]">12:45:19</td>
                  <td className="px-6 py-5 text-xs font-bold">XLM/USDC</td>
                  <td className="px-6 py-5"><span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded uppercase">Buy</span></td>
                  <td className="px-6 py-5 mono text-xs text-right font-medium">0.12280</td>
                  <td className="px-6 py-5 mono text-xs text-right font-medium">100,000.00</td>
                  <td className="px-6 py-5 mono text-xs text-right text-emerald-400 font-bold">+$890.44</td>
                  <td className="px-6 py-5 text-right">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant px-2 py-1 bg-surface-container-highest rounded">Completed</span>
                  </td>
                </tr>
                <tr className="hover:bg-surface-bright transition-colors cursor-default">
                  <td className="px-6 py-5 mono text-[11px]">10:05:33</td>
                  <td className="px-6 py-5 text-xs font-bold">XLM/USDC</td>
                  <td className="px-6 py-5"><span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded uppercase">Buy</span></td>
                  <td className="px-6 py-5 mono text-xs text-right font-medium">0.12110</td>
                  <td className="px-6 py-5 mono text-xs text-right font-medium">5,000.00</td>
                  <td className="px-6 py-5 mono text-xs text-right text-emerald-400 font-bold">+$12.10</td>
                  <td className="px-6 py-5 text-right">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant px-2 py-1 bg-surface-container-highest rounded">Completed</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
}

export default NewDashboard;
