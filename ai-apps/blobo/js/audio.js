'use strict';

class AudioManager {
    constructor() {
        this.ctx = null;
        this.initialized = false;
        this.masterGain = null;
        this.sfxGain = null;
        this.musicGain = null;
        this._bossDrone = null;
    }

    init() {
        if (this.initialized) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.35;
            this.masterGain.connect(this.ctx.destination);

            this.sfxGain = this.ctx.createGain();
            this.sfxGain.gain.value = 0.5;
            this.sfxGain.connect(this.masterGain);

            this.musicGain = this.ctx.createGain();
            this.musicGain.gain.value = 0.18;
            this.musicGain.connect(this.masterGain);

            this.initialized = true;
        } catch (e) { console.warn('Web Audio not available'); }

        // Setup HTML5 Audio for BGM
        this.tracks = {
            voice: new Audio('audio/beastman-voice.mp3'),
            levelOne: new Audio('audio/level-one-music.mp3'),
            sewer: new Audio('audio/sewer-music.mp3'),
            boss: new Audio('audio/boss-music.mp3')
        };

        this.tracks.levelOne.loop = true;
        this.tracks.sewer.loop = true;
        this.tracks.boss.loop = true;

        for (const key in this.tracks) {
            this.tracks[key].volume = 0.4;
        }

