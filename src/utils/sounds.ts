class SoundSystem {
  private ctx: AudioContext | null = null;
  private enabled: boolean = localStorage.getItem('lakshya_sounds_enabled') !== 'false';

  private getContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  toggle(enabled: boolean) {
    this.enabled = enabled;
    localStorage.setItem('lakshya_sounds_enabled', enabled ? 'true' : 'false');
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  playClick() {
    if (!this.isEnabled()) return;
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1000, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(350, ctx.currentTime + 0.04);
      
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch (e) {}
  }

  playOpen() {
    if (!this.isEnabled()) return;
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(700, ctx.currentTime + 0.12);
      
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.13);
    } catch (e) {}
  }

  playClose() {
    if (!this.isEnabled()) return;
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(650, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(250, ctx.currentTime + 0.12);
      
      gain.gain.setValueAtTime(0.03, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.13);
    } catch (e) {}
  }

  playUnlock() {
    if (!this.isEnabled()) return;
    try {
      const ctx = this.getContext();
      
      const playNote = (freq: number, startDelay: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + startDelay);
        gain.gain.setValueAtTime(0.05, ctx.currentTime + startDelay);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startDelay + duration);
        osc.start(ctx.currentTime + startDelay);
        osc.stop(ctx.currentTime + startDelay + duration + 0.02);
      };
      
      playNote(523.25, 0, 0.12); // C5
      playNote(659.25, 0.06, 0.2); // E5
    } catch (e) {}
  }

  playSuccess() {
    if (!this.isEnabled()) return;
    try {
      const ctx = this.getContext();
      
      const playNote = (freq: number, startDelay: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + startDelay);
        gain.gain.setValueAtTime(0.05, ctx.currentTime + startDelay);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startDelay + duration);
        osc.start(ctx.currentTime + startDelay);
        osc.stop(ctx.currentTime + startDelay + duration + 0.02);
      };
      
      playNote(523.25, 0, 0.1);
      playNote(659.25, 0.05, 0.1);
      playNote(783.99, 0.1, 0.25); // C5 - E5 - G5 chord progression
    } catch (e) {}
  }

  playError() {
    if (!this.isEnabled()) return;
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.16);
    } catch (e) {}
  }
}

export const sounds = new SoundSystem();
