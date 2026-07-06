import React, { useRef } from 'react';
import { useWindowManager } from '../../context/WindowManagerContext';
import type { WindowState } from '../../context/WindowManagerContext';

interface WindowProps {
  windowState: WindowState;
  children: React.ReactNode;
}

export const Window: React.FC<WindowProps> = ({ windowState, children }) => {
  const { id, title, icon, isOpen, isMinimized, isMaximized, x, y, width, height, zIndex } = windowState;
  const { closeWindow, minimizeWindow, maximizeWindow, focusWindow, moveWindow, resizeWindow, activeWindowId } = useWindowManager();
  const windowRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const isFocused = activeWindowId === id;

  const handleHeaderPointerDown = (e: React.PointerEvent) => {
    // Only allow drag with left click
    if (e.button !== 0) return;
    if (isMaximized) return;
    
    // Ignore if clicking on button controls
    if ((e.target as HTMLElement).closest('.window-btn')) return;

    focusWindow(id);
    e.preventDefault();

    const startX = e.clientX;
    const startY = e.clientY;
    const startWindowX = x;
    const startWindowY = y;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      
      let newX = startWindowX + deltaX;
      let newY = startWindowY + deltaY;

      // Restrict window header from going above top menu bar (40px)
      if (newY < 40) newY = 40;
      
      // Restrict from going completely off screen horizontally
      const minVisibleWidth = 100;
      if (newX < -width + minVisibleWidth) newX = -width + minVisibleWidth;
      if (newX > window.innerWidth - minVisibleWidth) newX = window.innerWidth - minVisibleWidth;
      
      moveWindow(id, newX, newY);
    };

    const handlePointerUp = () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  };

  const handleResizePointerDown = (e: React.PointerEvent, handle: 'se' | 's' | 'e') => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    focusWindow(id);

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = width;
    const startHeight = height;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      let newWidth = startWidth;
      let newHeight = startHeight;

      if (handle === 'e' || handle === 'se') {
        newWidth = Math.max(320, startWidth + deltaX);
      }
      if (handle === 's' || handle === 'se') {
        newHeight = Math.max(240, startHeight + deltaY);
      }

      resizeWindow(id, newWidth, newHeight);
    };

    const handlePointerUp = () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  };

  const style: React.CSSProperties = isMaximized
    ? {
        top: '40px',
        left: 0,
        width: '100vw',
        height: 'calc(100vh - 100px)', // Leave space for menu-bar and dock
        zIndex,
      }
    : {
        top: `${y}px`,
        left: `${x}px`,
        width: `${width}px`,
        height: `${height}px`,
        zIndex,
      };

  return (
    <div
      ref={windowRef}
      className={`os-window ${isFocused ? 'focused' : ''} ${isMinimized ? 'minimized' : ''}`}
      style={style}
      onPointerDown={() => focusWindow(id)}
    >
      {/* Title bar */}
      <div className="window-titlebar" onPointerDown={handleHeaderPointerDown}>
        <div className="window-title">
          <span>{icon}</span>
          <span>{title}</span>
        </div>
        <div className="window-controls">
          <button
            className="window-btn window-btn-minimize"
            onClick={() => minimizeWindow(id)}
            title="Minimize"
          />
          <button
            className="window-btn window-btn-maximize"
            onClick={() => maximizeWindow(id)}
            title="Maximize"
          />
          <button
            className="window-btn window-btn-close"
            onClick={() => closeWindow(id)}
            title="Close"
          />
        </div>
      </div>

      {/* Content wrapper */}
      <div className="window-content">{children}</div>

      {/* Resize handles */}
      {!isMaximized && (
        <>
          <div className="window-resize-handle resize-e" onPointerDown={(e) => handleResizePointerDown(e, 'e')} />
          <div className="window-resize-handle resize-s" onPointerDown={(e) => handleResizePointerDown(e, 's')} />
          <div className="window-resize-handle resize-se" onPointerDown={(e) => handleResizePointerDown(e, 'se')} />
        </>
      )}
    </div>
  );
};