        this.currentTrack = null;
        this.bossLocked = false;
    }

    /* ---- helpers ---- */
    _noise(dur) {
        const sr = this.ctx.sampleRate;
        const buf = this.ctx.createBuffer(1, sr * dur, sr);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        return buf;
    }

    _play(setup) {
        if (!this.initialized) return;
        setup(this.ctx, this.ctx.currentTime);
    }

    /* ---- SFX ---- */
    slash() {
        this._play((a, t) => {
            const n = a.createBufferSource(); n.buffer = this._noise(0.15);
            const f = a.createBiquadFilter(); f.type = 'bandpass';
            f.frequency.setValueAtTime(2000, t); f.frequency.exponentialRampToValueAtTime(500, t + 0.1);
            f.Q.value = 2;
            const g = a.createGain(); g.gain.setValueAtTime(0.4, t); g.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
            n.connect(f).connect(g).connect(this.sfxGain); n.start(t); n.stop(t + 0.15);
        });
    }

    heavySlash() {
        this._play((a, t) => {
            const n = a.createBufferSource(); n.buffer = this._noise(0.25);
            const f = a.createBiquadFilter(); f.type = 'bandpass';
            f.frequency.setValueAtTime(1200, t); f.frequency.exponentialRampToValueAtTime(300, t + 0.2);
            f.Q.value = 3;
            const g = a.createGain(); g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.01, t + 0.22);
            n.connect(f).connect(g).connect(this.sfxGain); n.start(t); n.stop(t + 0.25);
        });
    }

    gunshot() {
        this._play((a, t) => {
            const o = a.createOscillator(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(50, t + 0.1);
            const g1 = a.createGain(); g1.gain.setValueAtTime(0.6, t); g1.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
            o.connect(g1).connect(this.sfxGain); o.start(t); o.stop(t + 0.1);

            const n = a.createBufferSource(); n.buffer = this._noise(0.08);
            const g2 = a.createGain(); g2.gain.setValueAtTime(0.5, t); g2.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
            n.connect(g2).connect(this.sfxGain); n.start(t); n.stop(t + 0.08);
        });
    }

    parry() {
        this._play((a, t) => {
            const o = a.createOscillator(); o.type = 'sine';
            o.frequency.setValueAtTime(800, t); o.frequency.exponentialRampToValueAtTime(400, t + 0.3);
            const g = a.createGain(); g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
            o.connect(g).connect(this.sfxGain); o.start(t); o.stop(t + 0.4);
        });
    }

    visceral() {
        this._play((a, t) => {
            const n = a.createBufferSource(); n.buffer = this._noise(0.3);
            const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 800; f.Q.value = 5;
            const g = a.createGain();
            g.gain.setValueAtTime(0.7, t);
            g.gain.linearRampToValueAtTime(0.3, t + 0.05);
            g.gain.linearRampToValueAtTime(0.6, t + 0.1);
            g.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
            n.connect(f).connect(g).connect(this.sfxGain); n.start(t); n.stop(t + 0.3);
        });
    }

    dodge() {
        this._play((a, t) => {
            const n = a.createBufferSource(); n.buffer = this._noise(0.1);
            const f = a.createBiquadFilter(); f.type = 'highpass'; f.frequency.setValueAtTime(3000, t);
            const g = a.createGain(); g.gain.setValueAtTime(0.2, t); g.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
            n.connect(f).connect(g).connect(this.sfxGain); n.start(t); n.stop(t + 0.1);
        });
    }

    hit() {
        this._play((a, t) => {
            const o = a.createOscillator(); o.frequency.setValueAtTime(200, t); o.frequency.exponentialRampToValueAtTime(80, t + 0.08);
            const g = a.createGain(); g.gain.setValueAtTime(0.4, t); g.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
            o.connect(g).connect(this.sfxGain); o.start(t); o.stop(t + 0.1);
        });
    }

    playerHurt() {
        this._play((a, t) => {
            const o = a.createOscillator(); o.type = 'sawtooth';
            o.frequency.setValueAtTime(300, t); o.frequency.exponentialRampToValueAtTime(100, t + 0.15);
            const g = a.createGain(); g.gain.setValueAtTime(0.3, t); g.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
            o.connect(g).connect(this.sfxGain); o.start(t); o.stop(t + 0.15);
        });
    }

    heal() {
        this._play((a, t) => {
            const o = a.createOscillator(); o.type = 'sine';
            o.frequency.setValueAtTime(400, t); o.frequency.linearRampToValueAtTime(800, t + 0.3);
            const g = a.createGain(); g.gain.setValueAtTime(0.3, t); g.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
            o.connect(g).connect(this.sfxGain); o.start(t); o.stop(t + 0.4);
        });
    }

    enemyDeath() {
        this._play((a, t) => {
            const n = a.createBufferSource(); n.buffer = this._noise(0.4);
            const f = a.createBiquadFilter(); f.type = 'lowpass';
            f.frequency.setValueAtTime(1000, t); f.frequency.exponentialRampToValueAtTime(100, t + 0.4);
            const g = a.createGain(); g.gain.setValueAtTime(0.4, t); g.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
            n.connect(f).connect(g).connect(this.sfxGain); n.start(t); n.stop(t + 0.4);
        });
    }

    bossRoar() {
        this._play((a, t) => {
            const o = a.createOscillator(); o.type = 'sawtooth';
            o.frequency.setValueAtTime(100, t); o.frequency.linearRampToValueAtTime(200, t + 0.2);
            o.frequency.linearRampToValueAtTime(80, t + 0.6);
            const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500;
            const g = a.createGain(); g.gain.setValueAtTime(0.5, t);
            g.gain.linearRampToValueAtTime(0.6, t + 0.2);
            g.gain.exponentialRampToValueAtTime(0.01, t + 0.8);
            o.connect(f).connect(g).connect(this.sfxGain); o.start(t); o.stop(t + 0.8);
        });
    }

    transformWeapon() {
        this._play((a, t) => {
            // Click
            const o = a.createOscillator();
            o.frequency.setValueAtTime(1200, t); o.frequency.exponentialRampToValueAtTime(200, t + 0.05);
            const g = a.createGain(); g.gain.setValueAtTime(0.3, t); g.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
            o.connect(g).connect(this.sfxGain); o.start(t); o.stop(t + 0.08);
            // Swoosh
            const n = a.createBufferSource(); n.buffer = this._noise(0.12);
            const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2500;
            const g2 = a.createGain(); g2.gain.setValueAtTime(0, t);
            g2.gain.linearRampToValueAtTime(0.25, t + 0.05);
            g2.gain.exponentialRampToValueAtTime(0.01, t + 0.17);
            n.connect(f).connect(g2).connect(this.sfxGain); n.start(t + 0.05); n.stop(t + 0.17);
        });
    }

    pickup() {
        this._play((a, t) => {
            const o = a.createOscillator(); o.type = 'sine';
            o.frequency.setValueAtTime(600, t); o.frequency.linearRampToValueAtTime(900, t + 0.1);
            const g = a.createGain(); g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
            o.connect(g).connect(this.sfxGain); o.start(t); o.stop(t + 0.15);
        });
    }

    /* ---- Music ---- */
    playVoice() {
        if (!this.initialized) return;
        this.tracks.voice.currentTime = 0;
        this.tracks.voice.play().catch(e => console.warn("Audio play failed:", e));
    }

    _switchTrack(newTrack) {
        if (this.currentTrack === newTrack) return;

        // Stop current track
        if (this.currentTrack) {
            this.currentTrack.pause();
        }

        this.currentTrack = newTrack;

        // Play new track
        if (this.currentTrack) {
            this.currentTrack.play().catch(e => console.warn("Audio play failed:", e));
        }
    }

    updateMusicArea(playerX, gameState) {
        if (!this.initialized) return;

        // If player won, boss track continues but does not loop
        if (gameState === 'VICTORY') {
            if (this.tracks.boss) this.tracks.boss.loop = false;
            return;
        }

        // If player died, stop boss music lock and silence everything
        if (gameState === 'DEATH') {
            this.bossLocked = false;
            this._switchTrack(null);
            return;
        }

        // Handle boss fog trigger: Boss music locks on until death or victory
        if (gameState === 'BOSS_INTRO' || gameState === 'BOSS' || this.bossLocked) {
            this.bossLocked = true;
            this._switchTrack(this.tracks.boss);
            return;
        }

        // Standard Area Music
        const col = Math.floor(playerX / 48); // G.RTILE is 48

        if (col < 100) {
            this._switchTrack(this.tracks.levelOne);
        } else if (col >= 100 && col < 140) {
            this._switchTrack(this.tracks.sewer);
        } else if (col >= 140 && col < 170) {
            this._switchTrack(null); // Cathedral is silent
        }
    }
}
