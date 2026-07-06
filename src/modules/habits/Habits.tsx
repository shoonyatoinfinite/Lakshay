import React, { useState, useEffect } from 'react';
import { db } from '../../db/db';

interface Habit {
  id: string;
  name: string;
  frequency: 'daily' | 'weekly';
  datesCompleted: string[]; // array of 'YYYY-MM-DD'
  streak: number;
  createdAt: number;
}

export const Habits: React.FC = () => {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [newHabitName, setNewHabitName] = useState('');
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);

  const loadHabits = async () => {
    setLoading(true);
    try {
      const data = await db.getAll('habits');
      setHabits(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHabits();
  }, []);

  const handleAddHabit = async () => {
    if (!newHabitName.trim()) return;

    const newHabit: Habit = {
      id: crypto.randomUUID(),
      name: newHabitName,
      frequency: 'daily',
      datesCompleted: [],
      streak: 0,
      createdAt: Date.now()
    };

    try {
      await db.put('habits', newHabit);
      setNewHabitName('');
      await loadHabits();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteHabit = async (id: string) => {
    if (!confirm('Remove this habit tracker?')) return;
    try {
      await db.delete('habits', id);
      await loadHabits();
    } catch (e) {
      console.error(e);
    }
  };

  const getLocalDateString = (dateObj = new Date()) => {
    const y = dateObj.getFullYear();
    const m = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const d = dateObj.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const handleToggleHabitToday = async (habit: Habit) => {
    const todayStr = getLocalDateString();
    let updatedDates = [...habit.datesCompleted];

    if (updatedDates.includes(todayStr)) {
      updatedDates = updatedDates.filter(d => d !== todayStr);
    } else {
      updatedDates.push(todayStr);
    }

    // Recalculate streak
    const streak = calculateStreak(updatedDates);
    const updatedHabit = { ...habit, datesCompleted: updatedDates, streak };

    try {
      await db.put('habits', updatedHabit);
      await loadHabits();
    } catch (e) {
      console.error(e);
    }
  };

  const calculateStreak = (dates: string[]): number => {
    if (dates.length === 0) return 0;
    
    // Sort dates descending
    const sorted = [...dates].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const latestDate = new Date(sorted[0]);
    latestDate.setHours(0,0,0,0);

    // If the latest completion is older than yesterday, streak is broken
    if (latestDate < yesterday && latestDate.getTime() !== today.getTime()) {
      return 0;
    }

    let streak = 0;
    let checkDate = latestDate.getTime() === today.getTime() ? today : yesterday;

    for (let i = 0; i < sorted.length; i++) {
      const completion = new Date(sorted[i]);
      completion.setHours(0,0,0,0);

      if (completion.getTime() === checkDate.getTime()) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (completion.getTime() > checkDate.getTime()) {
        // Skip duplicate check on same day
        continue;
      } else {
        // Gap found
        break;
      }
    }
    return streak;
  };

  // Helper to generate coordinates for a 365-day grid
  const renderHabitGrid = (habit: Habit) => {
    const cols = 53;
    const rows = 7;
    const cellSize = 10;
    const gap = 3;
    const cells = [];
    
    const today = new Date();
    // Start grid 364 days ago (to align nicely to 53 weeks)
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 364);
    
    // Adjust start date to previous Monday to align grid row indexing
    const startDay = startDate.getDay();
    const offset = startDay === 0 ? 6 : startDay - 1;
    startDate.setDate(startDate.getDate() - offset);

    const tempDate = new Date(startDate);

    for (let col = 0; col < cols; col++) {
      for (let row = 0; row < rows; row++) {
        const dateStr = getLocalDateString(tempDate);
        const isCompleted = habit.datesCompleted.includes(dateStr);
        const displayDate = tempDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
        

        
        cells.push(
          <rect
            key={`${col}-${row}`}
            x={col * (cellSize + gap)}
            y={row * (cellSize + gap)}
            width={cellSize}
            height={cellSize}
            rx={2}
            fill={isCompleted ? 'var(--success)' : 'rgba(255, 255, 255, 0.05)'}
            stroke="rgba(0,0,0,0.2)"
            strokeWidth={0.5}
            style={{ cursor: 'pointer', transition: 'fill 0.2s' }}
            onMouseEnter={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const container = e.currentTarget.closest('.svg-container')?.getBoundingClientRect();
              if (rect && container) {
                setTooltip({
                  text: `${displayDate}: ${isCompleted ? '✓ Completed' : 'Pending'}`,
                  x: rect.left - container.left - 50,
                  y: rect.top - container.top - 32
                });
              }
            }}
            onMouseLeave={() => setTooltip(null)}
          />
        );
        
        tempDate.setDate(tempDate.getDate() + 1);
        if (tempDate > today) break;
      }
      if (tempDate > today) break;
    }

    return (
      <div className="svg-container" style={{ position: 'relative', overflowX: 'auto', width: '100%', padding: '10px 0' }}>
        <svg width={cols * (cellSize + gap)} height={rows * (cellSize + gap)} style={{ display: 'block' }}>
          {cells}
        </svg>
        {tooltip && (
          <div
            className="chart-tooltip"
            style={{
              position: 'absolute',
              left: `${tooltip.x}px`,
              top: `${tooltip.y}px`,
              pointerEvents: 'none'
            }}
          >
            {tooltip.text}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="state-container">
        <div className="state-loading-spinner" />
        <p>Loading habit grid...</p>
      </div>
    );
  }

  const todayStr = getLocalDateString();

  return (
    <div className="module-container">
      <div className="module-header">
        <div>
          <h2 style={{ fontSize: '18px' }}>🌱 Habit Consistency Tracker</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Cultivate consistency with visual contribution trackers and streak counts.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            className="input-field"
            placeholder="New habit name (e.g. Code, Read, Workout)"
            value={newHabitName}
            onChange={(e) => setNewHabitName(e.target.value)}
            style={{ width: '220px' }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAddHabit(); }}
          />
          <button className="btn btn-primary" onClick={handleAddHabit}>Add Habit</button>
        </div>
      </div>

      <div className="module-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
        {habits.length === 0 ? (
          <div className="state-container">
            <span className="state-icon">🌱</span>
            <h4>No Habits Tracking</h4>
            <p style={{ color: 'var(--text-secondary)' }}>Add your first target habit, maintain daily streaks, and watch your grid glow!</p>
          </div>
        ) : (
          habits.map(h => {
            const isCompletedToday = h.datesCompleted.includes(todayStr);

            return (
              <div key={h.id} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input
                      type="checkbox"
                      checked={isCompletedToday}
                      onChange={() => handleToggleHabitToday(h)}
                      style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: 'var(--success)' }}
                    />
                    <div>
                      <h4 style={{ fontSize: '15px', textDecoration: isCompletedToday ? 'line-through' : 'none', color: isCompletedToday ? 'var(--text-muted)' : 'inherit' }}>
                        {h.name}
                      </h4>
                      <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        Today's status: {isCompletedToday ? '✅ Done' : '⏹ Pending'}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{ fontSize: '13px', color: '#ff7a00', fontWeight: 'bold' }}>
                      🔥 Streak: {h.streak} days
                    </span>
                    <button
                      className="btn"
                      style={{ padding: '4px 8px', fontSize: '11px' }}
                      onClick={() => handleDeleteHabit(h.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* GitHub style contribution grid */}
                <div style={{ background: 'rgba(0,0,0,0.15)', padding: '10px', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Consistency Heatmap (Past 365 Days)</span>
                  {renderHabitGrid(h)}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
