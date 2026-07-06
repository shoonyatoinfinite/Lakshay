import React, { useState, useEffect } from 'react';
import { useWindowManager } from '../../context/WindowManagerContext';
import { sounds } from '../../utils/sounds';
import { MenuBar } from './MenuBar';
import { Dock } from './Dock';
import { Launcher } from './Launcher';
import { Window } from './Window';
import { DesktopWidgets } from './DesktopWidgets';
import { LockScreen } from './LockScreen';
import { NotificationCenter } from './NotificationCenter';

// Module Imports
import { Dashboard } from '../../modules/dashboard/Dashboard';
import { Notes } from '../../modules/notes/Notes';
import { Calendar } from '../../modules/calendar/Calendar';
import { Timetable } from '../../modules/timetable/Timetable';
import { Assignments } from '../../modules/assignments/Assignments';
import { Goals } from '../../modules/goals/Goals';
import { Habits } from '../../modules/habits/Habits';
import { Pomodoro } from '../../modules/pomodoro/Pomodoro';
import { Flashcards } from '../../modules/flashcards/Flashcards';
import { Resources } from '../../modules/resources/Resources';
import { Attendance } from '../../modules/attendance/Attendance';
import { Calculators } from '../../modules/calculators/Calculators';
import { Analytics } from '../../modules/analytics/Analytics';
import { DiagramBuilder } from '../../modules/diagrams/DiagramBuilder';
import { CareerHub } from '../../modules/career/CareerHub';
import { ProjectManager } from '../../modules/projects/ProjectManager';
import { Settings } from '../../modules/settings/Settings';
import { PaintBoard } from '../../modules/paint/PaintBoard';

export const Desktop: React.FC = () => {
  const { windows, wallpaper } = useWindowManager();
  const [launcherOpen, setLauncherOpen] = useState(false);
  const [isLocked, setIsLocked] = useState(true);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.closest('button') || 
        target.closest('.btn') || 
        target.closest('.dock-item') || 
        target.closest('.window-control-btn') ||
        target.closest('.menu-item') ||
        target.closest('input[type="checkbox"]') ||
        target.closest('input[type="radio"]')
      ) {
        sounds.playClick();
      }
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  // Map window id to actual module component
  const renderModuleContent = (id: string) => {
    switch (id) {
      case 'dashboard':
        return <Dashboard />;
      case 'notes':
        return <Notes />;
      case 'calendar':
        return <Calendar />;
      case 'timetable':
        return <Timetable />;
      case 'assignments':
        return <Assignments />;
      case 'goals':
        return <Goals />;
      case 'habits':
        return <Habits />;
      case 'pomodoro':
        return <Pomodoro />;
      case 'flashcards':
        return <Flashcards />;
      case 'resources':
        return <Resources />;
      case 'attendance':
        return <Attendance />;
      case 'calculators':
        return <Calculators />;
      case 'analytics':
        return <Analytics />;
      case 'diagrams':
        return <DiagramBuilder />;
      case 'career':
        return <CareerHub />;
      case 'projects':
        return <ProjectManager />;
      case 'draw':
      case 'paint':
        return <PaintBoard />;
      case 'settings':
        return <Settings />;
      default:
        return <div style={{ padding: '20px' }}>Module {id} under construction.</div>;
    }
  };

  return (
    <>
      {isLocked && <LockScreen onUnlock={() => setIsLocked(false)} />}

      <div 
        className="desktop-environment" 
        style={{ backgroundImage: wallpaper.includes('gradient') ? 'none' : `url(${wallpaper})`, background: wallpaper.includes('gradient') ? wallpaper : 'none' }}
      >
        <div className="desktop-wallpaper-overlay" />
        
        {/* Top Status Bar */}
        <MenuBar onToggleNotifications={() => setNotificationsOpen(!notificationsOpen)} />

        {/* Main Workspace Area */}
        <div className="desktop-workspace">
          
          {/* Desktop Widgets Grid (shown when dashboard window is minimized or user looking at home screen) */}
          <div style={{ position: 'absolute', top: '20px', left: '20px', right: '20px', bottom: '100px', pointerEvents: 'none', zIndex: 1 }}>
            <div style={{ pointerEvents: 'auto', width: '100%', height: '100%' }}>
              <DesktopWidgets />
            </div>
          </div>

          {/* Draggable/Resizable App Windows */}
          {windows.map((w) => (
            <Window key={w.id} windowState={w}>
              {renderModuleContent(w.id)}
            </Window>
          ))}

        </div>

        {/* Right side drawer alert sidebar */}
        <NotificationCenter isOpen={notificationsOpen} onClose={() => setNotificationsOpen(false)} />

        {/* Bottom Nav Taskbar Dock */}
        <Dock onToggleLauncher={() => setLauncherOpen(!launcherOpen)} />

        {/* Spotlight Launcher Overlay */}
        <Launcher isOpen={launcherOpen} onClose={() => setLauncherOpen(false)} />
      </div>
    </>
  );
};
