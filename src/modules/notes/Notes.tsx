import React, { useState, useEffect } from 'react';
import { db } from '../../db/db';

interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  updatedAt: number;
  folder?: string;
}

// Simple markdown preview parser to avoid loading bulky NPM parsers offline
const parseMarkdown = (markdown: string): string => {
  let html = markdown
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Headings
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  // Bold / Italic
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');
  html = html.replace(/_(.*?)_/g, '<em>$1</em>');

  // Code Block
  html = html.replace(/```([\s\S]*?)```/g, '<pre class="markdown-code"><code>$1</code></pre>');
  html = html.replace(/`(.*?)`/g, '<code>$1</code>');

  // Bullet Lists
  html = html.replace(/^\s*-\s+(.*$)/gim, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');

  // Line breaks
  html = html.replace(/\n$/gim, '<br />');

  return html;
};

export const Notes: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Form states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  const loadNotes = async () => {
    try {
      const data = await db.getAll('notes');
      const sorted = data.sort((a, b) => b.updatedAt - a.updatedAt);
      setNotes(sorted);
      
      if (sorted.length > 0 && !activeNote) {
        setActiveNote(sorted[0]);
      }
    } catch (e) {
      console.error('Failed to load notes', e);
    }
  };

  useEffect(() => {
    loadNotes();
  }, []);

  useEffect(() => {
    if (activeNote) {
      setTitle(activeNote.title);
      setContent(activeNote.content);
      setTags(activeNote.tags);
    } else {
      setTitle('');
      setContent('');
      setTags([]);
    }
  }, [activeNote]);

  const handleCreateNote = () => {
    const newNote: Note = {
      id: crypto.randomUUID(),
      title: 'Untitled Note',
      content: '# Untitled Note\n\nStart writing notes here...',
      tags: [],
      updatedAt: Date.now()
    };
    setActiveNote(newNote);
    setIsEditing(true);
  };

  const handleSaveNote = async () => {
    if (!title.trim()) return;

    const updatedNote: Note = {
      id: activeNote?.id || crypto.randomUUID(),
      title,
      content,
      tags,
      updatedAt: Date.now()
    };

    try {
      await db.put('notes', updatedNote);
      await loadNotes();
      setActiveNote(updatedNote);
      setIsEditing(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteNote = async (id: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;
    try {
      await db.delete('notes', id);
      const remaining = notes.filter(n => n.id !== id);
      setNotes(remaining);
      setActiveNote(remaining.length > 0 ? remaining[0] : null);
      setIsEditing(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  // Collect all unique tags for sidebar filtering
  const allTags = Array.from(new Set(notes.flatMap(n => n.tags)));

  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(search.toLowerCase()) || 
                          note.content.toLowerCase().includes(search.toLowerCase());
    const matchesTag = !selectedTag || note.tags.includes(selectedTag);
    return matchesSearch && matchesTag;
  });

  return (
    <div className="module-container" style={{ flexDirection: 'row' }}>
      
      {/* Sidebar: Lists & Tags */}
      <div className="module-sidebar" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ padding: '12px', borderBottom: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleCreateNote}>
            ➕ New Note
          </button>
          <input
            type="text"
            className="input-field"
            placeholder="Search notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ fontSize: '12px', padding: '8px' }}
          />
        </div>

        {/* Tags list */}
        {allTags.length > 0 && (
          <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--glass-border)', display: 'flex', gap: '4px', overflowX: 'auto', flexShrink: 0 }}>
            <span
              style={{
                fontSize: '11px',
                padding: '2px 6px',
                borderRadius: '4px',
                cursor: 'pointer',
                background: !selectedTag ? 'rgba(var(--accent-color-rgb), 0.2)' : 'transparent',
                border: '1px solid var(--glass-border)'
              }}
              onClick={() => setSelectedTag(null)}
            >
              All
            </span>
            {allTags.map(t => (
              <span
                key={t}
                style={{
                  fontSize: '11px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  background: selectedTag === t ? 'rgba(var(--accent-color-rgb), 0.2)' : 'transparent',
                  border: '1px solid var(--glass-border)'
                }}
                onClick={() => setSelectedTag(t)}
              >
                #{t}
              </span>
            ))}
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filteredNotes.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
              No notes found.
            </div>
          ) : (
            filteredNotes.map(n => (
              <div
                key={n.id}
                style={{
                  padding: '12px',
                  borderBottom: '1px solid var(--glass-border)',
                  cursor: 'pointer',
                  background: activeNote?.id === n.id ? 'rgba(255,255,255,0.05)' : 'transparent'
                }}
                onClick={() => {
                  setActiveNote(n);
                  setIsEditing(false);
                }}
              >
                <div style={{ fontWeight: 500, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {n.title}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {new Date(n.updatedAt).toLocaleDateString()} • {n.content.replace(/[#*`\n]/g, ' ').substring(0, 30)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Editor/Preview Main Body */}
      <div className="module-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0 }}>
        {activeNote ? (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
            
            {/* Action Bar */}
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              {isEditing ? (
                <input
                  type="text"
                  className="input-field"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{ maxWidth: '300px', fontWeight: 'bold' }}
                />
              ) : (
                <h3 style={{ fontSize: '16px' }}>{activeNote.title}</h3>
              )}

              <div style={{ display: 'flex', gap: '8px' }}>
                {isEditing ? (
                  <>
                    <button className="btn btn-primary" onClick={handleSaveNote}>Save</button>
                    <button className="btn" onClick={() => setIsEditing(false)}>Cancel</button>
                  </>
                ) : (
                  <>
                    <button className="btn" onClick={() => setIsEditing(true)}>Edit Note</button>
                    <button className="btn btn-danger" onClick={() => handleDeleteNote(activeNote.id)}>Delete</button>
                  </>
                )}
              </div>
            </div>

            {/* Editor Workspace */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
              {isEditing ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px', gap: '10px' }}>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {tags.map(t => (
                      <span key={t} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(var(--accent-color-rgb), 0.2)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        #{t}
                        <span style={{ cursor: 'pointer', fontWeight: 'bold' }} onClick={() => handleRemoveTag(t)}>×</span>
                      </span>
                    ))}
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Add tag and press Enter"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleAddTag}
                      style={{ width: '180px', padding: '4px 8px', fontSize: '12px' }}
                    />
                  </div>
                  <textarea
                    className="textarea-field"
                    style={{ flex: 1, resize: 'none', fontFamily: 'var(--font-mono)', fontSize: '13px' }}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Write markdown here..."
                  />
                </div>
              ) : (
                <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                  {/* Split screen display when reading notes */}
                  <div 
                    style={{ flex: 1, padding: '24px', overflowY: 'auto', borderRight: '1px solid var(--glass-border)' }}
                    dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }}
                    className="markdown-preview"
                  />
                </div>
              )}
            </div>

          </div>
        ) : (
          <div className="state-container" style={{ flex: 1 }}>
            <span className="state-icon">📝</span>
            <h4>No Note Selected</h4>
            <p style={{ color: 'var(--text-secondary)' }}>Select a note from the sidebar or create a new one.</p>
            <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={handleCreateNote}>
              Create Note
            </button>
          </div>
        )}
      </div>

    </div>
  );
};
