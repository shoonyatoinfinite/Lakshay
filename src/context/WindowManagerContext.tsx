import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { sounds } from '../utils/sounds';

export interface WindowState {
  id: string;
  title: string;
  icon: string;
  isOpen: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
}

export type ThemeType = 'neo-dark' | 'cyberpunk' | 'academic-sepia' | 'minimal-light';

export interface Track {
  name: string;
  file: File;
}

interface WindowManagerContextType {
  windows: WindowState[];
  activeWindowId: string | null;
  theme: ThemeType;
  wallpaper: string;
  openWindow: (id: string) => void;
  closeWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  maximizeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  moveWindow: (id: string, x: number, y: number) => void;
  resizeWindow: (id: string, width: number, height: number) => void;
  setTheme: (theme: ThemeType) => void;
  setWallpaper: (wallpaper: string) => void;
  resetLayout: () => void;

  // Synced Pomodoro States
  pomodoroTime: number;
  setPomodoroTime: React.Dispatch<React.SetStateAction<number>>;
  pomodoroRunning: boolean;
  setPomodoroRunning: React.Dispatch<React.SetStateAction<boolean>>;
  pomodoroMode: 'study' | 'shortBreak' | 'longBreak';
  setPomodoroMode: React.Dispatch<React.SetStateAction<'study' | 'shortBreak' | 'longBreak'>>;
  pomodoroStudyDuration: number;
  setPomodoroStudyDuration: React.Dispatch<React.SetStateAction<number>>;
  pomodoroShortBreakDuration: number;
  setPomodoroShortBreakDuration: React.Dispatch<React.SetStateAction<number>>;
  pomodoroLongBreakDuration: number;
  setPomodoroLongBreakDuration: React.Dispatch<React.SetStateAction<number>>;
  pomodoroTaskName: string;
  setPomodoroTaskName: React.Dispatch<React.SetStateAction<string>>;

  // Global Music Player States & Operations
  musicPlaylist: Track[];
  setMusicPlaylist: React.Dispatch<React.SetStateAction<Track[]>>;
  musicCurrentIndex: number;
  setMusicCurrentIndex: React.Dispatch<React.SetStateAction<number>>;
  musicIsPlaying: boolean;
  setMusicIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  musicVolume: number;
  setMusicVolume: React.Dispatch<React.SetStateAction<number>>;
  musicRepeatMode: 'off' | 'all' | 'one';
  setMusicRepeatMode: React.Dispatch<React.SetStateAction<'off' | 'all' | 'one'>>;
  musicIsShuffle: boolean;
  setMusicIsShuffle: React.Dispatch<React.SetStateAction<boolean>>;
  musicCurrentTime: number;
  setMusicCurrentTime: React.Dispatch<React.SetStateAction<number>>;
  musicDuration: number;
  setMusicDuration: React.Dispatch<React.SetStateAction<number>>;
  musicSeek: (time: number) => void;
  musicPlayPause: () => void;
  musicStop: () => void;
  musicNext: () => void;
  musicPrev: () => void;
}

