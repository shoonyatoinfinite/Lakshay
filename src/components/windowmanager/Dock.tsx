import React from 'react';
import { useWindowManager } from '../../context/WindowManagerContext';

interface DockProps {
  onToggleLauncher: () => void;
}

export const Dock: React.FC<DockProps> = ({ onToggleLauncher }) => {
  const { windows, activeWindowId, openWindow, minimizeWindow, focusWindow } = useWindowManager();

  const handleDockItemClick = (id: string) => {
    const w = windows.find(win => win.id === id);
    if (!w) return;

    if (!w.isOpen) {
      openWindow(id);
    } else if (w.isMinimized) {
      focusWindow(id);
    } else if (activeWindowId === id) {
      minimizeWindow(id);
    } else {
      focusWindow(id);
    }
  };

  return (
    <div className="dock-container">
      {/* Launcher Button */}
      <div 
        className="dock-item" 
        onClick={onToggleLauncher}
        title="Open App Launcher (Ctrl + Space)"
        style={{ color: 'var(--accent-color)', fontWeight: 'bold' }}
      >
        🚀
      </div>

      <div style={{ width: '1px', height: '24px', background: 'var(--glass-border)', margin: '0 4px' }} />

      {/* App Shortcuts */}
      {windows.map((w) => {
        const isRunning = w.isOpen;
        const isActive = activeWindowId === w.id && isRunning && !w.isMinimized;

        return (
          <div
            key={w.id}
            className={`dock-item ${isActive ? 'dock-item-active' : ''}`}
            onClick={() => handleDockItemClick(w.id)}
            title={w.title}
            style={{
              opacity: isRunning ? 1 : 0.6,
              background: isRunning ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
              border: isRunning ? '1px solid var(--glass-border)' : '1px solid transparent',
            }}
          >
            <span>{w.icon}</span>
            {/* Running status indicator dot */}
            {isRunning && !isActive && (
              <span
                style={{
                  position: 'absolute',
                  bottom: '2px',
                  width: '4px',
                  height: '4px',
                  background: 'var(--text-secondary)',
                  borderRadius: '50%',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};
