import React, { useState, useEffect } from 'react';
import { db } from '../../db/db';

interface JobApplication {
  id: string;
  company: string;
  role: string;
  status: 'applied' | 'interviewing' | 'offered' | 'rejected';
  date: string;
  notes?: string;
}

interface ResumeData {
  id: string;
  profileName: string;
  name: string;
  email: string;
  phone: string;
  summary: string;
  education: string;
  experience: string;
  skills: string;
}

const DEFAULT_RESUME: ResumeData = {
  id: 'master_resume',
  profileName: 'Master Scholar Resume',
  name: 'Scholar Student',
  email: 'scholar@university.edu',
  phone: '+1 (555) 019-2834',
  summary: 'Dedicated engineering student with strong fundamentals in algorithms, frontend layouts, and offline application development.',
  education: '- B.S. in Computer Science, University of Technology (GPA: 3.9/4.0) | 2023 - 2027',
  experience: '- Frontend Intern at TechSolutions | Summer 2025\n- Coding Club Lead, University Campus | 2024 - Present',
  skills: 'React, TypeScript, CSS Variables, IndexedDB, Git, UI/UX Prototyping'
};

export const CareerHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'tracker' | 'resume'>('tracker');
  const [jobs, setJobs] = useState<JobApplication[]>([]);
  const [resume, setResume] = useState<ResumeData>(DEFAULT_RESUME);
  const [loading, setLoading] = useState(true);

  // Job form states
  const [showAddJob, setShowAddJob] = useState(false);
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [jobStatus, setJobStatus] = useState<JobApplication['status']>('applied');
  const [jobDate, setJobDate] = useState('');
  const [jobNotes, setJobNotes] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const allJobs = await db.getAll('career_jobs');
      setJobs(allJobs);

      const savedResume = await db.get('career_resume', 'master_resume');
      if (savedResume) {
        setResume(savedResume as any);
      } else {
        const scholarName = localStorage.getItem('lakshya_scholar_name') || '';
        const initialResume: ResumeData = {
          id: 'master_resume',
          profileName: 'Master Scholar Resume',
          name: scholarName || 'Your Name',
          email: scholarName ? `${scholarName.toLowerCase().replace(/\s+/g, '')}@university.edu` : 'your.email@university.edu',
          phone: '',
          summary: '',
          education: '',
          experience: '',
          skills: ''
        };
        setResume(initialResume);
        await db.put('career_resume', initialResume as any);
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

  const handleSaveJob = async () => {
    if (!company.trim() || !role.trim() || !jobDate) return;

    const newJob: JobApplication = {
      id: crypto.randomUUID(),
      company,
      role,
      status: jobStatus,
      date: jobDate,
      notes: jobNotes || undefined
    };

    try {
      await db.put('career_jobs', newJob);
      await loadData();
      setShowAddJob(false);
      setCompany('');
      setRole('');
      setJobNotes('');
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteJob = async (id: string) => {
    if (!confirm('Remove this job application?')) return;
    try {
      await db.delete('career_jobs', id);
      await loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateJobStatus = async (job: JobApplication, status: JobApplication['status']) => {
    const updated = { ...job, status };
    try {
      await db.put('career_jobs', updated);
      await loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveResume = async () => {
    try {
      await db.put('career_resume', resume as any);
      alert('Resume saved locally inside browser sandbox!');
    } catch (e) {
      console.error(e);
    }
  };

  const handlePrintResume = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <html>
        <head>
          <title>${resume.name} - Resume</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; color: #333; line-height: 1.6; }
            h1 { text-align: center; margin-bottom: 5px; text-transform: uppercase; }
            .contact { text-align: center; margin-bottom: 25px; font-size: 14px; color: #555; }
            h2 { border-bottom: 2px solid #333; padding-bottom: 5px; font-size: 18px; margin-top: 25px; text-transform: uppercase; }
            p, li { font-size: 14px; }
            ul { padding-left: 20px; }
            .section-content { white-space: pre-line; font-size: 14px; margin-left: 5px; }
          </style>
        </head>
        <body>
          <h1>${resume.name}</h1>
          <div class="contact">${resume.email} | ${resume.phone}</div>
          
          <h2>Summary</h2>
          <p>${resume.summary}</p>
          
          <h2>Education</h2>
          <div class="section-content">${resume.education}</div>
          
          <h2>Experience</h2>
          <div class="section-content">${resume.experience}</div>
          
          <h2>Key Skills</h2>
          <p>${resume.skills}</p>
        </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  if (loading) {
    return (
      <div className="state-container">
        <div className="state-loading-spinner" />
        <p>Loading career services...</p>
      </div>
    );
  }

  const columns: { id: JobApplication['status']; title: string; color: string }[] = [
    { id: 'applied', title: 'Applied 📬', color: 'var(--info)' },
    { id: 'interviewing', title: 'Interviewing 💬', color: 'var(--warning)' },
    { id: 'offered', title: 'Offered 🎉', color: 'var(--success)' },
    { id: 'rejected', title: 'Rejected ❌', color: 'var(--error)' }
  ];

  return (
    <div className="module-container">
      {/* Module Navigation Tabs */}
      <div className="module-header" style={{ padding: '8px 16px', background: 'rgba(0,0,0,0.15)', justifyContent: 'flex-start', gap: '8px' }}>
        <button
          className="btn"
          style={{ background: activeTab === 'tracker' ? 'rgba(var(--accent-color-rgb), 0.2)' : 'transparent', color: activeTab === 'tracker' ? 'var(--accent-color)' : 'inherit', border: 'none' }}
          onClick={() => setActiveTab('tracker')}
        >
          📂 Job/Internship Tracker
        </button>
        <button
          className="btn"
          style={{ background: activeTab === 'resume' ? 'rgba(var(--accent-color-rgb), 0.2)' : 'transparent', color: activeTab === 'resume' ? 'var(--accent-color)' : 'inherit', border: 'none' }}
          onClick={() => setActiveTab('resume')}
        >
          📝 Resume Builder
        </button>
      </div>

      <div className="module-body" style={{ overflowY: 'auto' }}>
        
        {/* TAB 1: KANBAN TRACKER */}
        {activeTab === 'tracker' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '15px' }}>Application Funnel</h3>
              <button className="btn btn-primary" onClick={() => setShowAddJob(true)}>➕ Add Application</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', flex: 1, minHeight: '350px' }}>
              {columns.map(col => {
                const list = jobs.filter(j => j.status === col.id);

                return (
                  <div key={col.id} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <h4 style={{ fontSize: '13px', borderBottom: `2px solid ${col.color}`, paddingBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{col.title}</span>
                      <span style={{ background: 'rgba(255,255,255,0.05)', padding: '1px 5px', borderRadius: '3px', fontSize: '10px' }}>{list.length}</span>
                    </h4>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto' }}>
                      {list.map(job => (
                        <div
                          key={job.id}
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
                            onClick={() => handleDeleteJob(job.id)}
                            style={{ position: 'absolute', top: '4px', right: '4px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '12px' }}
                          >
                            ×
                          </button>
                          <h5 style={{ fontSize: '13px', paddingRight: '12px' }}>{job.company}</h5>
                          <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{job.role}</p>
                          <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Date: {job.date}</span>

                          {job.notes && <p style={{ fontSize: '10px', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '2px' }}>{job.notes}</p>}

                          <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '6px', marginTop: '6px', display: 'flex', justifyContent: 'flex-end' }}>
                            <select
                              className="select-field"
                              value={job.status}
                              onChange={(e) => handleUpdateJobStatus(job, e.target.value as any)}
                              style={{ width: '100px', padding: '2px', fontSize: '9px' }}
                            >
                              <option value="applied" style={{ background: '#000' }}>Applied</option>
                              <option value="interviewing" style={{ background: '#000' }}>Interview</option>
                              <option value="offered" style={{ background: '#000' }}>Offered</option>
                              <option value="rejected" style={{ background: '#000' }}>Rejected</option>
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: RESUME BUILDER */}
        {activeTab === 'resume' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            
            {/* Editor form */}
            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ fontSize: '15px', color: 'var(--accent-color)' }}>Resume Information</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Full Name</label>
                  <input type="text" className="input-field" value={resume.name} onChange={(e) => setResume({ ...resume, name: e.target.value })} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Email Address</label>
                  <input type="email" className="input-field" value={resume.email} onChange={(e) => setResume({ ...resume, email: e.target.value })} />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Phone Number</label>
                <input type="text" className="input-field" value={resume.phone} onChange={(e) => setResume({ ...resume, phone: e.target.value })} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Professional Summary</label>
                <textarea className="textarea-field" rows={2} value={resume.summary} onChange={(e) => setResume({ ...resume, summary: e.target.value })} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Education (Markdown list)</label>
                <textarea className="textarea-field" rows={3} value={resume.education} onChange={(e) => setResume({ ...resume, education: e.target.value })} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Experience (Markdown list)</label>
                <textarea className="textarea-field" rows={4} value={resume.experience} onChange={(e) => setResume({ ...resume, experience: e.target.value })} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Technical Skills (Comma separated)</label>
                <input type="text" className="input-field" value={resume.skills} onChange={(e) => setResume({ ...resume, skills: e.target.value })} />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSaveResume}>💾 Save Data</button>
                <button className="btn" style={{ flex: 1 }} onClick={handlePrintResume}>🖨️ Export PDF/Print</button>
              </div>
            </div>

            {/* Live visual compiler preview */}
            <div className="glass-panel" style={{ background: '#fff', color: '#333', padding: '24px', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', overflowY: 'auto', maxHeight: '550px', fontSize: '12px', lineHeight: '1.5' }}>
              <h1 style={{ textAlign: 'center', fontSize: '20px', color: '#111', textTransform: 'uppercase', marginBottom: '4px' }}>{resume.name}</h1>
              <div style={{ textAlign: 'center', color: '#666', borderBottom: '1.5px solid #111', paddingBottom: '10px', marginBottom: '16px' }}>
                {resume.email} | {resume.phone}
              </div>

              <h2 style={{ fontSize: '13px', borderBottom: '1px solid #666', paddingBottom: '3px', color: '#111', textTransform: 'uppercase', marginTop: '14px' }}>Summary</h2>
              <p style={{ marginTop: '6px' }}>{resume.summary}</p>

              <h2 style={{ fontSize: '13px', borderBottom: '1px solid #666', paddingBottom: '3px', color: '#111', textTransform: 'uppercase', marginTop: '14px' }}>Education</h2>
              <div style={{ whiteSpace: 'pre-line', marginTop: '6px' }}>{resume.education}</div>

              <h2 style={{ fontSize: '13px', borderBottom: '1px solid #666', paddingBottom: '3px', color: '#111', textTransform: 'uppercase', marginTop: '14px' }}>Experience</h2>
              <div style={{ whiteSpace: 'pre-line', marginTop: '6px' }}>{resume.experience}</div>

              <h2 style={{ fontSize: '13px', borderBottom: '1px solid #666', paddingBottom: '3px', color: '#111', textTransform: 'uppercase', marginTop: '14px' }}>Skills</h2>
              <p style={{ marginTop: '6px' }}>{resume.skills}</p>
            </div>

          </div>
        )}

      </div>

      {/* Add Job Modal */}
      {showAddJob && (
        <div className="launcher-overlay" onClick={() => setShowAddJob(false)}>
          <div className="launcher-window" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <h3 style={{ fontSize: '16px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px' }}>Track Job Application</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Company Name</label>
                <input type="text" className="input-field" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g. Google, Stripe" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Job Role / Title</label>
                <input type="text" className="input-field" value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Frontend Engineer Intern" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Stage Status</label>
                  <select className="select-field" value={jobStatus} onChange={(e) => setJobStatus(e.target.value as any)}>
                    <option value="applied" style={{ background: '#000' }}>Applied</option>
                    <option value="interviewing" style={{ background: '#000' }}>Interviewing</option>
                    <option value="offered" style={{ background: '#000' }}>Offered</option>
                    <option value="rejected" style={{ background: '#000' }}>Rejected</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Date Logged</label>
                  <input type="date" className="input-field" value={jobDate} onChange={(e) => setJobDate(e.target.value)} />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Notes / Application Link</label>
                <textarea className="textarea-field" rows={3} value={jobNotes} onChange={(e) => setJobNotes(e.target.value)} placeholder="Interview format, referrers, follow-up dates..." />
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button className="btn" onClick={() => setShowAddJob(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSaveJob}>Track Job</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
