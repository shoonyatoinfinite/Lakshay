import React, { useState, useEffect } from 'react';
import { db } from '../../db/db';

interface TimetableItem {
  id: string;
  day: string; // 'Monday', 'Tuesday', etc.
  subject: string;
  timeStart: string; // HH:MM (24h)
  timeEnd: string; // HH:MM (24h)
  room?: string;
  teacher?: string;
  color?: string;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const Timetable: React.FC = () => {
  const [items, setItems] = useState<TimetableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentClass, setCurrentClass] = useState<TimetableItem | null>(null);
  
  // Add class states
  const [showAddForm, setShowAddForm] = useState(false);
  const [subject, setSubject] = useState('');
  const [day, setDay] = useState('Monday');
  const [timeStart, setTimeStart] = useState('');
  const [timeEnd, setTimeEnd] = useState('');
  const [room, setRoom] = useState('');
  const [teacher, setTeacher] = useState('');
  const [color, setColor] = useState('#00c3ff');

  const loadTimetable = async () => {
    setLoading(true);
    try {
      const data = await db.getAll('timetable');
      setItems(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTimetable();
  }, []);

  // Calculate current ongoing class
  useEffect(() => {
    const checkCurrentClass = () => {
      const now = new Date();
      const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const currentDay = weekdays[now.getDay()];
      
      const currentHours = now.getHours().toString().padStart(2, '0');
      const currentMins = now.getMinutes().toString().padStart(2, '0');
      const currentTime = `${currentHours}:${currentMins}`;

      const active = items.find(item => {
        return item.day === currentDay &&
               currentTime >= item.timeStart &&
               currentTime <= item.timeEnd;
      });
      setCurrentClass(active || null);
    };

    checkCurrentClass();
    const interval = setInterval(checkCurrentClass, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [items]);

  const handleSaveClass = async () => {
    if (!subject.trim() || !timeStart || !timeEnd) return;

    const newItem: TimetableItem = {
      id: crypto.randomUUID(),
      subject,
      day,
      timeStart,
      timeEnd,
      room: room || undefined,
      teacher: teacher || undefined,
      color
    };

    try {
      await db.put('timetable', newItem);
      await loadTimetable();
      setShowAddForm(false);
      
      // Clear form
      setSubject('');
      setRoom('');
      setTeacher('');
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteClass = async (id: string) => {
    if (!confirm('Remove this class from your timetable?')) return;
    try {
      await db.delete('timetable', id);
      await loadTimetable();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="state-container">
        <div className="state-loading-spinner" />
        <p>Loading schedule...</p>
      </div>
    );
  }

  return (
    <div className="module-container">
      <div className="module-header">
        <div>
          <h2 style={{ fontSize: '18px' }}>🏫 Academic Timetable</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Log and track lecture times and class locations.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddForm(true)}>
          ➕ Add Class
        </button>
      </div>

      <div className="module-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Current Class Banner */}
        {currentClass && (
          <div className="glass-panel floating-effect" style={{ borderLeft: `5px solid ${currentClass.color || 'var(--accent-color)'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(var(--accent-color-rgb), 0.08)' }}>
            <div>
              <span style={{ fontSize: '10px', background: 'var(--accent-color)', color: '#000', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>ONGOING CLASS</span>
              <h3 style={{ marginTop: '4px', fontSize: '18px' }}>{currentClass.subject}</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {currentClass.room ? `Room: ${currentClass.room}` : ''} {currentClass.teacher ? `| Prof. ${currentClass.teacher}` : ''}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '18px', fontWeight: 'bold' }}>
                {currentClass.timeStart} - {currentClass.timeEnd}
              </span>
            </div>
          </div>
        )}

        {/* Timetable Grid View */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {DAYS.map(d => {
            const dayClasses = items
              .filter(item => item.day === d)
              .sort((a, b) => a.timeStart.localeCompare(b.timeStart));

            return (
              <div key={d} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <h4 style={{ fontSize: '13px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '4px', color: 'var(--text-secondary)' }}>
                  {d}
                </h4>
                {dayClasses.length === 0 ? (
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', paddingLeft: '8px' }}>
                    No classes scheduled.
                  </p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
                    {dayClasses.map(c => (
                      <div
                        key={c.id}
                        style={{
                          padding: '10px',
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid var(--glass-border)',
                          borderRadius: '8px',
                          borderLeft: `4px solid ${c.color || 'var(--accent-color)'}`,
                          position: 'relative'
                        }}
                      >
                        <button
                          onClick={() => handleDeleteClass(c.id)}
                          style={{
                            position: 'absolute',
                            top: '4px',
                            right: '4px',
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                          title="Remove"
                        >
                          ×
                        </button>
                        <h5 style={{ fontSize: '13px', paddingRight: '12px' }}>{c.subject}</h5>
                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                          🕒 {c.timeStart} - {c.timeEnd}
                        </p>
                        {c.room && <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>📍 Room: {c.room}</p>}
                        {c.teacher && <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>👤 Prof: {c.teacher}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>

      {/* Add Class Form overlay modal */}
      {showAddForm && (
        <div className="launcher-overlay" onClick={() => setShowAddForm(false)}>
          <div className="launcher-window" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <h3 style={{ fontSize: '16px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px' }}>
              Add Timetable Schedule
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Subject / Lecture Name</label>
                <input
                  type="text"
                  className="input-field"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Advanced Calculus, OS Lecture"
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Weekday</label>
                <select className="select-field" value={day} onChange={(e) => setDay(e.target.value)}>
                  {DAYS.map(d => (
                    <option key={d} value={d} style={{ background: '#000' }}>{d}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Start Time</label>
                  <input
                    type="time"
                    className="input-field"
                    value={timeStart}
                    onChange={(e) => setTimeStart(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>End Time</label>
                  <input
                    type="time"
                    className="input-field"
                    value={timeEnd}
                    onChange={(e) => setTimeEnd(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Room No.</label>
                  <input
                    type="text"
                    className="input-field"
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    placeholder="e.g. Block B-302"
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Teacher / Professor</label>
                  <input
                    type="text"
                    className="input-field"
                    value={teacher}
                    onChange={(e) => setTeacher(e.target.value)}
                    placeholder="e.g. Dr. Jane Doe"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Tag Color</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['#00c3ff', '#10b981', '#f59e0b', '#ef4444', '#7b2cbf'].map(c => (
                    <div
                      key={c}
                      onClick={() => setColor(c)}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: c,
                        cursor: 'pointer',
                        border: color === c ? '2px solid #fff' : '2px solid transparent'
                      }}
                    />
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button className="btn" onClick={() => setShowAddForm(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSaveClass}>Save Class</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
