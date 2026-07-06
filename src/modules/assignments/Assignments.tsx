import React, { useState, useEffect } from 'react';
import { db } from '../../db/db';

interface Assignment {
  id: string;
  title: string;
  subject: string;
  dueDate: string; // YYYY-MM-DD
  status: 'todo' | 'progress' | 'submitted' | 'graded';
  priority: 'low' | 'medium' | 'high';
  notes?: string;
}

export const Assignments: React.FC = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [status, setStatus] = useState<'todo' | 'progress' | 'submitted' | 'graded'>('todo');
  const [notes, setNotes] = useState('');

  const loadAssignments = async () => {
    setLoading(true);
    try {
      const data = await db.getAll('assignments');
      setAssignments(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssignments();
  }, []);

  const handleSave = async () => {
    if (!title.trim() || !subject.trim() || !dueDate) return;

    const newItem: Assignment = {
      id: crypto.randomUUID(),
      title,
      subject,
      dueDate,
      priority,
      status,
      notes: notes || undefined
    };

    try {
      await db.put('assignments', newItem);
      await loadAssignments();
      setShowAddForm(false);
      
      // Reset form
      setTitle('');
      setSubject('');
      setDueDate('');
      setNotes('');
      setPriority('medium');
      setStatus('todo');
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this assignment tracker?')) return;
    try {
      await db.delete('assignments', id);
      await loadAssignments();
    } catch (e) {
      console.error(e);
    }
  };

  const handleStatusChange = async (item: Assignment, newStatus: Assignment['status']) => {
    const updated = { ...item, status: newStatus };
    try {
      await db.put('assignments', updated);
      await loadAssignments();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="state-container">
        <div className="state-loading-spinner" />
        <p>Loading assignments...</p>
      </div>
    );
  }

  // Filter columns
  const getStatusList = (statusType: Assignment['status']) => {
    return assignments
      .filter(a => a.status === statusType)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  };

  const renderAssignmentCard = (a: Assignment) => (
    <div
      key={a.id}
      style={{
        padding: '12px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid var(--glass-border)',
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        position: 'relative'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <h5 style={{ fontSize: '13px', paddingRight: '16px' }}>{a.title}</h5>
        <button
          onClick={() => handleDelete(a.id)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: '14px'
          }}
          title="Delete"
        >
          ×
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)' }}>
        <span>📚 {a.subject}</span>
        <span style={{
          color: a.priority === 'high' ? 'var(--error)' : a.priority === 'medium' ? 'var(--warning)' : 'var(--success)',
          fontWeight: 'bold'
        }}>
          {a.priority.toUpperCase()}
        </span>
      </div>

      {a.notes && <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>{a.notes}</p>}

      <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '6px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Due: {a.dueDate}</span>
        
        {/* Status toggler dropdown */}
        <select
          className="select-field"
          value={a.status}
          onChange={(e) => handleStatusChange(a, e.target.value as Assignment['status'])}
          style={{ width: '90px', padding: '2px 4px', fontSize: '10px' }}
        >
          <option value="todo" style={{ background: '#000' }}>To Do</option>
          <option value="progress" style={{ background: '#000' }}>In Progress</option>
          <option value="submitted" style={{ background: '#000' }}>Submitted</option>
          <option value="graded" style={{ background: '#000' }}>Graded</option>
        </select>
      </div>
    </div>
  );

  return (
    <div className="module-container">
      <div className="module-header">
        <div>
          <h2 style={{ fontSize: '18px' }}>✏️ Academic Assignments</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Organize homework, course works, exams, and quiz schedules.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddForm(true)}>
          ➕ Add Assignment
        </button>
      </div>

      <div className="module-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', overflowY: 'auto' }}>
        
        {/* TO DO */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ fontSize: '14px', borderBottom: '2px solid var(--error)', paddingBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
            <span>🔴 To Do</span>
            <span style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>
              {getStatusList('todo').length}
            </span>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
            {getStatusList('todo').map(renderAssignmentCard)}
          </div>
        </div>

        {/* IN PROGRESS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ fontSize: '14px', borderBottom: '2px solid var(--warning)', paddingBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
            <span>🟡 In Progress</span>
            <span style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>
              {getStatusList('progress').length}
            </span>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
            {getStatusList('progress').map(renderAssignmentCard)}
          </div>
        </div>

        {/* SUBMITTED */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ fontSize: '14px', borderBottom: '2px solid var(--info)', paddingBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
            <span>🔵 Submitted</span>
            <span style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>
              {getStatusList('submitted').length}
            </span>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
            {getStatusList('submitted').map(renderAssignmentCard)}
          </div>
        </div>

        {/* GRADED */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ fontSize: '14px', borderBottom: '2px solid var(--success)', paddingBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
            <span>🟢 Graded</span>
            <span style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>
              {getStatusList('graded').length}
            </span>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
            {getStatusList('graded').map(renderAssignmentCard)}
          </div>
        </div>

      </div>

      {/* Add Assignment Form overlay modal */}
      {showAddForm && (
        <div className="launcher-overlay" onClick={() => setShowAddForm(false)}>
          <div className="launcher-window" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <h3 style={{ fontSize: '16px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px' }}>
              Log Assignment
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Assignment Title</label>
                <input
                  type="text"
                  className="input-field"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Lab Report 4, Reading Quiz"
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Subject / Course</label>
                <input
                  type="text"
                  className="input-field"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Chemistry, Computer Networks"
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Due Date</label>
                <input
                  type="date"
                  className="input-field"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Priority</label>
                  <select
                    className="select-field"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                  >
                    <option value="low" style={{ background: '#000' }}>Low</option>
                    <option value="medium" style={{ background: '#000' }}>Medium</option>
                    <option value="high" style={{ background: '#000' }}>High</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Initial Status</label>
                  <select
                    className="select-field"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                  >
                    <option value="todo" style={{ background: '#000' }}>To Do</option>
                    <option value="progress" style={{ background: '#000' }}>In Progress</option>
                    <option value="submitted" style={{ background: '#000' }}>Submitted</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Notes / Criteria details</label>
                <textarea
                  className="textarea-field"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Grading criteria, rubrics, link bookmarks..."
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button className="btn" onClick={() => setShowAddForm(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSave}>Save Assignment</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
