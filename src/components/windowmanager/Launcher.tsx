import React, { useState, useEffect, useRef } from 'react';
import { useWindowManager } from '../../context/WindowManagerContext';

interface LauncherProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Launcher: React.FC<LauncherProps> = ({ isOpen, onClose }) => {
  const { windows, openWindow } = useWindowManager();
  const [search, setSearch] = useState<string>('');
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Global keyboard shortcuts (Ctrl+Space to toggle/open launcher, Escape to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filtered = windows.filter(w =>
    w.title.toLowerCase().includes(search.toLowerCase()) ||
    w.id.toLowerCase().includes(search.toLowerCase())
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        openWindow(filtered[selectedIndex].id);
        onClose();
      }
    }
  };

  const handleItemClick = (id: string) => {
    openWindow(id);
    onClose();
  };

  return (
    <div className="launcher-overlay" onClick={onClose}>
      <div className="launcher-window" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          type="text"
          className="launcher-search"
          placeholder="Search tools, notes, calculators... (Arrow keys to navigate, Enter to launch)"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setSelectedIndex(0);
          }}
          onKeyDown={handleKeyDown}
        />
        
        <div className="launcher-results">
          {filtered.length > 0 ? (
            filtered.map((w, index) => (
              <div
                key={w.id}
                className={`launcher-result-item ${index === selectedIndex ? 'selected' : ''}`}
                onClick={() => handleItemClick(w.id)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <span style={{ fontSize: '24px' }}>{w.icon}</span>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 500, fontSize: '14px' }}>{w.title}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Module: {w.id}</span>
                </div>
              </div>
            ))
          ) : (
            <div style={{ gridColumn: 'span 2', padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              No results found for "{search}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