const DEFAULT_WINDOWS: WindowState[] = [
  { id: 'dashboard', title: 'Dashboard', icon: '⚡', isOpen: false, isMinimized: false, isMaximized: false, x: 50, y: 50, width: 800, height: 500, zIndex: 10 },
  { id: 'notes', title: 'Notebook', icon: '📝', isOpen: false, isMinimized: false, isMaximized: false, x: 80, y: 80, width: 750, height: 480, zIndex: 1 },
  { id: 'calendar', title: 'Calendar & Schedule', icon: '📅', isOpen: false, isMinimized: false, isMaximized: false, x: 100, y: 100, width: 800, height: 520, zIndex: 1 },
  { id: 'timetable', title: 'Timetable', icon: '🏫', isOpen: false, isMinimized: false, isMaximized: false, x: 120, y: 120, width: 700, height: 450, zIndex: 1 },
  { id: 'assignments', title: 'Assignments', icon: '📋', isOpen: false, isMinimized: false, isMaximized: false, x: 140, y: 140, width: 720, height: 470, zIndex: 1 },
  { id: 'goals', title: 'Goal Planner (OKRs)', icon: '🎯', isOpen: false, isMinimized: false, isMaximized: false, x: 160, y: 160, width: 700, height: 450, zIndex: 1 },
  { id: 'habits', title: 'Habit Tracker', icon: '🌱', isOpen: false, isMinimized: false, isMaximized: false, x: 180, y: 180, width: 780, height: 500, zIndex: 1 },
  { id: 'pomodoro', title: 'Pomodoro Study Timer', icon: '🍅', isOpen: false, isMinimized: false, isMaximized: false, x: 200, y: 200, width: 450, height: 500, zIndex: 1 },
  { id: 'flashcards', title: 'Flashcards (Leitner)', icon: '🎴', isOpen: false, isMinimized: false, isMaximized: false, x: 220, y: 220, width: 750, height: 480, zIndex: 1 },
  { id: 'resources', title: 'Resource Cabinet', icon: '📚', isOpen: false, isMinimized: false, isMaximized: false, x: 240, y: 240, width: 700, height: 460, zIndex: 1 },
  { id: 'attendance', title: 'Attendance Log', icon: '✅', isOpen: false, isMinimized: false, isMaximized: false, x: 260, y: 260, width: 680, height: 440, zIndex: 1 },
  { id: 'calculators', title: 'Calculator Suite', icon: '🧮', isOpen: false, isMinimized: false, isMaximized: false, x: 280, y: 280, width: 500, height: 520, zIndex: 1 },
  { id: 'analytics', title: 'Performance Analytics', icon: '📊', isOpen: false, isMinimized: false, isMaximized: false, x: 300, y: 80, width: 850, height: 550, zIndex: 1 },
  { id: 'diagrams', title: 'Diagram Builder', icon: '📐', isOpen: false, isMinimized: false, isMaximized: false, x: 100, y: 50, width: 900, height: 580, zIndex: 1 },
  { id: 'career', title: 'Career Hub & Resume', icon: '💼', isOpen: false, isMinimized: false, isMaximized: false, x: 150, y: 120, width: 800, height: 530, zIndex: 1 },
  { id: 'projects', title: 'Project Board (Gantt)', icon: '🗂️', isOpen: false, isMinimized: false, isMaximized: false, x: 180, y: 90, width: 880, height: 550, zIndex: 1 },
  { id: 'paint', title: 'Paint & Draw', icon: '✏️', isOpen: false, isMinimized: false, isMaximized: false, x: 170, y: 110, width: 800, height: 550, zIndex: 1 },
  { id: 'settings', title: 'System Settings', icon: '⚙️', isOpen: false, isMinimized: false, isMaximized: false, x: 350, y: 200, width: 600, height: 450, zIndex: 1 }
];

const WindowManagerContext = createContext<WindowManagerContextType | undefined>(undefined);

