import React, { useState, useEffect } from 'react';
import { db } from '../../db/db';

interface KeyResult {
  id: string;
  text: string;
  done: boolean;
}

interface Goal {
  id: string;
  title: string;
  category: string; // Academics, Personal, Career, Health
  dueDate: string;
  progress: number; // percentage (0 - 100)
  keyResults: KeyResult[];
}

export const Goals: React.FC = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Academics');
  const [dueDate, setDueDate] = useState('');
  const [krInput, setKrInput] = useState('');
  const [krsList, setKrsList] = useState<string[]>([]);

  const loadGoals = async () => {
    setLoading(true);
    try {
      const data = await db.getAll('goals');
      setGoals(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGoals();
  }, []);

  const handleAddKR = () => {
    if (krInput.trim() && !krsList.includes(krInput.trim())) {
      setKrsList([...krsList, krInput.trim()]);
      setKrInput('');
    }
  };

  const handleRemoveKR = (text: string) => {
    setKrsList(krsList.filter(k => k !== text));
  };

  const handleSaveGoal = async () => {
    if (!title.trim() || !dueDate) return;

    const keyResults: KeyResult[] = krsList.map(text => ({
      id: crypto.randomUUID(),
      text,
      done: false
    }));

    const newGoal: Goal = {
      id: crypto.randomUUID(),
      title,
      category,
      dueDate,
      progress: 0,
      keyResults
    };

    try {
      await db.put('goals', newGoal);
      await loadGoals();
      setShowAddForm(false);
      
      // Clear
      setTitle('');
      setKrsList([]);
      setKrInput('');
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    if (!confirm('Are you sure you want to delete this Goal and its OKRs?')) return;
    try {
      await db.delete('goals', id);
      await loadGoals();
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleKR = async (goalId: string, krId: string) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    const updatedKRs = goal.keyResults.map(kr =>
      kr.id === krId ? { ...kr, done: !kr.done } : kr
    );

    // Calculate progress
    const completedCount = updatedKRs.filter(k => k.done).length;
    const progress = updatedKRs.length > 0 ? Math.round((completedCount / updatedKRs.length) * 100) : 0;

    const updatedGoal = { ...goal, keyResults: updatedKRs, progress };
    try {
      await db.put('goals', updatedGoal);
      await loadGoals();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="state-container">
        <div className="state-loading-spinner" />
        <p>Loading goals...</p>
      </div>
    );
  }

  return (
    <div className="module-container">
      <div className="module-header">
        <div>
          <h2 style={{ fontSize: '18px' }}>🎯 Goals & OKRs (Objectives & Key Results)</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Set ambitious targets and track key results to measure semester success.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddForm(true)}>
          ➕ Create Goal
        </button>
      </div>

      <div className="module-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', overflowY: 'auto' }}>
        {goals.length === 0 ? (
          <div className="state-container" style={{ gridColumn: 'span 2' }}>
            <span className="state-icon">🎯</span>
            <h4>No Goals Logged</h4>
            <p style={{ color: 'var(--text-secondary)' }}>Break your semester objectives down into actionable key results.</p>
            <button className="btn btn-primary" style={{ marginTop: '12px' }} onClick={() => setShowAddForm(true)}>
              Define First Goal
            </button>
          </div>
        ) : (
          goals.map(g => (
            <div key={g.id} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px', color: 'var(--accent-color)' }}>
                    {g.category}
                  </span>
                  <h4 style={{ fontSize: '15px', marginTop: '6px' }}>{g.title}</h4>
                </div>
                <button
                  onClick={() => handleDeleteGoal(g.id)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '16px' }}
                >
                  ×
                </button>
              </div>

              {/* Progress */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                  <span>Completion Progress</span>
                  <span style={{ fontWeight: 'bold' }}>{g.progress}%</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${g.progress}%`, height: '100%', background: 'var(--accent-gradient)', borderRadius: '4px' }} />
                </div>
              </div>

              {/* Key Results list */}
              {g.keyResults.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid var(--glass-border)', paddingTop: '10px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500 }}>Key Results Checklist:</span>
                  {g.keyResults.map(kr => (
                    <label key={kr.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={kr.done}
                        onChange={() => handleToggleKR(g.id, kr.id)}
                        style={{ accentColor: 'var(--accent-color)' }}
                      />
                      <span style={{ textDecoration: kr.done ? 'line-through' : 'none', color: kr.done ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                        {kr.text}
                      </span>
                    </label>
                  ))}
                </div>
              )}

              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: 'auto', textAlign: 'right' }}>
                Target Due Date: {g.dueDate}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Goal Form overlay modal */}
      {showAddForm && (
        <div className="launcher-overlay" onClick={() => setShowAddForm(false)}>
          <div className="launcher-window" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <h3 style={{ fontSize: '16px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px' }}>
              Define Goal Objective
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Objective / Goal Title</label>
                <input
                  type="text"
                  className="input-field"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Achieve 9.0 GPA, Master Data Structures"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Category</label>
                  <select className="select-field" value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option value="Academics" style={{ background: '#000' }}>Academics</option>
                    <option value="Personal" style={{ background: '#000' }}>Personal</option>
                    <option value="Career" style={{ background: '#000' }}>Career</option>
                    <option value="Health" style={{ background: '#000' }}>Health</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Target Date</label>
                  <input
                    type="date"
                    className="input-field"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Key Results list inputs */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid var(--glass-border)', paddingTop: '10px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Define Key Results (Measurable Sub-tasks)</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. Attend all lectures, Complete 5 project milestones"
                    value={krInput}
                    onChange={(e) => setKrInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddKR(); } }}
                  />
                  <button className="btn" onClick={handleAddKR}>Add</button>
                </div>
                
                {krsList.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
                    {krsList.map(text => (
                      <div key={text} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '4px 8px', borderRadius: '4px', fontSize: '11px' }}>
                        <span>• {text}</span>
                        <span style={{ cursor: 'pointer', color: 'var(--error)', fontWeight: 'bold' }} onClick={() => handleRemoveKR(text)}>×</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button className="btn" onClick={() => setShowAddForm(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSaveGoal}>Define Goal</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
