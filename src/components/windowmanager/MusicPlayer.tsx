import React, { useRef } from 'react';
import { useWindowManager } from '../../context/WindowManagerContext';
import type { Track } from '../../context/WindowManagerContext';
import { sounds } from '../../utils/sounds';

export const MusicPlayer: React.FC = () => {
  const {
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
    musicDuration,
    musicSeek,
    musicPlayPause,
    musicStop,
    musicNext,
    musicPrev
  } = useWindowManager();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  // Files picker logic
  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const added: Track[] = [];
    for (let i = 0; i < e.target.files.length; i++) {
      const f = e.target.files[i];
      if (f.type.startsWith('audio/') || f.type.startsWith('video/') || f.name.endsWith('.mp3') || f.name.endsWith('.mp4') || f.name.endsWith('.m4a') || f.name.endsWith('.wav')) {
        added.push({ name: f.name, file: f });
      }
    }

    if (added.length > 0) {
      setMusicPlaylist(prev => {
        const next = [...prev, ...added];
        if (musicCurrentIndex === -1) {
          setMusicCurrentIndex(0);
        }
        return next;
      });
      sounds.playSuccess();
    }
  };

  const clearPlaylist = () => {
    musicStop();
    setMusicPlaylist([]);
    setMusicCurrentIndex(-1);
    sounds.playClick();
  };

  const formatTimeStr = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const toggleRepeat = () => {
    setMusicRepeatMode(prev => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
    sounds.playClick();
  };

  const toggleShuffle = () => {
    setMusicIsShuffle(!musicIsShuffle);
    sounds.playClick();
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    musicSeek(parseFloat(e.target.value));
  };

  return (
    <div className="glass-panel" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(0,0,0,0.3)', border: '1px dashed var(--glass-border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ fontSize: '13px', color: 'var(--accent-color)' }}>🎵 Media Player</h4>
        <button 
          className="btn" 
          style={{ padding: '2px 6px', fontSize: '9px', color: 'var(--error)', borderColor: 'rgba(255, 75, 75, 0.2)' }}
          onClick={clearPlaylist}
          disabled={musicPlaylist.length === 0}
        >
          Wipe Playlist
        </button>
      </div>

      {/* Upload buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
        <button className="btn" style={{ padding: '4px', fontSize: '11px' }} onClick={() => fileInputRef.current?.click()}>
          📁 Add Files
        </button>
        <button className="btn" style={{ padding: '4px', fontSize: '11px' }} onClick={() => folderInputRef.current?.click()}>
          🗂️ Add Folder
        </button>
        
        <input 
          ref={fileInputRef} 
          type="file" 
          accept="audio/*,video/*,.mp3,.mp4,.m4a,.wav" 
          multiple 
          onChange={handleFiles} 
          style={{ display: 'none' }} 
        />
        
        <input 
          ref={folderInputRef} 
          type="file" 
          {...{ webkitdirectory: "", directory: "", multiple: true }} 
          onChange={handleFiles} 
          style={{ display: 'none' }} 
        />
      </div>

      {/* Playlist view (scrolling) */}
      <div 
        style={{ 
          maxHeight: '75px', 
          overflowY: 'auto', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '4px', 
          background: 'rgba(0,0,0,0.2)', 
          borderRadius: '6px', 
          padding: '4px' 
        }}
      >
        {musicPlaylist.length === 0 ? (
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>No tracks loaded. Select local files.</span>
        ) : (
          musicPlaylist.map((track, i) => (
            <div 
              key={i} 
              style={{ 
                fontSize: '10px', 
                padding: '4px 6px', 
                borderRadius: '4px', 
                cursor: 'pointer', 
                background: musicCurrentIndex === i ? 'rgba(var(--accent-color-rgb), 0.15)' : 'transparent',
                color: musicCurrentIndex === i ? 'var(--accent-color)' : 'var(--text-secondary)',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                overflow: 'hidden'
              }}
              onClick={() => { setMusicCurrentIndex(i); setMusicIsPlaying(true); sounds.playClick(); }}
              title={track.name}
            >
              {musicCurrentIndex === i ? '▶️ ' : ''}{track.name}
            </div>
          ))
        )}
      </div>

      {/* Tracking info */}
      {musicCurrentIndex !== -1 && musicPlaylist[musicCurrentIndex] && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }} title={musicPlaylist[musicCurrentIndex].name}>
            Playing: <strong>{musicPlaylist[musicCurrentIndex].name}</strong>
          </span>
          
          {/* Progress Slider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{formatTimeStr(musicCurrentTime)}</span>
            <input 
              type="range"
              min="0"
              max={musicDuration || 100}
              value={musicCurrentTime}
              onChange={handleSeek}
              style={{ flex: 1, accentColor: 'var(--accent-color)', height: '4px', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{formatTimeStr(musicDuration)}</span>
          </div>
        </div>
      )}

      {/* Main player operations bar */}
      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
        <button 
          className="btn" 
          style={{ padding: '6px 8px', fontSize: '11px', flex: 1 }}
          onClick={musicPrev}
          disabled={musicPlaylist.length === 0}
          title="Previous Track"
        >
          ⏮️
        </button>
        <button 
          className="btn btn-primary" 
          style={{ padding: '6px 8px', fontSize: '11px', flex: 2 }}
          onClick={musicPlayPause}
          disabled={musicPlaylist.length === 0}
          title="Play/Pause"
        >
          {musicIsPlaying ? '⏸️' : '▶️'}
        </button>
        <button 
          className="btn" 
          style={{ padding: '6px 8px', fontSize: '11px', flex: 1 }}
          onClick={musicStop}
          disabled={musicPlaylist.length === 0}
          title="Stop Track"
        >
          ⏹️
        </button>
        <button 
          className="btn" 
          style={{ padding: '6px 8px', fontSize: '11px', flex: 1 }}
          onClick={musicNext}
          disabled={musicPlaylist.length === 0}
          title="Next Track"
        >
          ⏭️
        </button>
      </div>

      {/* Shuffle and Repeat bar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
        <button 
          className="btn" 
          style={{ 
            padding: '4px', 
            fontSize: '10px', 
            background: musicIsShuffle ? 'rgba(var(--accent-color-rgb), 0.15)' : 'transparent',
            borderColor: musicIsShuffle ? 'var(--accent-color)' : 'var(--glass-border)'
          }} 
          onClick={toggleShuffle}
          disabled={musicPlaylist.length === 0}
        >
          🔀 Shuffle: {musicIsShuffle ? 'On' : 'Off'}
        </button>
        <button 
          className="btn" 
          style={{ 
            padding: '4px', 
            fontSize: '10px',
            background: musicRepeatMode !== 'off' ? 'rgba(var(--accent-color-rgb), 0.15)' : 'transparent',
            borderColor: musicRepeatMode !== 'off' ? 'var(--accent-color)' : 'var(--glass-border)'
          }}
          onClick={toggleRepeat}
          disabled={musicPlaylist.length === 0}
        >
          {musicRepeatMode === 'off' && '🔁 Repeat: Off'}
          {musicRepeatMode === 'all' && '🔁 Repeat: All'}
          {musicRepeatMode === 'one' && '🔂 Repeat: One'}
        </button>
      </div>

      {/* Volume Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>
        <span>🔊 Vol:</span>
        <input 
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={musicVolume}
          onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
          style={{ flex: 1, accentColor: 'var(--accent-color)', height: '4px', cursor: 'pointer' }}
        />
        <span style={{ fontFamily: 'var(--font-mono)' }}>{Math.round(musicVolume * 100)}%</span>
      </div>

    </div>
  );
};
