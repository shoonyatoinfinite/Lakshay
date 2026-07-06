import React, { useState, useRef, useEffect } from 'react';

type SoundType = 'off' | 'rain' | 'waves' | 'static';

export const AmbientSynth: React.FC = () => {
  const [activeSound, setActiveSound] = useState<SoundType>('off');
  const [volume, setVolume] = useState<number>(0.5);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const filterNodeRef = useRef<BiquadFilterNode | null>(null);
  const lfoRef = useRef<OscillatorNode | null>(null);

  // Initialize Audio Context on user action
  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  const stopCurrent = () => {
    try {
      if (sourceNodeRef.current) {
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
        sourceNodeRef.current = null;
      }
      if (lfoRef.current) {
        lfoRef.current.stop();
        lfoRef.current.disconnect();
        lfoRef.current = null;
      }
      if (filterNodeRef.current) {
        filterNodeRef.current.disconnect();
        filterNodeRef.current = null;
      }
      if (gainNodeRef.current) {
        gainNodeRef.current.disconnect();
        gainNodeRef.current = null;
      }
    } catch (e) {
      console.warn('Error stopping synth nodes', e);
    }
  };

  // Generate procedural sound buffers
  const createNoiseBuffer = (type: 'white' | 'brown') => {
    const ctx = audioCtxRef.current;
    if (!ctx) return null;

    const bufferSize = ctx.sampleRate * 4; // 4 seconds loop
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    if (type === 'white') {
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    } else {
      // Brown noise (leaky integrator)
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = data[i];
        data[i] *= 3.5; // Gain compensation
      }
    }
    return buffer;
  };

  const startSound = (sound: SoundType) => {
    initAudio();
    stopCurrent();
    
    const ctx = audioCtxRef.current;
    if (!ctx || sound === 'off') {
      setActiveSound('off');
      return;
    }

    // Create Nodes
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(volume * 0.15, ctx.currentTime); // Attenuate volume so it's not deafening
    gainNodeRef.current = gainNode;

    const filterNode = ctx.createBiquadFilter();
    filterNodeRef.current = filterNode;

    const source = ctx.createBufferSource();
    source.loop = true;
    sourceNodeRef.current = source;

    if (sound === 'static') {
      const buf = createNoiseBuffer('white');
      if (buf) source.buffer = buf;
      
      // Warm filter for focus static
      filterNode.type = 'lowpass';
      filterNode.frequency.setValueAtTime(1000, ctx.currentTime);

      source.connect(filterNode);
      filterNode.connect(gainNode);
    } else if (sound === 'rain') {
      const buf = createNoiseBuffer('brown');
      if (buf) source.buffer = buf;

      // Soft rain lowpass filter
      filterNode.type = 'lowpass';
      filterNode.frequency.setValueAtTime(750, ctx.currentTime);

      source.connect(filterNode);
      filterNode.connect(gainNode);
    } else if (sound === 'waves') {
      const buf = createNoiseBuffer('brown');
      if (buf) source.buffer = buf;

      // Deep ocean filter
      filterNode.type = 'lowpass';
      filterNode.frequency.setValueAtTime(500, ctx.currentTime);

      // LFO to modulate gain to simulate waves swelling (frequency 0.08Hz = 12s cycles)
      const lfo = ctx.createOscillator();
      lfo.frequency.setValueAtTime(0.08, ctx.currentTime);
      lfoRef.current = lfo;

      const lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(volume * 0.1, ctx.currentTime);

      // Connect LFO to volume modulation
      lfo.connect(lfoGain);
      lfoGain.connect(gainNode.gain);

      source.connect(filterNode);
      filterNode.connect(gainNode);

      lfo.start();
    }

    gainNode.connect(ctx.destination);
    source.start();
    setActiveSound(sound);
  };

  useEffect(() => {
    if (gainNodeRef.current && audioCtxRef.current) {
      gainNodeRef.current.gain.setValueAtTime(volume * 0.15, audioCtxRef.current.currentTime);
    }
  }, [volume]);

  // Clean up audio nodes on unmount
  useEffect(() => {
    return () => {
      stopCurrent();
    };
  }, []);

  return (
    <div className="glass-panel" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(0,0,0,0.3)', border: '1px dashed var(--glass-border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ fontSize: '13px', color: 'var(--accent-color)' }}>🎧 Ambient Study Sounds</h4>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Procedural offline synthesis</span>
      </div>

      {/* Control Buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
        {(['off', 'rain', 'waves', 'static'] as SoundType[]).map(type => (
          <button
            key={type}
            className="btn"
            style={{
              padding: '6px 4px',
              fontSize: '11px',
              textTransform: 'capitalize',
              backgroundColor: activeSound === type ? 'rgba(var(--accent-color-rgb), 0.2)' : 'transparent',
              borderColor: activeSound === type ? 'var(--accent-color)' : 'var(--glass-border)'
            }}
            onClick={() => startSound(type)}
          >
            {type === 'off' && '🔇 Mute'}
            {type === 'rain' && '🌧️ Rain'}
            {type === 'waves' && '🌊 Waves'}
            {type === 'static' && '⚡ Focus'}
          </button>
        ))}
      </div>

      {/* Volume slider */}
      {activeSound !== 'off' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-secondary)' }}>
          <span>Vol:</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            style={{ flex: 1, accentColor: 'var(--accent-color)', height: '4px', cursor: 'pointer' }}
          />
          <span style={{ fontFamily: 'var(--font-mono)' }}>{Math.round(volume * 100)}%</span>
        </div>
      )}
    </div>
  );
};
