import React, { useState, useEffect } from 'react';
import { useWindowManager } from '../../context/WindowManagerContext';
import { db } from '../../db/db';

interface WidgetConfig {
  id: string;
  title: string;
  icon: string;
  visible: boolean;
}

export const DesktopWidgets: React.FC = () => {
  const { 
    openWindow,
    pomodoroTime,
    setPomodoroTime,
    pomodoroRunning,
    setPomodoroRunning,
    pomodoroMode,
    pomodoroStudyDuration,
    pomodoroShortBreakDuration,
    pomodoroLongBreakDuration
  } = useWindowManager();
  
  // Widget customization config
  const [widgets, setWidgets] = useState<WidgetConfig[]>(() => {
    const saved = localStorage.getItem('lakshya_widgets_config');
    return saved ? JSON.parse(saved) : [
      { id: 'overview', title: 'Daily Overview', icon: '📅', visible: true },
      { id: 'streaks', title: 'Study Streak', icon: '🔥', visible: true },
      { id: 'pomodoro', title: 'Quick Timer', icon: '🍅', visible: true },
      { id: 'sticky', title: 'Sticky Scratchpad', icon: '📌', visible: true }
    ];
  });

  const [stickyText, setStickyText] = useState<string>(() => {
    return localStorage.getItem('lakshya_sticky_scratchpad') || 'Type quick notes here... Stays saved on desktop!';
  });

  // DB stats
  const [dbStats, setDbStats] = useState({ notesCount: 0, diagramsCount: 0, totalSizeKB: 0 });
  // Streaks count
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    localStorage.setItem('lakshya_widgets_config', JSON.stringify(widgets));
  }, [widgets]);

  useEffect(() => {
    localStorage.setItem('lakshya_sticky_scratchpad', stickyText);
  }, [stickyText]);

  // Load stats periodically
  useEffect(() => {
    const loadStats = async () => {
      try {
        const notes = await db.getAll('notes');
        const diagrams = await db.getAll('diagrams');
        const habits = await db.getAll('habits');
        
        // Calculate streak
        let maxStreak = 0;
        habits.forEach(h => {
          if (h.streak > maxStreak) maxStreak = h.streak;
        });
        setStreak(maxStreak);

        // Estimate size
        const jsonStr = JSON.stringify(notes) + JSON.stringify(diagrams);
        const sizeBytes = new Blob([jsonStr]).size;
        const sizeKB = Math.round((sizeBytes / 1024) * 100) / 100;

        setDbStats({
          notesCount: notes.length,
          diagramsCount: diagrams.length,
          totalSizeKB: sizeKB
        });
      } catch (err) {
        console.error('Failed to load stats', err);
      }
    };
    loadStats();
    const int = setInterval(loadStats, 10000);
    return () => clearInterval(int);
  }, []);



  useEffect(() => {
    const handleUpdate = () => {
      const saved = localStorage.getItem('lakshya_widgets_config');
      if (saved) setWidgets(JSON.parse(saved));
    };
    window.addEventListener('lakshya_widgets_updated', handleUpdate);
    return () => window.removeEventListener('lakshya_widgets_updated', handleUpdate);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px', overflowY: 'auto', paddingRight: '10px' }}>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
        
        {/* WIDGET 1: Overview */}
        {widgets.find(w => w.id === 'overview')?.visible && (
          <div className="glass-panel widget-card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ fontSize: '14px', color: 'var(--accent-color)' }}>📅 Daily Overview</h4>
            </div>
            <p style={{ fontSize: '20px', fontWeight: 'bold', fontFamily: 'var(--font-heading)' }}>
              Semester Study Hub
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: 'var(--text-secondary)' }}>
              <span>Notes Stored: <strong>{dbStats.notesCount}</strong></span>
              <span>Diagrams Created: <strong>{dbStats.diagramsCount}</strong></span>
            </div>
          </div>
        )}

        {/* WIDGET 2: Streaks */}
        {widgets.find(w => w.id === 'streaks')?.visible && (
          <div className="glass-panel widget-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h4 style={{ fontSize: '14px', color: '#ff7a00' }}>🔥 Study Streak</h4>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '32px', fontWeight: 800, color: '#ff7a00' }}>{streak}</span>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>days consistent</span>
            </div>
            <p style={{ fontSize: '11px', fontStyle: 'italic', color: 'var(--text-muted)' }}>
              "Lakshya is not just a destination; it's a daily habit."
            </p>
          </div>
        )}



        {/* WIDGET 4: Quick Pomodoro Timer */}
        {widgets.find(w => w.id === 'pomodoro')?.visible && (
          <div className="glass-panel widget-card" style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}>
              <h4 style={{ fontSize: '14px', color: '#ef4444' }}>🍅 Study Timer ({pomodoroMode === 'study' ? 'Study' : 'Break'})</h4>
              <span 
                style={{ cursor: 'pointer', fontSize: '11px', color: 'var(--accent-color)' }}
                onClick={() => openWindow('pomodoro')}
              >
                Maximize
              </span>
            </div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', fontFamily: 'var(--font-mono)', margin: '4px 0', letterSpacing: '1px' }}>
              {formatTime(pomodoroTime)}
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button 
                className="btn btn-primary" 
                style={{ padding: '4px 10px', fontSize: '11px' }}
                onClick={() => setPomodoroRunning(!pomodoroRunning)}
              >
                {pomodoroRunning ? 'Pause' : 'Start'}
              </button>
              <button 
                className="btn" 
                style={{ padding: '4px 10px', fontSize: '11px' }}
                onClick={() => {
                  setPomodoroRunning(false);
                  if (pomodoroMode === 'study') setPomodoroTime(pomodoroStudyDuration * 60);
                  else if (pomodoroMode === 'shortBreak') setPomodoroTime(pomodoroShortBreakDuration * 60);
                  else setPomodoroTime(pomodoroLongBreakDuration * 60);
                }}
              >
                Reset
              </button>
            </div>
          </div>
        )}

        {/* WIDGET 5: Sticky Scratchpad */}
        {widgets.find(w => w.id === 'sticky')?.visible && (
          <div 
            className="glass-panel widget-card" 
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '6px', 
              gridColumn: 'span 2',
              background: 'rgba(255, 235, 150, 0.08)',
              borderColor: 'rgba(255, 235, 150, 0.2)'
            }}
          >
            <h4 style={{ fontSize: '14px', color: '#ffd56b' }}>📌 Desktop Scratchpad</h4>
            <textarea
              style={{
                background: 'transparent',
                border: 'none',
                resize: 'none',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-sans)',
                fontSize: '12px',
                height: '60px',
                lineHeight: '1.4'
              }}
              value={stickyText}
              onChange={(e) => setStickyText(e.target.value)}
            />
          </div>
        )}

      </div>
    </div>
  );
};
