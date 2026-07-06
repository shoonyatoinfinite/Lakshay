import React, { useState, useEffect } from 'react';
import { db } from '../../db/db';

interface AttendanceItem {
  id: string;
  subject: string;
  attended: number;
  total: number;
  target: number; // e.g. 75
}

export const Attendance: React.FC = () => {
  const [items, setItems] = useState<AttendanceItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [subject, setSubject] = useState('');
  const [attended, setAttended] = useState(0);
  const [total, setTotal] = useState(0);
  const [target, setTarget] = useState(75);

  const loadAttendance = async () => {
    setLoading(true);
    try {
      const data = await db.getAll('attendance');
      setItems(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttendance();
  }, []);

  const handleSave = async () => {
    if (!subject.trim() || total < 0 || attended < 0 || attended > total) {
      alert('Invalid attendance numbers. Attended cannot exceed total.');
      return;
    }

    const newItem: AttendanceItem = {
      id: crypto.randomUUID(),
      subject,
      attended,
      total,
      target
    };

    try {
      await db.put('attendance', newItem);
      await loadAttendance();
      setShowAddForm(false);
      setSubject('');
      setAttended(0);
      setTotal(0);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subject logs?')) return;
    try {
      await db.delete('attendance', id);
      await loadAttendance();
    } catch (e) {
      console.error(e);
    }
  };

  const handleQuickLog = async (item: AttendanceItem, type: 'attend' | 'absent') => {
    const updated = {
      ...item,
      attended: type === 'attend' ? item.attended + 1 : item.attended,
      total: item.total + 1
    };

    try {
      await db.put('attendance', updated);
      await loadAttendance();
    } catch (e) {
      console.error(e);
    }
  };

  const calculateAdvice = (attended: number, total: number, target: number) => {
    if (total === 0) return 'Attend classes to gather data.';
    const currentPercent = (attended / total) * 100;
    const targetFraction = target / 100;

    if (currentPercent >= target) {
      // How many classes can we skip consecutively?
      // (attended) / (total + x) >= targetFraction
      // attended >= targetFraction * (total + x)
      // attended / targetFraction >= total + x
      // x <= (attended / targetFraction) - total
      const maxSkip = Math.floor((attended / targetFraction) - total);
      return maxSkip > 0 
        ? `🟢 You can safely skip the next ${maxSkip} classes.` 
        : `🟢 At target! You cannot skip the next class.`;
    } else {
      // How many consecutive classes to attend to reach target?
      // (attended + y) / (total + y) >= targetFraction
      // attended + y >= targetFraction * total + targetFraction * y
      // y * (1 - targetFraction) >= targetFraction * total - attended
      // y >= (targetFraction * total - attended) / (1 - targetFraction)
      const targetPercentVal = targetFraction;
      const needed = Math.ceil((targetPercentVal * total - attended) / (1 - targetPercentVal));
      return `🔴 You need to attend the next ${needed} classes consecutively.`;
    }
  };

  if (loading) {
    return (
      <div className="state-container">
        <div className="state-loading-spinner" />
        <p>Loading attendance registers...</p>
      </div>
    );
  }

  return (
    <div className="module-container">
      <div className="module-header">
        <div>
          <h2 style={{ fontSize: '18px' }}>✅ Attendance Assistant</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Track class attendance and calculate bunking allowances dynamically.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddForm(true)}>
          ➕ Add Subject
        </button>
      </div>

      <div className="module-body" style={{ overflowY: 'auto' }}>
        {items.length === 0 ? (
          <div className="state-container">
            <span className="state-icon">✅</span>
            <h4>No Attendance Logs</h4>
            <p style={{ color: 'var(--text-secondary)' }}>Log subjects and set target cut-offs (e.g., 75% standard).</p>
            <button className="btn btn-primary" style={{ marginTop: '12px' }} onClick={() => setShowAddForm(true)}>
              Register Subject
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {items.map(item => {
              const currentPercent = item.total > 0 ? Math.round((item.attended / item.total) * 100) : 0;
              const advice = calculateAdvice(item.attended, item.total, item.target);
              
              return (
                <div
                  key={item.id}
                  className="glass-panel"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    borderLeft: `4px solid ${currentPercent >= item.target ? 'var(--success)' : 'var(--error)'}`
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h4 style={{ fontSize: '14px' }}>{item.subject}</h4>
                    <button
                      onClick={() => handleDelete(item.id)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '16px' }}
                    >
                      ×
                    </button>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '24px', fontWeight: 'bold' }}>{currentPercent}%</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      Log: <strong>{item.attended} / {item.total}</strong> classes
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
                    {/* Target line */}
                    <div 
                      style={{ 
                        position: 'absolute', 
                        left: `${item.target}%`, 
                        width: '2px', 
                        height: '100%', 
                        background: 'rgba(255,255,255,0.4)', 
                        zIndex: 10 
                      }} 
                      title={`Target: ${item.target}%`}
                    />
                    <div 
                      style={{ 
                        width: `${currentPercent}%`, 
                        height: '100%', 
                        background: currentPercent >= item.target ? 'var(--success)' : 'var(--error)', 
                        borderRadius: '4px' 
                      }} 
                    />
                  </div>

                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                    {advice}
                  </p>

                  <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '10px', display: 'flex', gap: '8px', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Target: {item.target}%</span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button 
                        className="btn" 
                        style={{ padding: '2px 8px', fontSize: '10px', background: 'rgba(239, 68, 68, 0.1)' }}
                        onClick={() => handleQuickLog(item, 'absent')}
                      >
                        ❌ Missed
                      </button>
                      <button 
                        className="btn btn-primary" 
                        style={{ padding: '2px 8px', fontSize: '10px', background: 'var(--success)' }}
                        onClick={() => handleQuickLog(item, 'attend')}
                      >
                        ✔️ Attended
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Attendance Form Modal */}
      {showAddForm && (
        <div className="launcher-overlay" onClick={() => setShowAddForm(false)}>
          <div className="launcher-window" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <h3 style={{ fontSize: '16px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px' }}>Track Subject Attendance</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Subject / Course Name</label>
                <input
                  type="text"
                  className="input-field"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Microprocessors, Fluid Dynamics"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Classes Attended</label>
                  <input
                    type="number"
                    className="input-field"
                    value={attended}
                    onChange={(e) => setAttended(Math.max(0, parseInt(e.target.value) || 0))}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Total Classes Held</label>
                  <input
                    type="number"
                    className="input-field"
                    value={total}
                    onChange={(e) => setTotal(Math.max(0, parseInt(e.target.value) || 0))}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Target Attendance (%)</label>
                <input
                  type="number"
                  className="input-field"
                  value={target}
                  onChange={(e) => setTarget(Math.max(1, Math.min(99, parseInt(e.target.value) || 75)))}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button className="btn" onClick={() => setShowAddForm(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSave}>Save Subject</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
