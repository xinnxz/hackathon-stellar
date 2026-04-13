import { Link } from "react-router-dom";
import { Rocket } from "lucide-react";

import {
  HeroText,
  CoreMetrics,
  RiskManagement,
  DEXConnector,
  ProfitTracker,
  ConfluenceAnalytics,
  TradeScheduler
} from "./components";

const LandingPage = () => {

  return (
    <div className="relative w-full min-h-screen bg-[#000911] overflow-x-hidden">

      <img
        src="/images/landing/Light.png"
        alt="Light"
        className="absolute left-[-28px] top-0 w-[1976px] h-[1379px] opacity-90 pointer-events-none z-[1]"
        style={{ objectFit: 'cover' }}
      />

      <img
        src="/images/landing/Stars.png"
        alt="Stars"
        className="absolute left-[-28px] top-0 w-[1976px] h-[1379px] opacity-70 pointer-events-none z-[1]"
        style={{ objectFit: 'cover' }}
      />

      <div className="relative z-[2]">
        <section className="relative w-full flex flex-col items-center pt-40">
          <HeroText />
          <video src="/images/landing/earth.mp4" autoPlay loop muted playsInline className="w-[500px] h-[500px]" style={{ marginTop: '100px', mixBlendMode: 'screen', maskImage: 'radial-gradient(circle, black 40%, transparent 70%)', WebkitMaskImage: 'radial-gradient(circle, black 40%, transparent 70%)' }} />
        </section>

        <section className="relative w-full py-32">
          <div className="relative z-10 max-w-[1174px] mx-auto px-4 text-center mb-20">
            <h2 className="text-white text-center font-serif text-[72px] font-normal leading-normal italic mb-5">
              <span className="font-sans text-[40px] md:text-[64px] not-italic">Autonomous </span>
              <span className="instrument-serif-font text-[72px] italic tracking-[-4px]"> Stellar Trading</span>
            </h2>

            <p className="text-[#A9A9A9] text-center text-[19px] font-light leading-[25px] tracking-[-0.19px]">
              A suite of intelligent agents designed specifically for high-frequency trading and market analytics on the Stellar network.
            </p>

            <img
              src="/images/landing/Light1.png"
              alt="Light1"
              className="absolute right-[130px] top-0 w-[852px] h-[2049px] opacity-60 pointer-events-none"
              style={{ objectFit: 'cover' }}
            />

          </div>

          {/* Cards Grid - Responsive Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 justify-center items-start max-w-[485px] lg:max-w-7xl mx-auto px-4">
            {/* Mobile: All cards in separate rows */}
            <div className="lg:hidden space-y-6">
              <div className="w-full">
                <CoreMetrics />
              </div>
              <div className="w-full">
                <RiskManagement />
              </div>
              <div className="w-full">
                <DEXConnector />
              </div>
              <div className="w-full">
                <ProfitTracker />
              </div>
              <div className="w-full">
                <ConfluenceAnalytics />
              </div>
              <div className="w-full">
                <TradeScheduler />
              </div>
            </div>

            {/* Desktop: Original 2-column layout */}
            <div className="hidden lg:contents">
              {/* First column - Core Metrics and P&L Tracker */}
              <div className="space-y-8">
                <CoreMetrics />
                <ProfitTracker />
              </div>

              {/* Second column - Risk Management, DEX Connector, and bottom row */}
              <div className="space-y-8">
                <RiskManagement />
                <DEXConnector />
                <div className="grid grid-cols-2 gap-4">
                  <ConfluenceAnalytics />
                  <TradeScheduler />
                </div>
              </div>
            </div>
          </div>

        </section>

        <section className="relative w-full">
          {/* Map image */}
          <div className="w-full max-w-5xl mx-auto px-4 mb-1 pt-32">

            <h2 className="text-white text-center font-serif text-[72px] font-normal leading-normal italic mb-5">
              <span className="font-sans text-[64px] not-italic">Global Presence </span>
            </h2>

            <div className="w-[250px] mx-auto h-[100px] mb-8 relative overflow-hidden rounded-xl shadow-md">
              <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-[#000911] to-transparent z-10 pointer-events-none"></div>
              <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[#000911] to-transparent z-10 pointer-events-none"></div>
              <div className="flex w-[200%] animate-marquee h-full">
                <div className="flex-shrink-0 w-1/2 h-full">
                  <img
                    src="/images/landing/flags.png"
                    alt="Flags"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex-shrink-0 w-1/2 h-full ml-8">
                  <img
                    src="/images/landing/flags.png"
                    alt="Flags"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            </div>

            <img
              src="/images/landing/map.png"
              alt="Earth"
              className="w-full h-auto object-contain rounded-xl shadow-md transition duration-500 mt-12"
            />
          </div>
        </section>

        {/* CTA Section */}
        <section className="relative w-full py-20 mt-20">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
              {/* Left Side - Tag and Title */}
              <div className="space-y-8">
                <div className="inline-block bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 w-fit">
                  <Rocket className="text-white w-4 h-4" />
                  Command Center
                </div>

                <h2 className="text-6xl font-bold text-white leading-tight" style={{ fontSize: '2.5rem' }}>
                  <span className="block">Ready to</span>
                  <span className="block">Take</span>
                  <span className="block">Control?</span>
                </h2>
              </div>

              {/* Right Side - CTA */}
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-12 shadow-2xl flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(0,255,136,0.5)]">
                  <Rocket className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-3xl font-bold text-white mb-4">Initialize Agent Protocols</h3>
                <p className="text-gray-300 mb-8 max-w-md">
                  Deploy the StellarTradeAgent into the live market. Monitor real-time analytics, adjust risk parameters, and watch autonomous profits compound.
                </p>
                <Link to="/app" className="cta w-full text-center justify-center items-center flex gap-3 text-lg font-bold">
                  <Rocket size={20} />
                  Launch Command Center
                </Link>
              </div>
            </div>
          </div>
        </section>


        <footer className="relative w-full pt-16 pb-8 bg-[#000911] border-t border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
              {/* Company Info */}
              <div className="space-y-6 lg:col-span-1">
                <div className="flex items-center gap-2">
                  <Rocket className="w-8 h-8 text-green-400" />
                  <span className="text-white text-xl font-bold">StellarTradeAgent</span>
                </div>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Autonomous AI trading agent built on the Stellar network with x402 micropayments.
                </p>
              </div>

              {/* Product Links */}
              <div>
                <h3 className="text-white font-semibold text-lg mb-6">Product</h3>
                <ul className="space-y-4">
                  <li><Link to="/app" className="text-gray-400 hover:text-white transition-colors text-sm">Trading Terminal</Link></li>
                  <li><a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">Documentation</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">API Reference</a></li>
                </ul>
              </div>

              {/* Resources */}
              <div>
                <h3 className="text-white font-semibold text-lg mb-6">Resources</h3>
                <ul className="space-y-4">
                  <li><a href="https://stellar.org" className="text-gray-400 hover:text-white transition-colors text-sm">Stellar Network</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">SDEX Explorer</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">Testnet Faucet</a></li>
                </ul>
              </div>

              {/* Community */}
              <div>
                <h3 className="text-white font-semibold text-lg mb-6">Community</h3>
                <div className="flex gap-4">
                  <a href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-gray-700 transition-colors text-gray-400 hover:text-white text-sm">X</a>
                  <a href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-gray-700 transition-colors text-gray-400 hover:text-white text-sm">GH</a>
                  <a href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-gray-700 transition-colors text-gray-400 hover:text-white text-sm">DC</a>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-800 pt-8">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <p className="text-gray-500 text-sm text-center md:text-left">
                  © 2025 StellarTradeAgent. Built for the Stellar x402 Hackathon.
                </p>
                <p className="text-gray-600 text-xs text-center md:text-right max-w-md">
                  Disclaimer: This is a testnet demonstration. No real funds are at risk.
                </p>
              </div>
            </div>
          </div>
        </footer>
      </div>

      
    </div>
  );
};

export default LandingPage;

