import React, { useEffect, useState } from 'react';
import { db } from '../../db/db';
import type { DBStoreTypes } from '../../db/db';
import { useWindowManager } from '../../context/WindowManagerContext';

interface DailyFocus {
  id: string;
  text: string;
  completed: boolean;
}

const STUDY_QUOTES = [
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "Quality is not an act, it is a habit.", author: "Aristotle" },
  { text: "Focus on the process, not just the outcome.", author: "Unknown" },
  { text: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier" },
  { text: "Do not wait for opportunities, create them.", author: "Roy T. Bennett" },
  { text: "Energy and persistence conquer all things.", author: "Benjamin Franklin" }
];

export const Dashboard: React.FC = () => {
  const { openWindow } = useWindowManager();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    assignments: DBStoreTypes['assignments'][];
    classes: DBStoreTypes['timetable'][];
    goals: DBStoreTypes['goals'][];
    notes: DBStoreTypes['notes'][];
  }>({ assignments: [], classes: [], goals: [], notes: [] });

  const [greeting, setGreeting] = useState('');
  const [quoteIndex, setQuoteIndex] = useState(0);

  // Daily focus tasks state
  const [focusTasks, setFocusTasks] = useState<DailyFocus[]>(() => {
    const saved = localStorage.getItem('lakshya_daily_focus');
    return saved ? JSON.parse(saved) : [
      { id: '1', text: 'Revise active lectures', completed: false },
      { id: '2', text: 'Log habits progress', completed: false },
      { id: '3', text: '30 minutes reading block', completed: false }
    ];
  });
  const [newFocusText, setNewFocusText] = useState('');

  // Quick log stats
  const [logMins, setLogMins] = useState(30);
  const [logSubject, setLogSubject] = useState('');

  useEffect(() => {
    localStorage.setItem('lakshya_daily_focus', JSON.stringify(focusTasks));
  }, [focusTasks]);

  const shuffleQuote = () => {
    setQuoteIndex(prev => (prev + 1) % STUDY_QUOTES.length);
  };

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const assignments = await db.getAll('assignments');
      const classes = await db.getAll('timetable');
      const goals = await db.getAll('goals');
      const notes = await db.getAll('notes');

      // Sort & filter relevant dashboard items
      const urgentAssignments = assignments
        .filter(a => a.status !== 'submitted' && a.status !== 'graded')
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
        .slice(0, 3);

      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const today = days[new Date().getDay()];
      const todayClasses = classes
        .filter(c => c.day === today)
        .sort((a, b) => a.timeStart.localeCompare(b.timeStart));

      setData({
        assignments: urgentAssignments,
        classes: todayClasses,
        goals: goals.slice(0, 3),
        notes: notes.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 3)
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const updateGreeting = () => {
      const hours = new Date().getHours();
      const name = localStorage.getItem('lakshya_scholar_name') || 'Scholar';
      if (hours < 12) setGreeting(`Good morning, ${name} ☀️`);
      else if (hours < 18) setGreeting(`Good afternoon, ${name} 🌤️`);
      else setGreeting(`Good evening, ${name} 🌙`);
    };
    updateGreeting();
    loadDashboardData();

    window.addEventListener('focus', updateGreeting);
    return () => window.removeEventListener('focus', updateGreeting);
  }, []);

  const handleAddFocus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFocusText.trim()) return;
    setFocusTasks([...focusTasks, { id: crypto.randomUUID(), text: newFocusText, completed: false }]);
    setNewFocusText('');
  };

  const handleToggleFocus = (id: string) => {
    setFocusTasks(focusTasks.map(f => f.id === id ? { ...f, completed: !f.completed } : f));
  };

  const handleClearFocus = () => {
    setFocusTasks([]);
  };

  const handleQuickLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logSubject.trim() || logMins <= 0) return;
    const newLog = {
      id: crypto.randomUUID(),
      taskName: `Study: ${logSubject}`,
      duration: logMins,
      timestamp: Date.now()
    };
    try {
      await db.put('pomodoro', newLog);
      alert(`Logged ${logMins} mins focus block for ${logSubject}!`);
      setLogSubject('');
      loadDashboardData();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="state-container">
        <div className="state-loading-spinner" />
        <p>Booting dashboard services...</p>
      </div>
    );
  }

  const quote = STUDY_QUOTES[quoteIndex];

  return (
    <div className="module-container" style={{ position: 'relative', overflow: 'hidden' }}>
      
      {/* OS 3D Perspective Holographic Cyber Grid Background */}
      <div className="dashboard-3d-container">
        <div className="dashboard-3d-grid" />
        <div className="dashboard-3d-ring" style={{ top: '25%', left: '70%' }} />
        <div className="dashboard-3d-ring" style={{ top: '75%', left: '15%', width: '200px', height: '200px', animationDuration: '15s' }} />
      </div>

      <div className="module-header" style={{ zIndex: 10 }}>
        <div>
          <h2 style={{ fontSize: '20px', fontFamily: 'var(--font-heading)' }}>{greeting}</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Futuristic productivity cockpit.</p>
        </div>
        <button className="btn btn-primary" onClick={loadDashboardData}>🔄 Refresh Deck</button>
      </div>

      <div 
        className="module-body" 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
          gap: '20px', 
          zIndex: 10,
          padding: '16px' 
        }}
      >
        
        {/* UPPER BANNER: Shuffleable Inspirational Quote */}
        <div 
          className="glass-panel card-animate-1" 
          style={{ 
            gridColumn: 'span 3', 
            background: 'linear-gradient(135deg, rgba(var(--accent-color-rgb), 0.12) 0%, rgba(123, 44, 191, 0.08) 100%)',
            borderColor: 'rgba(var(--accent-color-rgb), 0.25)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 24px',
            position: 'relative'
          }}
        >
          <div>
            <span style={{ fontSize: '10px', color: 'var(--accent-color)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '2px' }}>Daily Focus Quote</span>
            <h3 style={{ fontSize: '15px', fontStyle: 'italic', fontWeight: 500, marginTop: '4px', color: 'var(--text-primary)' }}>
              "{quote.text}"
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>— {quote.author}</span>
          </div>
          <button 
            className="btn" 
            style={{ fontSize: '11px', padding: '6px 12px', borderStyle: 'dashed' }}
            onClick={shuffleQuote}
          >
            🎲 Shuffle
          </button>
        </div>

        {/* ROW 1 CARD 1: Today's Lectures */}
        <div className="glass-panel card-animate-2" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ fontSize: '14px', color: 'var(--accent-color)', display: 'flex', justifyContent: 'space-between' }}>
            <span>🏫 Today's Lectures</span>
            <button className="btn" style={{ padding: '2px 6px', fontSize: '10px' }} onClick={() => openWindow('timetable')}>Manage</button>
          </h3>
          {data.classes.length === 0 ? (
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No lectures scheduled today. Enjoy your self-study time!</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {data.classes.map(c => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', borderLeft: `3px solid ${c.color || 'var(--accent-color)'}` }}>
                  <div>
                    <h5 style={{ fontSize: '13px' }}>{c.subject}</h5>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.room ? `Room ${c.room}` : ''} {c.teacher ? `• ${c.teacher}` : ''}</span>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                    {c.timeStart}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ROW 1 CARD 2: Urgent Deadlines */}
        <div className="glass-panel card-animate-3" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ fontSize: '14px', color: 'var(--error)', display: 'flex', justifyContent: 'space-between' }}>
            <span>✏️ Urgent Assignments</span>
            <button className="btn" style={{ padding: '2px 6px', fontSize: '10px' }} onClick={() => openWindow('assignments')}>Details</button>
          </h3>
          {data.assignments.length === 0 ? (
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No pending assignments! All caught up.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {data.assignments.map(a => (
                <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                  <div>
                    <h5 style={{ fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>{a.title}</h5>
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{a.subject}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '9px', padding: '2px 4px', borderRadius: '4px', background: a.priority === 'high' ? 'rgba(239,68,68,0.2)' : 'rgba(251,191,36,0.2)', color: a.priority === 'high' ? 'var(--error)' : 'var(--warning)', fontWeight: 'bold' }}>
                      {a.priority.toUpperCase()}
                    </span>
                    <p style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px' }}>{a.dueDate}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ROW 1 CARD 3: Target OKR Goals */}
        <div className="glass-panel card-animate-4" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ fontSize: '14px', color: 'var(--success)', display: 'flex', justifyContent: 'space-between' }}>
            <span>🎯 Target OKRs</span>
            <button className="btn" style={{ padding: '2px 6px', fontSize: '10px' }} onClick={() => openWindow('goals')}>Goals</button>
          </h3>
          {data.goals.length === 0 ? (
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No goals configured. Establish your academic targets!</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {data.goals.map(g => (
                <div key={g.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                    <span>{g.title}</span>
                    <span style={{ fontWeight: 'bold' }}>{g.progress}%</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${g.progress}%`, height: '100%', background: 'var(--success)', borderRadius: '3px' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ROW 2 CARD 1: Daily Focus Objectives Checklist */}
        <div className="glass-panel card-animate-2" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '14px', color: '#ffb703' }}>🎯 Daily Objectives</h3>
            <button className="btn" style={{ padding: '2px 6px', fontSize: '10px' }} onClick={handleClearFocus}>Wipe</button>
          </div>
          
          <form onSubmit={handleAddFocus} style={{ display: 'flex', gap: '6px' }}>
            <input 
              type="text" 
              className="input-field" 
              style={{ fontSize: '11px', padding: '6px' }}
              value={newFocusText}
              onChange={(e) => setNewFocusText(e.target.value)}
              placeholder="Add daily study target..."
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '11px' }}>+</button>
          </form>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto', maxHeight: '150px' }}>
            {focusTasks.length === 0 ? (
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>No daily objectives set.</p>
            ) : (
              focusTasks.map(f => (
                <label 
                  key={f.id} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    fontSize: '12px', 
                    cursor: 'pointer',
                    textDecoration: f.completed ? 'line-through' : 'none',
                    color: f.completed ? 'var(--text-muted)' : 'var(--text-primary)'
                  }}
                >
                  <input 
                    type="checkbox" 
                    checked={f.completed} 
                    onChange={() => handleToggleFocus(f.id)}
                    style={{ accentColor: '#ffb703' }}
                  />
                  <span>{f.text}</span>
                </label>
              ))
            )}
          </div>
        </div>

        {/* ROW 2 CARD 2: Quick Study Logger */}
        <div className="glass-panel card-animate-3" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ fontSize: '14px', color: 'var(--accent-color)' }}>✍️ Log Study Sessions</h3>
          <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Log finished study blocks directly into your stats.</p>
          
          <form onSubmit={handleQuickLog} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <label style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>Subject</label>
                <input 
                  type="text" 
                  className="input-field" 
                  style={{ padding: '6px', fontSize: '11px' }}
                  value={logSubject} 
                  onChange={(e) => setLogSubject(e.target.value)} 
                  placeholder="e.g. Physics" 
                  required
                />
              </div>
              <div style={{ width: '80px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <label style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>Minutes</label>
                <input 
                  type="number" 
                  className="input-field" 
                  style={{ padding: '6px', fontSize: '11px', textAlign: 'center' }}
                  value={logMins} 
                  onChange={(e) => setLogMins(parseInt(e.target.value) || 0)} 
                  min="5" 
                  required
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '6px 0', fontSize: '11px' }}>
              📥 Log to Database
            </button>
          </form>
        </div>

        {/* ROW 2 CARD 3: Quick Launchpad */}
        <div className="glass-panel card-animate-4" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h3 style={{ fontSize: '14px', color: 'var(--text-primary)' }}>🚀 Quick Launchpad</h3>
          <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Instantly launch helper widgets.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
            <button className="btn" style={{ fontSize: '11px' }} onClick={() => openWindow('diagrams')}>📐 Diagram Map</button>
            <button className="btn" style={{ fontSize: '11px' }} onClick={() => openWindow('calculators')}>🧮 Calculators</button>
            <button className="btn" style={{ fontSize: '11px' }} onClick={() => openWindow('analytics')}>📊 Study Stats</button>
            <button className="btn" style={{ fontSize: '11px' }} onClick={() => openWindow('settings')}>⚙️ Settings</button>
          </div>
        </div>

      </div>
    </div>
  );
};
