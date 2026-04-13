import React from 'react';
import { useNavigate } from "react-router-dom";
import './FeatureCards.css';

const ProfitTracker = () => {
  const navigate = useNavigate();

  return (
    <div
      className="feature-card group transition-transform duration-200 ease-out transform hover:-translate-y-1 hover:shadow-2xl focus-within:-translate-y-1"
      style={{
        backgroundImage: 'url(/images/landing/frame4.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      <div className="feature-card-header">
        <h3 className="feature-card-title">P&L Tracking & Budget Intelligence</h3>
      </div>

      <div className="feature-card-footer">
        <p className="feature-card-description">
          AI tracks trading profits, manages budget allocation, and supports long-term portfolio growth.
        </p>
      </div>

      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[14px] flex items-center justify-center z-20 backdrop-blur-sm">
        <button className="cta" onClick={() => navigate('/app')}>
          <div className="learn-more">Learn More</div>
        </button>
      </div>
    </div>
  );
};

export default ProfitTracker;
