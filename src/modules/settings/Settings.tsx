import React, { useState, useEffect } from 'react';
import { useWindowManager } from '../../context/WindowManagerContext';
import type { ThemeType } from '../../context/WindowManagerContext';
import { db } from '../../db/db';
import { sounds } from '../../utils/sounds';

export const Settings: React.FC = () => {
  const { theme, setTheme, wallpaper, setWallpaper } = useWindowManager();

  const [soundsEnabled, setSoundsEnabled] = useState(() => {
    return localStorage.getItem('lakshya_sounds_enabled') !== 'false';
  });

  const toggleSounds = () => {
    const next = !soundsEnabled;
    setSoundsEnabled(next);
    sounds.toggle(next);
    if (next) sounds.playClick();
  };

  const [dbStats, setDbStats] = useState({ notesCount: 0, diagramsCount: 0, totalSizeKB: 0 });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const notes = await db.getAll('notes');
        const diagrams = await db.getAll('diagrams');
        const habits = await db.getAll('habits');
        const assignments = await db.getAll('assignments');
        
        const jsonStr = JSON.stringify(notes) + JSON.stringify(diagrams) + JSON.stringify(habits) + JSON.stringify(assignments);
        const sizeBytes = new Blob([jsonStr]).size;
        const sizeKB = Math.round((sizeBytes / 1024) * 100) / 100;
        
        setDbStats({
          notesCount: notes.length,
          diagramsCount: diagrams.length,
          totalSizeKB: sizeKB
        });
      } catch (err) {
        console.error(err);
      }
    };
    loadStats();
    const interval = setInterval(loadStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const [widgets, setWidgets] = useState<any[]>(() => {
    const saved = localStorage.getItem('lakshya_widgets_config');
    return saved ? JSON.parse(saved) : [
      { id: 'overview', title: 'Daily Overview', icon: '📅', visible: true },
      { id: 'streaks', title: 'Study Streak', icon: '🔥', visible: true },
      { id: 'pomodoro', title: 'Quick Timer', icon: '🍅', visible: true },
      { id: 'sticky', title: 'Sticky Scratchpad', icon: '📌', visible: true }
    ];
  });

  const toggleWidget = (id: string) => {
    const updated = widgets.map(w => w.id === id ? { ...w, visible: !w.visible } : w);
    setWidgets(updated);
    localStorage.setItem('lakshya_widgets_config', JSON.stringify(updated));
    window.dispatchEvent(new Event('lakshya_widgets_updated'));
  };

  const wallpapers = [
    { name: 'Midnight', value: 'linear-gradient(135deg, #12131c 0%, #08090d 100%)' },
    { name: 'Aurora', value: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)' },
    { name: 'Sunset Deep', value: 'linear-gradient(135deg, #3d3b4f 0%, #1a1a24 100%)' },
    { name: 'Sepia Academic', value: 'linear-gradient(180deg, #f4edd8 0%, #dcd3b8 100%)' }
  ];

  const handleExportData = async () => {
    try {
      const backup: { [key: string]: any } = {};
      const stores = [
        'notes', 'timetable', 'events', 'assignments', 'goals', 'habits',
        'pomodoro', 'flashcards', 'flashcard_decks', 'projects', 'diagrams',
        'career_jobs', 'career_resume', 'resources', 'attendance'
      ];

      for (const store of stores) {
        backup[store] = await db.getAll(store as any);
      }

      // Add localstorage items
      backup['_localstorage'] = {
        theme: localStorage.getItem('lakshya_theme'),
        wallpaper: localStorage.getItem('lakshya_wallpaper'),
        widgets: localStorage.getItem('lakshya_widgets_config'),
        sticky: localStorage.getItem('lakshya_sticky_scratchpad')
      };

      const jsonStr = JSON.stringify(backup, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lakshya_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Data compilation failed.');
    }
  };

  const handleImportData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const backup = JSON.parse(event.target?.result as string);
        if (!confirm('Importing this file will overwrite all your current local data. Proceed?')) return;

        const stores = [
          'notes', 'timetable', 'events', 'assignments', 'goals', 'habits',
          'pomodoro', 'flashcards', 'flashcard_decks', 'projects', 'diagrams',
          'career_jobs', 'career_resume', 'resources', 'attendance'
        ];

        // Clear and write new
        for (const store of stores) {
          if (backup[store]) {
            await db.clear(store as any);
            for (const item of backup[store]) {
              await db.put(store as any, item);
            }
          }
        }

        // Restore localstorage configurations
        if (backup['_localstorage']) {
          const ls = backup['_localstorage'];
          if (ls.theme) localStorage.setItem('lakshya_theme', ls.theme);
          if (ls.wallpaper) localStorage.setItem('lakshya_wallpaper', ls.wallpaper);
          if (ls.widgets) localStorage.setItem('lakshya_widgets_config', ls.widgets);
          if (ls.sticky) localStorage.setItem('lakshya_sticky_scratchpad', ls.sticky);
        }

        alert('Backup database imported successfully! Reloading Lakshya...');
        window.location.reload();
      } catch (err) {
        console.error(err);
        alert('Invalid backup file formatting.');
      }
    };
    reader.readAsText(file);
  };

  const handleWipeDatabase = async () => {
    if (!confirm('🚨 CRITICAL WARNING: This will permanently wipe all notes, diagrams, goals, and local configurations. This cannot be undone. Are you absolutely sure?')) return;
    try {
      const stores = [
        'notes', 'timetable', 'events', 'assignments', 'goals', 'habits',
        'pomodoro', 'flashcards', 'flashcard_decks', 'projects', 'diagrams',
        'career_jobs', 'career_resume', 'resources', 'attendance'
      ];
      for (const store of stores) {
        await db.clear(store as any);
      }
      localStorage.clear();
      alert('Local storage database wiped clean. Re-scaffolding...');
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert('Wipe operation failed.');
    }
  };

  return (
    <div className="module-container">
      <div className="module-header">
        <div>
          <h2 style={{ fontSize: '18px' }}>⚙️ System Settings & Backups</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Configure themes, custom desktop backgrounds, and import/export offline database backups.</p>
        </div>
      </div>

      <div className="module-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', overflowY: 'auto' }}>
        
        {/* Themes setting */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h3 style={{ fontSize: '15px', color: 'var(--accent-color)' }}>🎨 Core Themes</h3>
          <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Switch workspace skins instantly.</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {([
              { id: 'neo-dark', name: 'Neo Dark (Slate Space)' },
              { id: 'cyberpunk', name: 'Cyberpunk (Neon Glow)' },
              { id: 'academic-sepia', name: 'Sepia Academic (Bookish)' },
              { id: 'minimal-light', name: 'Minimal Light (Paper)' }
            ] as { id: ThemeType; name: string }[]).map(t => (
              <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  checked={theme === t.id} 
                  onChange={() => setTheme(t.id)} 
                  style={{ accentColor: 'var(--accent-color)' }}
                />
                {t.name}
              </label>
            ))}
          </div>
        </div>

        {/* Wallpaper background setting */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h3 style={{ fontSize: '15px', color: 'var(--accent-color)' }}>🖼️ Desktop Wallpaper</h3>
          <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Select canvas backdrop patterns.</p>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {wallpapers.map(wall => (
              <button
                key={wall.name}
                className="btn"
                style={{
                  fontSize: '11px',
                  padding: '12px 6px',
                  background: wallpaper === wall.value ? 'rgba(var(--accent-color-rgb), 0.15)' : 'rgba(255,255,255,0.02)',
                  borderColor: wallpaper === wall.value ? 'var(--accent-color)' : 'var(--glass-border)'
                }}
                onClick={() => setWallpaper(wall.value)}
              >
                {wall.name}
              </button>
            ))}
          </div>
        </div>

        {/* Sound Effects setting */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h3 style={{ fontSize: '15px', color: 'var(--accent-color)' }}>🔊 Sound Effects</h3>
          <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Toggle tactile audio feedback chimes.</p>
          
          <button 
            className="btn"
            style={{
              width: '100%',
              background: soundsEnabled ? 'rgba(var(--accent-color-rgb), 0.15)' : 'rgba(0,0,0,0.1)',
              borderColor: soundsEnabled ? 'var(--accent-color)' : 'var(--glass-border)',
              fontSize: '12px',
              padding: '12px 6px'
            }}
            onClick={toggleSounds}
          >
            {soundsEnabled ? '🔊 Audio Chimes Enabled' : '🔇 Audio Chimes Muted'}
          </button>
        </div>

        {/* Desktop Widgets config panel */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h3 style={{ fontSize: '15px', color: 'var(--accent-color)' }}>📌 Desktop Widgets</h3>
          <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Show or hide widget components on your desktop workspace.</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {widgets.map(w => (
              <button
                key={w.id}
                className="btn"
                style={{
                  width: '100%',
                  justifyContent: 'flex-start',
                  background: w.visible ? 'rgba(var(--accent-color-rgb), 0.15)' : 'rgba(255,255,255,0.02)',
                  borderColor: w.visible ? 'var(--accent-color)' : 'var(--glass-border)',
                  fontSize: '12px',
                  padding: '6px 12px'
                }}
                onClick={() => toggleWidget(w.id)}
              >
                <span>{w.icon}</span>
                <span>{w.title}</span>
                <span style={{ marginLeft: 'auto', fontSize: '10px', color: w.visible ? 'var(--accent-color)' : 'var(--text-muted)' }}>
                  {w.visible ? 'Enabled' : 'Disabled'}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Import/Export settings */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '10px', gridColumn: 'span 2' }}>
          <h3 style={{ fontSize: '15px', color: 'var(--accent-color)' }}>💾 Database Backups & Data Portability</h3>
          <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Download full study vaults as JSON or restore your offline system configurations on another device.</p>
          
          {/* Database Stats */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(3, 1fr)', 
            gap: '12px', 
            padding: '12px', 
            background: 'rgba(255,255,255,0.02)', 
            borderRadius: '6px', 
            border: '1px solid var(--glass-border)',
            fontSize: '12px',
            marginTop: '6px'
          }}>
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>Stored Notes</span>
              <p style={{ fontSize: '16px', fontWeight: 'bold', margin: '2px 0 0 0', color: 'var(--accent-color)' }}>{dbStats.notesCount}</p>
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>Created Diagrams</span>
              <p style={{ fontSize: '16px', fontWeight: 'bold', margin: '2px 0 0 0', color: 'var(--accent-color)' }}>{dbStats.diagramsCount}</p>
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>Database Size</span>
              <p style={{ fontSize: '16px', fontWeight: 'bold', margin: '2px 0 0 0', color: 'var(--success)' }}>{dbStats.totalSizeKB} KB</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginTop: '6px' }}>
            <button className="btn btn-primary" onClick={handleExportData}>
              📥 Export System Backup (.json)
            </button>
            
            <label className="btn" style={{ position: 'relative', cursor: 'pointer' }}>
              📤 Import System Backup
              <input
                type="file"
                accept=".json"
                onChange={handleImportData}
                style={{ display: 'none' }}
              />
            </label>

            <button className="btn btn-danger" onClick={handleWipeDatabase}>
              🚨 Factory Reset System
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
