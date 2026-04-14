import React from 'react';

function NewDashboard() {
  return (
    <iframe
      src="/stitch-stellar-trade/code.html/code.html"
      style={{
        width: '100vw',
        height: '100vh',
        border: 'none',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 9999,
        backgroundColor: '#0b141a'
      }}
      title="StellarTradeAgent Dashboard"
    />
  );
}

export default NewDashboard;
