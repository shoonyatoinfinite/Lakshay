import React, { useState, useEffect } from 'react';
import { db } from '../../db/db';

interface ResourceItem {
  id: string;
  title: string;
  url?: string;
  type: 'link' | 'file';
  fileBlob?: Blob;
  fileName?: string;
  fileType?: string;
  dateAdded: number;
}

export const Resources: React.FC = () => {
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'link' | 'file'>('link');
  const [url, setUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const loadResources = async () => {
    setLoading(true);
    try {
      const data = await db.getAll('resources');
      setResources(data.sort((a, b) => b.dateAdded - a.dateAdded));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResources();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!title) {
        setTitle(file.name.substring(0, file.name.lastIndexOf('.')) || file.name);
      }
    }
  };

  const handleSave = async () => {
    if (!title.trim()) return;

    let newItem: ResourceItem = {
      id: crypto.randomUUID(),
      title,
      type,
      dateAdded: Date.now()
    };

    if (type === 'link') {
      if (!url.trim()) return;
      // Add standard http protocol prefix if missing
      let formattedUrl = url.trim();
      if (!/^https?:\/\//i.test(formattedUrl)) {
        formattedUrl = `https://${formattedUrl}`;
      }
      newItem.url = formattedUrl;
    } else {
      if (!selectedFile) return;
      newItem.fileName = selectedFile.name;
      newItem.fileType = selectedFile.type;
      newItem.fileBlob = selectedFile; // A File object extends Blob natively in browsers!
    }

    try {
      await db.put('resources', newItem);
      await loadResources();
      setShowAddForm(false);
      
      // Reset
      setTitle('');
      setUrl('');
      setSelectedFile(null);
    } catch (e) {
      console.error('Failed to save resource', e);
      alert('Failed to save resource. The file size might exceed IndexedDB capacity constraints.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this resource?')) return;
    try {
      await db.delete('resources', id);
      await loadResources();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownloadFile = (item: ResourceItem) => {
    if (item.type !== 'file' || !item.fileBlob) return;
    
    try {
      const downloadUrl = URL.createObjectURL(item.fileBlob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = item.fileName || 'resource_download';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Download failed', err);
    }
  };

  if (loading) {
    return (
      <div className="state-container">
        <div className="state-loading-spinner" />
        <p>Opening cabinet drawer...</p>
      </div>
    );
  }

  return (
    <div className="module-container">
      <div className="module-header">
        <div>
          <h2 style={{ fontSize: '18px' }}>📚 Resource Cabinet & File Locker</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Bookmark syllabus URLs or store textbook PDFs locally inside the browser's sandbox.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddForm(true)}>
          ➕ Add Resource
        </button>
      </div>

      <div className="module-body" style={{ overflowY: 'auto' }}>
        {resources.length === 0 ? (
          <div className="state-container">
            <span className="state-icon">📚</span>
            <h4>No Reference Materials Logged</h4>
            <p style={{ color: 'var(--text-secondary)' }}>Upload course slides or link external study tools.</p>
            <button className="btn btn-primary" style={{ marginTop: '12px' }} onClick={() => setShowAddForm(true)}>
              Upload First File
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {resources.map(item => (
              <div
                key={item.id}
                className="glass-panel"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  borderLeft: `4px solid ${item.type === 'file' ? 'var(--accent-color)' : 'var(--success)'}`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h4 style={{ fontSize: '14px', wordBreak: 'break-all' }}>{item.title}</h4>
                  <button
                    onClick={() => handleDelete(item.id)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '16px' }}
                  >
                    ×
                  </button>
                </div>

                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Type: <strong>{item.type === 'file' ? '💾 Local Attachment' : '🌐 Hyperlink bookmark'}</strong>
                </div>

                {item.type === 'file' && item.fileName && (
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    File: {item.fileName}
                  </p>
                )}

                <div style={{ marginTop: '8px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  {item.type === 'file' ? (
                    <button className="btn btn-primary" style={{ padding: '4px 12px', fontSize: '11px' }} onClick={() => handleDownloadFile(item)}>
                      ⬇️ Download
                    </button>
                  ) : (
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ padding: '4px 12px', fontSize: '11px', textDecoration: 'none' }}>
                      🔗 Open URL
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Resource Modal */}
      {showAddForm && (
        <div className="launcher-overlay" onClick={() => setShowAddForm(false)}>
          <div className="launcher-window" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <h3 style={{ fontSize: '16px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px' }}>Add Resource Material</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                <label style={{ display: 'flex', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input type="radio" checked={type === 'link'} onChange={() => setType('link')} style={{ accentColor: 'var(--accent-color)' }} />
                  Web Bookmark
                </label>
                <label style={{ display: 'flex', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input type="radio" checked={type === 'file'} onChange={() => setType('file')} style={{ accentColor: 'var(--accent-color)' }} />
                  Local File Attachment
                </label>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Resource Title</label>
                <input
                  type="text"
                  className="input-field"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Physics Formula Sheet"
                />
              </div>

              {type === 'link' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Web Link URL</label>
                  <input
                    type="text"
                    className="input-field"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="e.g. example.com/syllabus.pdf"
                  />
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Choose File Attachment</label>
                  <input
                    type="file"
                    className="input-field"
                    onChange={handleFileChange}
                    style={{ padding: '6px' }}
                  />
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Files are saved completely local to browser IndexedDB store.</span>
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button className="btn" onClick={() => setShowAddForm(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSave}>Save Resource</button>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};
