/**
 * TAP RUSH — High Performance Web Audio API Synthesizer
 * 100% Procedural Audio with Zero External Assets
 */

class SoundController {
  constructor() {
    this.ctx = null;
    let muted = false;
    try {
      muted = localStorage.getItem('tap_rush_sound_muted') === 'true';
    } catch (e) {
      muted = false;
    }
    this.isMuted = muted;
    this.masterGain = null;
  }

  init() {
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
          this.masterGain = this.ctx.createGain();
          this.masterGain.gain.value = this.isMuted ? 0 : 0.28;
          this.masterGain.connect(this.ctx.destination);
        }
      } else if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    } catch (e) {
      console.warn("AudioContext init warning:", e);
    }
  }

  toggleMute() {
    this.init();
    this.isMuted = !this.isMuted;
    try {
      localStorage.setItem('tap_rush_sound_muted', this.isMuted);
    } catch (e) {}
    if (this.masterGain && this.ctx) {
      try {
        this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.28, this.ctx.currentTime);
      } catch (e) {}
    }
    return this.isMuted;
  }

  // Generic tone builder helper
  createTone(freq, type = 'sine', duration = 0.1, startTime = 0) {
    if (!this.ctx || this.isMuted) return null;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime + startTime);

    gain.gain.setValueAtTime(0.3, this.ctx.currentTime + startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + startTime + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(this.ctx.currentTime + startTime);
    osc.stop(this.ctx.currentTime + startTime + duration);
    return { osc, gain };
  }

  // Hit sound with pitch scaling based on combo
  playHit(combo = 1) {
    this.init();
    if (!this.ctx || this.isMuted) return;

    const baseFreq = 480;
    const comboBoost = Math.min(combo * 35, 600);
    const freq = baseFreq + comboBoost;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.35, this.ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  // Golden star bonus chime (upward arpeggio)
  playGoldBonus() {
    this.init();
    if (!this.ctx || this.isMuted) return;

    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      this.createTone(freq, 'sine', 0.15, idx * 0.05);
    });
  }

  // Freeze time sound (crystalline resonant sweep)
  playFreeze() {
    this.init();
    if (!this.ctx || this.isMuted) return;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.35);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(350, this.ctx.currentTime + 0.35);
    filter.Q.value = 8;

    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.38);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.4);
  }

  // Hazard bomb hit (deep noise explosion + crunch)
  playBomb() {
    this.init();
    if (!this.ctx || this.isMuted) return;

    // 1. Low punch sawtooth
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(35, this.ctx.currentTime + 0.3);

    gain.gain.setValueAtTime(0.6, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.35);

    // 2. White noise burst
    try {
      const bufferSize = this.ctx.sampleRate * 0.25;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'lowpass';
      noiseFilter.frequency.setValueAtTime(600, this.ctx.currentTime);
      noiseFilter.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.25);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.5, this.ctx.currentTime);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.masterGain);

      noise.start();
      noise.stop(this.ctx.currentTime + 0.25);
    } catch (e) {
      // Fallback safe if buffer fails
    }
  }

  // Boss target hit
  playBossHit(remainingHits) {
    this.init();
    if (!this.ctx || this.isMuted) return;
    const freq = 240 + (3 - remainingHits) * 120;
    this.createTone(freq, 'square', 0.12);
  }

  // Combo milestone celebration stinger
  playComboMilestone() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    const chords = [587.33, 739.99, 880.00, 1174.66]; // D5, F#5, A5, D6
    chords.forEach((freq, idx) => {
      this.createTone(freq, 'triangle', 0.25, idx * 0.04);
    });
  }

  // Miss tap sound (subtle dull thud)
  playMiss() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(60, this.ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  // Countdown timer tick
  playTick(isUrgent = false) {
    this.init();
    if (!this.ctx || this.isMuted) return;

    if (isUrgent) {
      this.createTone(880, 'sine', 0.05);
      this.createTone(1760, 'sine', 0.04, 0.01);
    } else {
      this.createTone(440, 'triangle', 0.04);
    }
  }

  // Ready 3-2-1 Countdown Beep
  playCountBeep(isFinal = false) {
    this.init();
    if (!this.ctx || this.isMuted) return;
    if (isFinal) {
      this.createTone(987.77, 'square', 0.3); // B5
    } else {
      this.createTone(493.88, 'sine', 0.15); // B4
    }
  }

  // Game over fanfare
  playGameOver(isHighScore = false) {
    this.init();
    if (!this.ctx || this.isMuted) return;

    if (isHighScore) {
      const fanfare = [
        { f: 523.25, d: 0.12, t: 0 },
        { f: 659.25, d: 0.12, t: 0.12 },
        { f: 783.99, d: 0.12, t: 0.24 },
        { f: 1046.5, d: 0.45, t: 0.36 }
      ];
      fanfare.forEach(n => this.createTone(n.f, 'triangle', n.d, n.t));
    } else {
      const jingle = [
        { f: 587.33, d: 0.12, t: 0 },
        { f: 523.25, d: 0.12, t: 0.14 },
        { f: 440.00, d: 0.35, t: 0.28 }
      ];
      jingle.forEach(n => this.createTone(n.f, 'sine', n.d, n.t));
    }
  }

  // UI button click feedback
  playClick() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    this.createTone(720, 'sine', 0.04);
  }
}

// Global sound instance
window.soundCtrl = new SoundController();