export const WindowManagerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [windows, setWindows] = useState<WindowState[]>(() => {
    const saved = localStorage.getItem('lakshya_windows');
    if (saved) {
      try {
        let parsed = JSON.parse(saved) as WindowState[];
        
        // Migrate legacy 'draw' ID to 'paint'
        parsed = parsed.map(w => w.id === 'draw' ? { ...w, id: 'paint', title: 'Paint & Draw', icon: '✏️' } : w);
        
        // Sync with DEFAULT_WINDOWS to restore any missing apps and update icons/titles
        DEFAULT_WINDOWS.forEach(defWin => {
          const index = parsed.findIndex(w => w.id === defWin.id);
          if (index === -1) {
            parsed.push({ ...defWin, isOpen: false });
          } else {
            parsed[index].title = defWin.title;
            parsed[index].icon = defWin.icon;
          }
        });

        return parsed;
      } catch (e) {
        return DEFAULT_WINDOWS;
      }
    }
    return DEFAULT_WINDOWS;
  });

  const [activeWindowId, setActiveWindowId] = useState<string | null>(() => {
    return localStorage.getItem('lakshya_active_window') || 'dashboard';
  });

  const [theme, setThemeState] = useState<ThemeType>(() => {
    return (localStorage.getItem('lakshya_theme') as ThemeType) || 'neo-dark';
  });

  const [wallpaper, setWallpaperState] = useState<string>(() => {
    return localStorage.getItem('lakshya_wallpaper') || 'linear-gradient(135deg, #12131c 0%, #08090d 100%)';
  });

  // Synced Pomodoro States
  const [pomodoroTime, setPomodoroTime] = useState<number>(25 * 60);
  const [pomodoroRunning, setPomodoroRunning] = useState<boolean>(false);
  const [pomodoroMode, setPomodoroMode] = useState<'study' | 'shortBreak' | 'longBreak'>('study');
  const [pomodoroStudyDuration, setPomodoroStudyDuration] = useState<number>(25);
  const [pomodoroShortBreakDuration, setPomodoroShortBreakDuration] = useState<number>(5);
  const [pomodoroLongBreakDuration, setPomodoroLongBreakDuration] = useState<number>(15);
  const [pomodoroTaskName, setPomodoroTaskName] = useState<string>('Focus Session');

  // Global Music Player States
  const [musicPlaylist, setMusicPlaylist] = useState<Track[]>([]);
  const [musicCurrentIndex, setMusicCurrentIndex] = useState<number>(-1);
  const [musicIsPlaying, setMusicIsPlaying] = useState<boolean>(false);
  const [musicVolume, setMusicVolume] = useState<number>(0.6);
  const [musicRepeatMode, setMusicRepeatMode] = useState<'off' | 'all' | 'one'>('off');
  const [musicIsShuffle, setMusicIsShuffle] = useState<boolean>(false);
  const [musicCurrentTime, setMusicCurrentTime] = useState<number>(0);
  const [musicDuration, setMusicDuration] = useState<number>(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Synchronize initial durations or when state resets
  useEffect(() => {
    if (!pomodoroRunning) {
      if (pomodoroMode === 'study') {
        setPomodoroTime(pomodoroStudyDuration * 60);
      } else if (pomodoroMode === 'shortBreak') {
        setPomodoroTime(pomodoroShortBreakDuration * 60);
      } else if (pomodoroMode === 'longBreak') {
        setPomodoroTime(pomodoroLongBreakDuration * 60);
      }
    }
  }, [pomodoroMode, pomodoroStudyDuration, pomodoroShortBreakDuration, pomodoroLongBreakDuration, pomodoroRunning]);

  // Global Pomodoro Ticker logic
  useEffect(() => {
    let interval: any = null;
    if (pomodoroRunning && pomodoroTime > 0) {
      interval = setInterval(() => {
        setPomodoroTime(t => t - 1);
      }, 1000);
    } else if (pomodoroTime === 0 && pomodoroRunning) {
      setPomodoroRunning(false);
      
      // Play alert buzzer
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const playBeep = (delay: number, freq: number, dur: number) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, audioCtx.currentTime + delay);
          gain.gain.setValueAtTime(0, audioCtx.currentTime + delay);
          gain.gain.linearRampToValueAtTime(0.4, audioCtx.currentTime + delay + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + delay + dur);
          
          osc.start(audioCtx.currentTime + delay);
          osc.stop(audioCtx.currentTime + delay + dur);
        };
        playBeep(0, 587.33, 0.25);
        playBeep(0.3, 587.33, 0.25);
        playBeep(0.6, 880, 0.4);
      } catch (e) {
        console.warn('Audio feedback context block', e);
      }

      // Save study session to DB if study mode completed
      if (pomodoroMode === 'study') {
        const logToDB = async () => {
          const { db } = await import('../db/db');
          const newLog = {
            id: crypto.randomUUID(),
            taskName: pomodoroTaskName.trim() || 'Focus Session',
            duration: pomodoroStudyDuration,
            timestamp: Date.now()
          };
          try {
            await db.put('pomodoro', newLog);
            window.dispatchEvent(new CustomEvent('lakshya_pomodoro_logged'));
          } catch (err) {
            console.error('Failed to log focus to DB from context provider', err);
          }
        };
        logToDB();
      }

      alert(pomodoroMode === 'study' ? '🔔 Study session complete! Time to take a break.' : '🌴 Break complete! Ready to focus?');

      // Auto-toggle modes
      if (pomodoroMode === 'study') {
        setPomodoroMode('shortBreak');
        setPomodoroTime(pomodoroShortBreakDuration * 60);
      } else {
        setPomodoroMode('study');
        setPomodoroTime(pomodoroStudyDuration * 60);
      }
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [pomodoroRunning, pomodoroTime, pomodoroMode, pomodoroStudyDuration, pomodoroShortBreakDuration, pomodoroLongBreakDuration, pomodoroTaskName]);

  // Global Music Player Audio Loop Syncs
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = musicVolume;
    }
  }, [musicVolume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (musicPlaylist.length === 0 || musicCurrentIndex === -1 || musicCurrentIndex >= musicPlaylist.length) {
      audio.src = '';
      setMusicIsPlaying(false);
      return;
    }

    const track = musicPlaylist[musicCurrentIndex];
    const url = URL.createObjectURL(track.file);
    audio.src = url;

    if (musicIsPlaying) {
      audio.play().catch(err => {
        console.warn('Audio background playback interrupted:', err);
        setMusicIsPlaying(false);
      });
    }

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [musicCurrentIndex, musicPlaylist]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setMusicCurrentTime(audio.currentTime);
    const onDurationChange = () => setMusicDuration(audio.duration || 0);
    const onEnded = () => {
      if (musicRepeatMode === 'one') {
        audio.currentTime = 0;
        audio.play().catch(() => setMusicIsPlaying(false));
      } else {
        handleMusicNext();
      }
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('loadedmetadata', onDurationChange);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('loadedmetadata', onDurationChange);
      audio.removeEventListener('ended', onEnded);
    };
  }, [musicPlaylist, musicCurrentIndex, musicRepeatMode, musicIsShuffle]);

  const handleMusicNext = () => {
    if (musicPlaylist.length === 0) return;
    if (musicIsShuffle) {
      const rand = Math.floor(Math.random() * musicPlaylist.length);
      setMusicCurrentIndex(rand);
    } else {
      if (musicCurrentIndex < musicPlaylist.length - 1) {
        setMusicCurrentIndex(prev => prev + 1);
      } else if (musicRepeatMode === 'all') {
        setMusicCurrentIndex(0);
      } else {
        setMusicIsPlaying(false);
      }
    }
  };

  const musicSeek = (time: number) => {
    const audio = audioRef.current;
    if (audio && musicDuration > 0) {
      audio.currentTime = time;
      setMusicCurrentTime(time);
    }
  };

  const musicPlayPause = () => {
    const audio = audioRef.current;
    if (!audio || musicPlaylist.length === 0 || musicCurrentIndex === -1) return;

    if (musicIsPlaying) {
      audio.pause();
      setMusicIsPlaying(false);
    } else {
      audio.play()
        .then(() => setMusicIsPlaying(true))
        .catch(err => {
          console.warn('Playback error', err);
          setMusicIsPlaying(false);
        });
    }
    sounds.playClick();
  };

  const musicStop = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setMusicIsPlaying(false);
    sounds.playClick();
  };

  const musicNext = () => {
    handleMusicNext();
    sounds.playClick();
  };

  const musicPrev = () => {
    if (musicPlaylist.length === 0) return;

    if (musicIsShuffle) {
      const rand = Math.floor(Math.random() * musicPlaylist.length);
      setMusicCurrentIndex(rand);
    } else {
      if (musicCurrentIndex > 0) {
        setMusicCurrentIndex(prev => prev - 1);
      } else if (musicRepeatMode === 'all') {
        setMusicCurrentIndex(musicPlaylist.length - 1);
      } else {
        if (audioRef.current) audioRef.current.currentTime = 0;
      }
    }
    sounds.playClick();
  };

  // Apply theme to body element
  useEffect(() => {
    document.body.className = `theme-${theme}`;
    localStorage.setItem('lakshya_theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('lakshya_windows', JSON.stringify(windows));
  }, [windows]);

  useEffect(() => {
    if (activeWindowId) {
      localStorage.setItem('lakshya_active_window', activeWindowId);
    }
  }, [activeWindowId]);

  const getNextZIndex = () => {
    const maxZ = windows.reduce((max, w) => (w.isOpen ? Math.max(max, w.zIndex) : max), 10);
    return maxZ + 1;
  };

  const openWindow = (id: string) => {
    const nextZ = getNextZIndex();
    setWindows(prev =>
      prev.map(w =>
        w.id === id
          ? { ...w, isOpen: true, isMinimized: false, zIndex: nextZ }
          : w
      )
    );
    setActiveWindowId(id);
    sounds.playOpen();
  };

  const closeWindow = (id: string) => {
    setWindows(prev =>
      prev.map(w => (w.id === id ? { ...w, isOpen: false } : w))
    );
    if (activeWindowId === id) {
      const remaining = windows
        .filter(w => w.id !== id && w.isOpen && !w.isMinimized)
        .sort((a, b) => b.zIndex - a.zIndex);
      setActiveWindowId(remaining.length > 0 ? remaining[0].id : null);
    }
    sounds.playClose();
  };

  const minimizeWindow = (id: string) => {
    setWindows(prev =>
      prev.map(w => (w.id === id ? { ...w, isMinimized: true } : w))
    );
    if (activeWindowId === id) {
      const remaining = windows
        .filter(w => w.id !== id && w.isOpen && !w.isMinimized)
        .sort((a, b) => b.zIndex - a.zIndex);
      setActiveWindowId(remaining.length > 0 ? remaining[0].id : null);
    }
    sounds.playClose();
  };

  const maximizeWindow = (id: string) => {
    setWindows(prev =>
      prev.map(w => (w.id === id ? { ...w, isMaximized: !w.isMaximized } : w))
    );
    focusWindow(id);
  };

  const focusWindow = (id: string) => {
    const nextZ = getNextZIndex();
    setWindows(prev =>
      prev.map(w => (w.id === id ? { ...w, zIndex: nextZ, isMinimized: false } : w))
    );
    setActiveWindowId(id);
    sounds.playOpen();
  };

  const moveWindow = (id: string, x: number, y: number) => {
    setWindows(prev =>
      prev.map(w => (w.id === id ? { ...w, x, y } : w))
    );
  };

  const resizeWindow = (id: string, width: number, height: number) => {
    setWindows(prev =>
      prev.map(w => (w.id === id ? { ...w, width, height } : w))
    );
  };

  const setTheme = (newTheme: ThemeType) => {
    setThemeState(newTheme);
  };

  const setWallpaper = (newWallpaper: string) => {
    setWallpaperState(newWallpaper);
    localStorage.setItem('lakshya_wallpaper', newWallpaper);
  };

  const resetLayout = () => {
    setWindows(DEFAULT_WINDOWS);
    setActiveWindowId('dashboard');
  };

  return (
    <WindowManagerContext.Provider
      value={{
        windows,
        activeWindowId,
        theme,
        wallpaper,
        openWindow,
        closeWindow,
        minimizeWindow,
        maximizeWindow,
        focusWindow,
        moveWindow,
        resizeWindow,
        setTheme,
        setWallpaper,
        resetLayout,

        // Synced Pomodoro states
        pomodoroTime,
        setPomodoroTime,
        pomodoroRunning,
        setPomodoroRunning,
        pomodoroMode,
        setPomodoroMode,
        pomodoroStudyDuration,
        setPomodoroStudyDuration,
        pomodoroShortBreakDuration,
        setPomodoroShortBreakDuration,
        pomodoroLongBreakDuration,
        setPomodoroLongBreakDuration,
        pomodoroTaskName,
        setPomodoroTaskName,

        // Global Music states
        musicPlaylist,
        setMusicPlaylist,
        musicCurrentIndex,
        setMusicCurrentIndex,
        musicIsPlaying,
        setMusicIsPlaying,
        musicVolume,
        setMusicVolume,
        musicRepeatMode,
        setMusicRepeatMode,
        musicIsShuffle,
        setMusicIsShuffle,
        musicCurrentTime,
        setMusicCurrentTime,
        musicDuration,
        setMusicDuration,
        musicSeek,
        musicPlayPause,
        musicStop,
        musicNext,
        musicPrev
      }}
    >
      {children}
      <audio ref={audioRef} style={{ display: 'none' }} />
    </WindowManagerContext.Provider>
  );
};

export const useWindowManager = () => {
  const context = useContext(WindowManagerContext);
  if (!context) {
    throw new Error('useWindowManager must be used within a WindowManagerProvider');
  }
  return context;
};
