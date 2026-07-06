import React, { useState, useEffect } from 'react';
import { sounds } from '../../utils/sounds';

interface LockScreenProps {
  onUnlock: () => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({ onUnlock }) => {
  const [time, setTime] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [scholarName, setScholarName] = useState(() => {
    return localStorage.getItem('lakshya_scholar_name') || 'Guest Scholar';
  });
  const [pin, setPin] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  
  const savedPin = localStorage.getItem('lakshya_pin_code') || '';

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setDateStr(now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (savedPin && pin !== savedPin) {
      sounds.playError();
      alert('Incorrect PIN. Please try again.');
      setPin('');
      return;
    }

    localStorage.setItem('lakshya_scholar_name', scholarName);
    sounds.playUnlock();
    
    // Start exit transition
    setIsUnlocked(true);
    setTimeout(() => {
      onUnlock();
    }, 450); // wait for slideUp transition
  };

  return (
    <div 
      className={`lockscreen-container ${isUnlocked ? 'slide-up-exit' : ''}`}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'radial-gradient(circle at center, #1b1e2a 0%, #0d0f14 100%)',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        transition: 'transform 0.5s cubic-bezier(0.85, 0, 0.15, 1)'
      }}
    >
      {/* Ambient Floating Particles (CSS only) */}
      <div className="lockscreen-glow" />

      {/* Clock Area */}
      <div style={{ textAlign: 'center', marginBottom: '40px', zIndex: 10 }}>
        <h1 style={{ fontSize: '80px', fontWeight: 800, fontFamily: 'var(--font-heading)', letterSpacing: '-2px', margin: 0, textShadow: '0 8px 30px rgba(0,0,0,0.5)' }}>
          {time}
        </h1>
        <p style={{ fontSize: '18px', color: 'var(--text-secondary)', marginTop: '8px' }}>
          {dateStr}
        </p>
      </div>

      {/* Login Card */}
      <form 
        onSubmit={handleUnlock}
        className="glass-panel"
        style={{
          width: '320px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
          zIndex: 10
        }}
      >
        <div 
          style={{
            width: '70px',
            height: '70px',
            borderRadius: '50%',
            background: 'var(--accent-gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '32px',
            boxShadow: 'var(--accent-glow)'
          }}
        >
          🎓
        </div>

        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Scholar Profile Name</label>
          <input
            type="text"
            className="input-field"
            value={scholarName}
            onChange={(e) => setScholarName(e.target.value)}
            style={{ textAlign: 'center', fontWeight: 'bold' }}
            required
            placeholder="Your Name"
          />
        </div>

        {savedPin && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Enter System PIN</label>
            <input
              type="password"
              className="input-field"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', letterSpacing: '4px' }}
              maxLength={6}
              required
              placeholder="••••"
            />
          </div>
        )}

        <button 
          type="submit" 
          className="btn btn-primary"
          style={{ width: '100%', padding: '10px 0', marginTop: '6px' }}
        >
          Unlock System
        </button>
      </form>
    </div>
  );
};
