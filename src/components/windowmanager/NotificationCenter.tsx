import React, { useState, useEffect } from 'react';
import { db } from '../../db/db';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AlertItem {
  id: string;
  type: 'danger' | 'warning' | 'info' | 'success';
  title: string;
  desc: string;
  timestamp: string;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ isOpen, onClose }) => {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(false);

  const compileAlerts = async () => {
    setLoading(true);
    try {
      const compiled: AlertItem[] = [];

      // 1. Check Assignments due in next 48 hours
      const assignments = await db.getAll('assignments');
      const nowTime = Date.now();
      
      assignments.forEach(a => {
        if (a.status !== 'submitted' && a.status !== 'graded') {
          const dueTime = new Date(a.dueDate).getTime();
          const hoursLeft = (dueTime - nowTime) / (1000 * 60 * 60);

          if (hoursLeft > 0 && hoursLeft <= 48) {
            compiled.push({
              id: `assign-${a.id}`,
              type: 'danger',
              title: 'Deadline Approaching ⏰',
              desc: `"${a.title}" is due in ${Math.round(hoursLeft)} hours!`,
              timestamp: 'Now'
            });
          }
        }
      });

      // 2. Check Attendance warnings
      const attendance = await db.getAll('attendance');
      attendance.forEach(att => {
        const rate = att.total > 0 ? (att.attended / att.total) * 100 : 100;
        if (rate < att.target) {
          compiled.push({
            id: `att-${att.id}`,
            type: 'warning',
            title: 'Low Attendance warning ⚠️',
            desc: `${att.subject} is at ${Math.round(rate)}% (target: ${att.target}%)`,
            timestamp: 'Alert'
          });
        }
      });

      // 3. Habit reminder
      const habits = await db.getAll('habits');
      const todayStr = new Date().toISOString().slice(0, 10);
      
      const pendingHabits = habits.filter(h => !h.datesCompleted.includes(todayStr));
      if (pendingHabits.length > 0) {
        compiled.push({
          id: 'habits-due',
          type: 'info',
          title: 'Daily habits Pending 🌱',
          desc: `You have ${pendingHabits.length} habits left to log today!`,
          timestamp: 'Daily'
        });
      }

      // Add basic welcome logs if empty
      if (compiled.length === 0) {
        compiled.push({
          id: 'welcome-log',
          type: 'success',
          title: 'All Systems Clear! 🚀',
          desc: 'No urgent deadlines or low attendance alerts. Keep up the great work!',
          timestamp: 'Today'
        });
      }

      setAlerts(compiled);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      compileAlerts();
    }
  }, [isOpen]);

  // Global key listener Ctrl+N to toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        if (isOpen) onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <div 
      className={`notification-center-drawer ${isOpen ? 'open' : ''}`}
      style={{
        position: 'fixed',
        right: 0,
        top: '40px',
        bottom: '60px',
        width: '320px',
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(20px)',
        borderLeft: '1px solid var(--glass-border)',
        boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.4)',
        zIndex: 999,
        transform: isOpen ? 'translateX(0)' : 'translateX(340px)',
        transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      <div 
        style={{
          padding: '16px',
          borderBottom: '1px solid var(--glass-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <h3 style={{ fontSize: '15px', fontWeight: 'bold' }}>🔔 Alert Center</h3>
        <button 
          className="btn" 
          style={{ padding: '2px 8px', fontSize: '11px' }}
          onClick={onClose}
        >
          Close
        </button>
      </div>

      <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Analyzing vault...</div>
        ) : (
          alerts.map(a => (
            <div 
              key={a.id} 
              className="glass-panel" 
              style={{ 
                padding: '12px', 
                borderLeft: `4px solid ${
                  a.type === 'danger' ? 'var(--error)' : 
                  a.type === 'warning' ? 'var(--warning)' : 
                  a.type === 'success' ? 'var(--success)' : 'var(--info)'
                }`,
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                background: 'rgba(0,0,0,0.15)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 'bold' }}>
                <span style={{ color: a.type === 'danger' ? 'var(--error)' : 'inherit' }}>{a.title}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '9px' }}>{a.timestamp}</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                {a.desc}
              </p>
            </div>
          ))
        )}
      </div>

      <div style={{ padding: '10px 16px', borderTop: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Shortcut: Ctrl + N</span>
        <button className="btn" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={compileAlerts}>🔄 Refresh</button>
      </div>
    </div>
  );
};
