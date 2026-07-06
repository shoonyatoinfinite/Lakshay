import React, { useState, useEffect } from 'react';
import { useWindowManager } from '../../context/WindowManagerContext';
import type { ThemeType } from '../../context/WindowManagerContext';
import { AmbientSynth } from './AmbientSynth';
import { MusicPlayer } from './MusicPlayer';
import { sounds } from '../../utils/sounds';

interface MenuBarProps {
  onToggleNotifications: () => void;
}

export const MenuBar: React.FC<MenuBarProps> = ({ onToggleNotifications }) => {
  const { theme, setTheme, resetLayout } = useWindowManager();
  const [time, setTime] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [audioTab, setAudioTab] = useState<'ambient' | 'local'>('ambient');

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setDateStr(now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }));
    };
    
    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const toggleSettings = () => setShowSettings(!showSettings);

  return (
    <div className="menu-bar">
      <div className="menu-bar-left">
        <div className="menu-bar-item" style={{ fontWeight: 'bold', fontFamily: 'var(--font-heading)' }} onClick={resetLayout}>
          🎯 Lakshya
        </div>
        <div className="menu-bar-item" onClick={toggleSettings}>
          ⚡ Control Center
        </div>
      </div>
      
      <div className="menu-bar-right">
        <div className="menu-bar-item" onClick={onToggleNotifications} title="Toggle Alerts Panel (Ctrl + N)" style={{ cursor: 'pointer' }}>
          🔔 Alerts
        </div>
        <div className="menu-bar-item" title={isOnline ? "Connected to Internet" : "Disconnected / Offline Mode"}>
          {isOnline ? '🟢 Online' : '🔴 Offline'}
        </div>
        <div className="menu-bar-item" style={{ fontFamily: 'var(--font-mono)' }}>
          {dateStr} | {time}
        </div>
      </div>

      {showSettings && (
        <div 
          className="glass-panel control-center-popup" 
          style={{
            position: 'absolute',
            top: '45px',
            left: '20px',
            width: '280px',
            zIndex: 10000,
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}
        >
          <h4 style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px' }}>Control Center</h4>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>System Theme</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
              {(['neo-dark', 'cyberpunk', 'academic-sepia', 'minimal-light'] as ThemeType[]).map((t) => (
                <button
                  key={t}
                  className="btn"
                  style={{
                    padding: '6px',
                    fontSize: '11px',
                    backgroundColor: theme === t ? 'rgba(var(--accent-color-rgb), 0.2)' : 'transparent',
                    borderColor: theme === t ? 'var(--accent-color)' : 'var(--glass-border)'
                  }}
                  onClick={() => setTheme(t)}
                >
                  {t.replace('-', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Audio tabs selector */}
          <div style={{ display: 'flex', gap: '6px', background: 'rgba(0,0,0,0.2)', padding: '2px', borderRadius: '6px', margin: '4px 0' }}>
            <button 
              className="btn" 
              style={{
                flex: 1,
                padding: '4px',
                fontSize: '11px',
                border: 'none',
                background: audioTab === 'ambient' ? 'rgba(var(--accent-color-rgb), 0.15)' : 'transparent',
                color: audioTab === 'ambient' ? 'var(--accent-color)' : 'var(--text-secondary)'
              }}
              onClick={() => { setAudioTab('ambient'); sounds.playClick(); }}
            >
              🌊 Ambient
            </button>
            <button 
              className="btn" 
              style={{
                flex: 1,
                padding: '4px',
                fontSize: '11px',
                border: 'none',
                background: audioTab === 'local' ? 'rgba(var(--accent-color-rgb), 0.15)' : 'transparent',
                color: audioTab === 'local' ? 'var(--accent-color)' : 'var(--text-secondary)'
              }}
              onClick={() => { setAudioTab('local'); sounds.playClick(); }}
            >
              🎵 Media Player
            </button>
          </div>

          {audioTab === 'ambient' ? <AmbientSynth /> : <MusicPlayer />}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Quick Operations</span>
            <button className="btn btn-primary" style={{ width: '100%', fontSize: '12px' }} onClick={resetLayout}>
              Reset Window Layout
            </button>
          </div>

          <button 
            className="btn" 
            style={{ marginTop: '4px', alignSelf: 'flex-end', fontSize: '11px' }} 
            onClick={() => setShowSettings(false)}
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
};
