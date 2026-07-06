import React, { useState, useEffect } from 'react';
import { db } from '../../db/db';
import { useWindowManager } from '../../context/WindowManagerContext';
import { sounds } from '../../utils/sounds';

interface PomodoroLog {
  id: string;
  taskName: string;
  duration: number; // minutes
  timestamp: number;
}

export const Pomodoro: React.FC = () => {
  const {
    pomodoroTime,
    setPomodoroTime,
    pomodoroRunning,
    setPomodoroRunning,
    pomodoroMode,
    setPomodoroMode,
    pomodoroStudyDuration,
    setPomodoroStudyDuration,
    pomodoroShortBreakDuration,
    setPomodoroShortBreakDuration,
    pomodoroLongBreakDuration,
    setPomodoroLongBreakDuration,
    pomodoroTaskName,
    setPomodoroTaskName
  } = useWindowManager();

  const [sessionLogs, setSessionLogs] = useState<PomodoroLog[]>([]);

  const loadLogs = async () => {
    try {
      const logs = await db.getAll('pomodoro');
      setSessionLogs(logs.sort((a, b) => b.timestamp - a.timestamp));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadLogs();
    window.addEventListener('lakshya_pomodoro_logged', loadLogs);
    return () => window.removeEventListener('lakshya_pomodoro_logged', loadLogs);
  }, []);

  const handleClearLogs = async () => {
    if (!confirm('Clear session history?')) return;
    try {
      await db.clear('pomodoro');
      setSessionLogs([]);
      sounds.playClick();
    } catch (e) {
      console.error(e);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="module-container">
      <div className="module-header">
        <div>
          <h2 style={{ fontSize: '18px' }}>🍅 Pomodoro Focus Timer</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Maximize concentration using structured study intervals.</p>
        </div>
      </div>

      <div className="module-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', overflowY: 'auto' }}>
        
        {/* Timer UI Card */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '30px' }}>
          
          {/* Mode Selector Tabs */}
          <div style={{ display: 'flex', gap: '8px', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '8px' }}>
            <button 
              className="btn" 
              style={{ padding: '6px 12px', fontSize: '12px', border: 'none', background: pomodoroMode === 'study' ? 'rgba(var(--accent-color-rgb), 0.2)' : 'transparent' }}
              onClick={() => { setPomodoroRunning(false); setPomodoroMode('study'); sounds.playClick(); }}
            >
              🍅 Study Session
            </button>
            <button 
              className="btn" 
              style={{ padding: '6px 12px', fontSize: '12px', border: 'none', background: pomodoroMode === 'shortBreak' ? 'rgba(var(--accent-color-rgb), 0.2)' : 'transparent' }}
              onClick={() => { setPomodoroRunning(false); setPomodoroMode('shortBreak'); sounds.playClick(); }}
            >
              ☕ Short Break
            </button>
            <button 
              className="btn" 
              style={{ padding: '6px 12px', fontSize: '12px', border: 'none', background: pomodoroMode === 'longBreak' ? 'rgba(var(--accent-color-rgb), 0.2)' : 'transparent' }}
              onClick={() => { setPomodoroRunning(false); setPomodoroMode('longBreak'); sounds.playClick(); }}
            >
              🌴 Long Break
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%', maxWidth: '280px', marginTop: '10px' }}>
            <input
              type="text"
              className="input-field"
              placeholder="What are you focusing on?"
              value={pomodoroTaskName}
              onChange={(e) => setPomodoroTaskName(e.target.value)}
              disabled={pomodoroRunning}
              style={{ textAlign: 'center', fontSize: '13px' }}
            />
          </div>

          {/* Time digits */}
          <div style={{ fontSize: '64px', fontWeight: 800, fontFamily: 'var(--font-mono)', letterSpacing: '2px', color: pomodoroMode === 'study' ? '#ef4444' : 'var(--success)', textShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
            {formatTime(pomodoroTime)}
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              className="btn btn-primary" 
              style={{ padding: '10px 24px', fontSize: '15px' }}
              onClick={() => { setPomodoroRunning(!pomodoroRunning); sounds.playClick(); }}
            >
              {pomodoroRunning ? 'Pause' : 'Start'}
            </button>
            <button 
              className="btn" 
              style={{ padding: '10px 20px', fontSize: '15px' }}
              onClick={() => {
                setPomodoroRunning(false);
                if (pomodoroMode === 'study') setPomodoroTime(pomodoroStudyDuration * 60);
                else if (pomodoroMode === 'shortBreak') setPomodoroTime(pomodoroShortBreakDuration * 60);
                else setPomodoroTime(pomodoroLongBreakDuration * 60);
                sounds.playClick();
              }}
            >
              Reset
            </button>
          </div>
        </div>

        {/* Configuration Panel */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ fontSize: '15px', color: 'var(--accent-color)' }}>⚙️ Interval Configuration</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Study Session (mins):</span>
              <input
                type="number"
                className="input-field"
                style={{ width: '70px', padding: '6px' }}
                value={pomodoroStudyDuration}
                onChange={(e) => setPomodoroStudyDuration(Math.max(1, parseInt(e.target.value) || 25))}
                disabled={pomodoroRunning}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Short Break (mins):</span>
              <input
                type="number"
                className="input-field"
                style={{ width: '70px', padding: '6px' }}
                value={pomodoroShortBreakDuration}
                onChange={(e) => setPomodoroShortBreakDuration(Math.max(1, parseInt(e.target.value) || 5))}
                disabled={pomodoroRunning}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Long Break (mins):</span>
              <input
                type="number"
                className="input-field"
                style={{ width: '70px', padding: '6px' }}
                value={pomodoroLongBreakDuration}
                onChange={(e) => setPomodoroLongBreakDuration(Math.max(1, parseInt(e.target.value) || 15))}
                disabled={pomodoroRunning}
              />
            </div>
          </div>

          <h3 style={{ fontSize: '15px', color: 'var(--accent-color)', borderTop: '1px solid var(--glass-border)', paddingTop: '12px', marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>📜 Focus Log History</span>
            {sessionLogs.length > 0 && (
              <span style={{ fontSize: '10px', color: 'var(--error)', cursor: 'pointer' }} onClick={handleClearLogs}>
                Clear
              </span>
            )}
          </h3>
          
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px' }}>
            {sessionLogs.length === 0 ? (
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No focus sessions logged yet.</p>
            ) : (
              sessionLogs.map(l => (
                <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: '6px', fontSize: '11px' }}>
                  <span>🎯 {l.taskName}</span>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {l.duration} mins • {new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
