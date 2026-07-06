import React, { useState, useEffect } from 'react';
import { db } from '../../db/db';

interface ProjectTask {
  id: string;
  title: string;
  status: 'todo' | 'progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high';
  startDay: number; // 0 to 14 (offsets for Gantt)
  duration: number; // days
}

interface Project {
  id: string;
  name: string;
  tasks: ProjectTask[];
}

export const ProjectManager: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'board' | 'gantt'>('board');

  // Project form
  const [showAddProject, setShowAddProject] = useState(false);
  const [projectName, setProjectName] = useState('');

  // Task form
  const [showAddTask, setShowAddTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskPriority, setTaskPriority] = useState<ProjectTask['priority']>('medium');
  const [taskStatus, setTaskStatus] = useState<ProjectTask['status']>('todo');
  const [startDay, setStartDay] = useState(0);
  const [duration, setDuration] = useState(3);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await db.getAll('projects');
      setProjects(data);
      if (data.length > 0 && !activeProject) {
        setActiveProject(data[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateProject = async () => {
    if (!projectName.trim()) return;
    const newProj: Project = {
      id: crypto.randomUUID(),
      name: projectName,
      tasks: []
    };
    try {
      await db.put('projects', newProj);
      setProjectName('');
      setShowAddProject(false);
      await loadData();
      setActiveProject(newProj);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm('Delete this project workspace?')) return;
    try {
      await db.delete('projects', id);
      const remaining = projects.filter(p => p.id !== id);
      setProjects(remaining);
      setActiveProject(remaining.length > 0 ? remaining[0] : null);
      await loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateTask = async () => {
    if (!taskTitle.trim() || !activeProject) return;

    const newTask: ProjectTask = {
      id: crypto.randomUUID(),
      title: taskTitle,
      status: taskStatus,
      priority: taskPriority,
      startDay,
      duration
    };

    const updatedProj: Project = {
      ...activeProject,
      tasks: [...activeProject.tasks, newTask]
    };

    try {
      await db.put('projects', updatedProj);
      // Sync local states
      setProjects(prev => prev.map(p => p.id === activeProject.id ? updatedProj : p));
      setActiveProject(updatedProj);
      
      setTaskTitle('');
      setShowAddTask(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!activeProject) return;
    const updatedTasks = activeProject.tasks.filter(t => t.id !== taskId);
    const updatedProj = { ...activeProject, tasks: updatedTasks };

    try {
      await db.put('projects', updatedProj);
      setProjects(prev => prev.map(p => p.id === activeProject.id ? updatedProj : p));
      setActiveProject(updatedProj);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateTaskStatus = async (task: ProjectTask, status: ProjectTask['status']) => {
    if (!activeProject) return;
    const updatedTasks = activeProject.tasks.map(t => t.id === task.id ? { ...t, status } : t);
    const updatedProj = { ...activeProject, tasks: updatedTasks };

    try {
      await db.put('projects', updatedProj);
      setProjects(prev => prev.map(p => p.id === activeProject.id ? updatedProj : p));
      setActiveProject(updatedProj);
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="state-container">
        <div className="state-loading-spinner" />
        <p>Loading project boards...</p>
      </div>
    );
  }

  // Columns definition
  const columns: { id: ProjectTask['status']; title: string; color: string }[] = [
    { id: 'todo', title: 'To Do', color: 'var(--error)' },
    { id: 'progress', title: 'In Progress', color: 'var(--warning)' },
    { id: 'review', title: 'In Review', color: 'var(--info)' },
    { id: 'done', title: 'Done', color: 'var(--success)' }
  ];

  // Custom Gantt Chart renderer
  const renderGanttChart = () => {
    if (!activeProject || activeProject.tasks.length === 0) return null;

    const W = 32; // Column width per day
    const rowH = 36; // Height of each row
    const days = Array.from({ length: 15 }, (_, i) => i); // 15 day grid view
    const colors = ['#00c3ff', '#10b981', '#f59e0b', '#7b2cbf', '#ef4444'];

    return (
      <div style={{ overflowX: 'auto', background: 'rgba(0,0,0,0.15)', padding: '16px', borderRadius: '10px', border: '1px solid var(--glass-border)' }}>
        <svg width={200 + days.length * W} height={40 + activeProject.tasks.length * rowH} style={{ display: 'block' }}>
          
          {/* Day Grid Lines */}
          {days.map(day => (
            <g key={day}>
              <line 
                x1={200 + day * W} 
                y1="0" 
                x2={200 + day * W} 
                y2={40 + activeProject.tasks.length * rowH} 
                stroke="rgba(255,255,255,0.03)" 
                strokeWidth="1"
              />
              <text x={200 + day * W + W/2} y="20" fill="var(--text-secondary)" fontSize="10" textAnchor="middle" fontFamily="var(--font-mono)">
                D{day + 1}
              </text>
            </g>
          ))}

          <line x1="200" y1="30" x2={200 + days.length * W} y2="30" stroke="var(--glass-border)" strokeWidth="1.5" />

          {/* Task bars */}
          {activeProject.tasks.map((task, index) => {
            const y = 40 + index * rowH;
            const barX = 200 + task.startDay * W;
            const barW = task.duration * W;
            const taskColor = colors[index % colors.length];

            return (
              <g key={task.id}>
                {/* Task Label on left column */}
                <text x="10" y={y + 14} fill="var(--text-primary)" fontSize="11" fontWeight="500">
                  {task.title.substring(0, 24)}
                </text>

                {/* Duration bar */}
                <rect 
                  x={barX} 
                  y={y} 
                  width={barW} 
                  height="20" 
                  rx="4" 
                  fill={taskColor} 
                  opacity="0.85" 
                  style={{ cursor: 'pointer' }}
                />

                <text x={barX + 6} y={y + 14} fill="#000" fontSize="9" fontWeight="bold">
                  {task.duration}d
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  return (
    <div className="module-container" style={{ flexDirection: 'row' }}>
      
      {/* Sidebar: Projects */}
      <div className="module-sidebar" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ padding: '12px', borderBottom: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setShowAddProject(true)}>
            ➕ New Project
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {projects.map(p => (
            <div
              key={p.id}
              style={{
                padding: '10px 12px',
                borderBottom: '1px solid var(--glass-border)',
                cursor: 'pointer',
                background: activeProject?.id === p.id ? 'rgba(255,255,255,0.05)' : 'transparent',
                fontSize: '13px'
              }}
              onClick={() => {
                setActiveProject(p);
                setViewMode('board');
              }}
            >
              🗂️ {p.name}
            </div>
          ))}
        </div>
      </div>

      {/* Main Board Workspace */}
      <div className="module-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0 }}>
        {activeProject ? (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            
            {/* Header / View selector */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '18px' }}>{activeProject.name}</h3>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn"
                  style={{ background: viewMode === 'board' ? 'rgba(var(--accent-color-rgb), 0.15)' : 'transparent', borderColor: viewMode === 'board' ? 'var(--accent-color)' : 'var(--glass-border)' }}
                  onClick={() => setViewMode('board')}
                >
                  📋 Board View
                </button>
                <button
                  className="btn"
                  style={{ background: viewMode === 'gantt' ? 'rgba(var(--accent-color-rgb), 0.15)' : 'transparent', borderColor: viewMode === 'gantt' ? 'var(--accent-color)' : 'var(--glass-border)' }}
                  onClick={() => setViewMode('gantt')}
                >
                  📊 Gantt Timeline
                </button>
                <button className="btn btn-primary" onClick={() => setShowAddTask(true)}>
                  ➕ Add Task
                </button>
                <button className="btn btn-danger" onClick={() => handleDeleteProject(activeProject.id)}>
                  Delete Project
                </button>
              </div>
            </div>

            {/* Content view toggled */}
            <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
              {viewMode === 'board' ? (
                
                /* KANBAN BOARD */
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                  {columns.map(col => {
                    const list = activeProject.tasks.filter(t => t.status === col.id);

                    return (
                      <div key={col.id} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <h4 style={{ fontSize: '13px', borderBottom: `2px solid ${col.color}`, paddingBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                          <span>{col.title}</span>
                          <span style={{ background: 'rgba(255,255,255,0.05)', padding: '1px 5px', borderRadius: '3px', fontSize: '10px' }}>{list.length}</span>
                        </h4>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {list.map(task => (
                            <div
                              key={task.id}
                              style={{
                                padding: '10px',
                                background: 'rgba(255,255,255,0.02)',
                                border: '1px solid var(--glass-border)',
                                borderRadius: '8px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px',
                                position: 'relative'
                              }}
                            >
                              <button
                                onClick={() => handleDeleteTask(task.id)}
                                style={{ position: 'absolute', top: '4px', right: '4px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '12px' }}
                              >
                                ×
                              </button>
                              <h5 style={{ fontSize: '13px', paddingRight: '12px' }}>{task.title}</h5>
                              
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                <span>⌛ {task.duration} days</span>
                                <span style={{
                                  color: task.priority === 'high' ? 'var(--error)' : task.priority === 'medium' ? 'var(--warning)' : 'var(--success)',
                                  fontWeight: 'bold'
                                }}>
                                  {task.priority.toUpperCase()}
                                </span>
                              </div>

                              <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '6px', marginTop: '6px', display: 'flex', justifyContent: 'flex-end' }}>
                                <select
                                  className="select-field"
                                  value={task.status}
                                  onChange={(e) => handleUpdateTaskStatus(task, e.target.value as any)}
                                  style={{ width: '90px', padding: '1px', fontSize: '9px' }}
                                >
                                  <option value="todo" style={{ background: '#000' }}>To Do</option>
                                  <option value="progress" style={{ background: '#000' }}>In Progress</option>
                                  <option value="review" style={{ background: '#000' }}>Review</option>
                                  <option value="done" style={{ background: '#000' }}>Done</option>
                                </select>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* GANTT TIMELINE */
                renderGanttChart()
              )}
            </div>

          </div>
        ) : (
          <div className="state-container" style={{ flex: 1 }}>
            <span className="state-icon">🗂️</span>
            <h4>No Project Workspace Selected</h4>
            <p style={{ color: 'var(--text-secondary)' }}>Select a project from the sidebar or build a new workflow.</p>
          </div>
        )}
      </div>

      {/* Add Project Modal */}
      {showAddProject && (
        <div className="launcher-overlay" onClick={() => setShowAddProject(false)}>
          <div className="launcher-window" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <h3 style={{ fontSize: '16px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px' }}>Create Project Workspace</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Project Name</label>
                <input
                  type="text"
                  className="input-field"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g. Capstone Research, App Dev"
                />
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button className="btn" onClick={() => setShowAddProject(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleCreateProject}>Create Project</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      {showAddTask && (
        <div className="launcher-overlay" onClick={() => setShowAddTask(false)}>
          <div className="launcher-window" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <h3 style={{ fontSize: '16px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px' }}>Add Workspace Task</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Task Title</label>
                <input
                  type="text"
                  className="input-field"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g. Draft UI Wireframes"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Priority</label>
                  <select className="select-field" value={taskPriority} onChange={(e) => setTaskPriority(e.target.value as any)}>
                    <option value="low" style={{ background: '#000' }}>Low</option>
                    <option value="medium" style={{ background: '#000' }}>Medium</option>
                    <option value="high" style={{ background: '#000' }}>High</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Status Stage</label>
                  <select className="select-field" value={taskStatus} onChange={(e) => setTaskStatus(e.target.value as any)}>
                    <option value="todo" style={{ background: '#000' }}>To Do</option>
                    <option value="progress" style={{ background: '#000' }}>In Progress</option>
                    <option value="review" style={{ background: '#000' }}>Review</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Start Day Offset (0-14)</label>
                  <input
                    type="number"
                    className="input-field"
                    value={startDay}
                    onChange={(e) => setStartDay(Math.max(0, Math.min(14, parseInt(e.target.value) || 0)))}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Duration (days)</label>
                  <input
                    type="number"
                    className="input-field"
                    value={duration}
                    onChange={(e) => setDuration(Math.max(1, parseInt(e.target.value) || 1))}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button className="btn" onClick={() => setShowAddTask(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleCreateTask}>Save Task</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
