// Web Audio API Synthesizer for Zero-Latency, Offline Action Sound Effects
class AudioFeedbackEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    try {
      const saved = localStorage.getItem('sdb_sound_enabled');
      this.isMuted = saved === 'false';
    } catch {
      this.isMuted = false;
    }
  }

  private initContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => null);
    }
    return this.ctx;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    try {
      localStorage.setItem('sdb_sound_enabled', String(!this.isMuted));
    } catch {
      // ignore storage error
    }
    if (!this.isMuted) {
      this.play('click');
    }
    return this.isMuted;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    try {
      localStorage.setItem('sdb_sound_enabled', String(!muted));
    } catch {
      // ignore storage error
    }
  }

  public play(
    type:
      | 'click'
      | 'add_to_cart'
      | 'remove_from_cart'
      | 'order_placed'
      | 'favorite'
      | 'delete'
      | 'notification'
      | 'stock_update'
  ) {
    if (this.isMuted) return;

    // Haptic feedback on mobile devices
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        if (type === 'add_to_cart' || type === 'favorite') {
          navigator.vibrate(15);
        } else if (type === 'order_placed') {
          navigator.vibrate([20, 40, 20]);
        } else if (type === 'delete') {
          navigator.vibrate(25);
        }
      } catch {
        // ignore haptic error
      }
    }

    try {
      const ctx = this.initContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      switch (type) {
        case 'click': {
          // Soft tactile click
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(600, now);
          osc.frequency.exponentialRampToValueAtTime(200, now + 0.04);

          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.045);
          break;
        }

        case 'add_to_cart': {
          // Melodic uplifting two-tone chime (E5 -> B5)
          const notes = [659.25, 987.77];
          notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const startTime = now + i * 0.07;

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, startTime);

            gain.gain.setValueAtTime(0.12, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.16);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(startTime);
            osc.stop(startTime + 0.18);
          });
          break;
        }

        case 'remove_from_cart': {
          // Soft downward tone
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(440, now);
          osc.frequency.exponentialRampToValueAtTime(220, now + 0.1);

          gain.gain.setValueAtTime(0.09, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.11);
          break;
        }

        case 'favorite': {
          // Gentle warm heart ping (A5 -> C#6)
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(880, now);
          osc.frequency.exponentialRampToValueAtTime(1108.73, now + 0.12);

          gain.gain.setValueAtTime(0.12, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.21);
          break;
        }

        case 'order_placed': {
          // Celebratory major harmonic chime (C5 -> E5 -> G5 -> C6)
          const chord = [523.25, 659.25, 783.99, 1046.5];
          chord.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const startTime = now + idx * 0.08;

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, startTime);

            gain.gain.setValueAtTime(0.14, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(startTime);
            osc.stop(startTime + 0.38);
          });
          break;
        }

        case 'delete': {
          // Soft low bass swoop
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(260, now);
          osc.frequency.exponentialRampToValueAtTime(80, now + 0.14);

          gain.gain.setValueAtTime(0.15, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.15);
          break;
        }

        case 'notification': {
          // Two pleasant bells (G5 -> D6)
          [783.99, 1174.66].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const startTime = now + i * 0.09;

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, startTime);

            gain.gain.setValueAtTime(0.11, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(startTime);
            osc.stop(startTime + 0.27);
          });
          break;
        }

        case 'stock_update': {
          // Crisp industrial ratchet / click
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(900, now);
          osc.frequency.exponentialRampToValueAtTime(300, now + 0.05);

          gain.gain.setValueAtTime(0.06, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.055);
          break;
        }
      }
    } catch {
      // AudioContext unavailable or autoplay blocked
    }
  }
}

export const audioFeedback = new AudioFeedbackEngine();
