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
    slash() { this._play((a, t) => {
        const n = a.createBufferSource(); n.buffer = this._noise(0.15);
        const f = a.createBiquadFilter(); f.type = 'bandpass';
        f.frequency.setValueAtTime(2000, t); f.frequency.exponentialRampToValueAtTime(500, t + 0.1);
        f.Q.value = 2;
        const g = a.createGain(); g.gain.setValueAtTime(0.4, t); g.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
        n.connect(f).connect(g).connect(this.sfxGain); n.start(t); n.stop(t + 0.15);
    }); }

    heavySlash() { this._play((a, t) => {
        const n = a.createBufferSource(); n.buffer = this._noise(0.25);
        const f = a.createBiquadFilter(); f.type = 'bandpass';
        f.frequency.setValueAtTime(1200, t); f.frequency.exponentialRampToValueAtTime(300, t + 0.2);
        f.Q.value = 3;
        const g = a.createGain(); g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.01, t + 0.22);
        n.connect(f).connect(g).connect(this.sfxGain); n.start(t); n.stop(t + 0.25);
    }); }

    gunshot() { this._play((a, t) => {
        const o = a.createOscillator(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(50, t + 0.1);
        const g1 = a.createGain(); g1.gain.setValueAtTime(0.6, t); g1.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
        o.connect(g1).connect(this.sfxGain); o.start(t); o.stop(t + 0.1);

        const n = a.createBufferSource(); n.buffer = this._noise(0.08);
        const g2 = a.createGain(); g2.gain.setValueAtTime(0.5, t); g2.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
        n.connect(g2).connect(this.sfxGain); n.start(t); n.stop(t + 0.08);
    }); }

    parry() { this._play((a, t) => {
        const o = a.createOscillator(); o.type = 'sine';
        o.frequency.setValueAtTime(800, t); o.frequency.exponentialRampToValueAtTime(400, t + 0.3);
        const g = a.createGain(); g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
        o.connect(g).connect(this.sfxGain); o.start(t); o.stop(t + 0.4);
    }); }

    visceral() { this._play((a, t) => {
        const n = a.createBufferSource(); n.buffer = this._noise(0.3);
        const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 800; f.Q.value = 5;
        const g = a.createGain();
        g.gain.setValueAtTime(0.7, t);
        g.gain.linearRampToValueAtTime(0.3, t + 0.05);
        g.gain.linearRampToValueAtTime(0.6, t + 0.1);
        g.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
        n.connect(f).connect(g).connect(this.sfxGain); n.start(t); n.stop(t + 0.3);
    }); }

    dodge() { this._play((a, t) => {
        const n = a.createBufferSource(); n.buffer = this._noise(0.1);
        const f = a.createBiquadFilter(); f.type = 'highpass'; f.frequency.setValueAtTime(3000, t);
        const g = a.createGain(); g.gain.setValueAtTime(0.2, t); g.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
        n.connect(f).connect(g).connect(this.sfxGain); n.start(t); n.stop(t + 0.1);
    }); }

    hit() { this._play((a, t) => {
        const o = a.createOscillator(); o.frequency.setValueAtTime(200, t); o.frequency.exponentialRampToValueAtTime(80, t + 0.08);
        const g = a.createGain(); g.gain.setValueAtTime(0.4, t); g.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
        o.connect(g).connect(this.sfxGain); o.start(t); o.stop(t + 0.1);
    }); }

    playerHurt() { this._play((a, t) => {
        const o = a.createOscillator(); o.type = 'sawtooth';
        o.frequency.setValueAtTime(300, t); o.frequency.exponentialRampToValueAtTime(100, t + 0.15);
        const g = a.createGain(); g.gain.setValueAtTime(0.3, t); g.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
        o.connect(g).connect(this.sfxGain); o.start(t); o.stop(t + 0.15);
    }); }

    heal() { this._play((a, t) => {
        const o = a.createOscillator(); o.type = 'sine';
        o.frequency.setValueAtTime(400, t); o.frequency.linearRampToValueAtTime(800, t + 0.3);
        const g = a.createGain(); g.gain.setValueAtTime(0.3, t); g.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
        o.connect(g).connect(this.sfxGain); o.start(t); o.stop(t + 0.4);
    }); }

    enemyDeath() { this._play((a, t) => {
        const n = a.createBufferSource(); n.buffer = this._noise(0.4);
        const f = a.createBiquadFilter(); f.type = 'lowpass';
        f.frequency.setValueAtTime(1000, t); f.frequency.exponentialRampToValueAtTime(100, t + 0.4);
        const g = a.createGain(); g.gain.setValueAtTime(0.4, t); g.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
        n.connect(f).connect(g).connect(this.sfxGain); n.start(t); n.stop(t + 0.4);
    }); }

    bossRoar() { this._play((a, t) => {
        const o = a.createOscillator(); o.type = 'sawtooth';
        o.frequency.setValueAtTime(100, t); o.frequency.linearRampToValueAtTime(200, t + 0.2);
        o.frequency.linearRampToValueAtTime(80, t + 0.6);
        const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500;
        const g = a.createGain(); g.gain.setValueAtTime(0.5, t);
        g.gain.linearRampToValueAtTime(0.6, t + 0.2);
        g.gain.exponentialRampToValueAtTime(0.01, t + 0.8);
        o.connect(f).connect(g).connect(this.sfxGain); o.start(t); o.stop(t + 0.8);
    }); }

    transformWeapon() { this._play((a, t) => {
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
    }); }

    pickup() { this._play((a, t) => {
        const o = a.createOscillator(); o.type = 'sine';
        o.frequency.setValueAtTime(600, t); o.frequency.linearRampToValueAtTime(900, t + 0.1);
        const g = a.createGain(); g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
        o.connect(g).connect(this.sfxGain); o.start(t); o.stop(t + 0.15);
    }); }

    /* ---- Music ---- */
    startBossMusic() {
        if (!this.initialized || this._bossDrone) return;
        const a = this.ctx, t = a.currentTime;

        const drone = a.createOscillator(); drone.type = 'sawtooth'; drone.frequency.value = 55;
        const df = a.createBiquadFilter(); df.type = 'lowpass'; df.frequency.value = 200;
        const dg = a.createGain(); dg.gain.value = 0.15;
        drone.connect(df).connect(dg).connect(this.musicGain); drone.start(t);

        const o2 = a.createOscillator(); o2.type = 'sine'; o2.frequency.value = 110;
        const lfo = a.createOscillator(); lfo.frequency.value = 0.5;
        const lg = a.createGain(); lg.gain.value = 20;
        lfo.connect(lg).connect(o2.frequency); lfo.start(t);
        const og = a.createGain(); og.gain.value = 0.08;
        o2.connect(og).connect(this.musicGain); o2.start(t);

        // Rhythmic pulse
        const pulse = a.createOscillator(); pulse.type = 'square'; pulse.frequency.value = 55;
        const plfo = a.createOscillator(); plfo.frequency.value = 1.5;
        const plg = a.createGain(); plg.gain.value = 0.8;
        plfo.connect(plg).connect(pulse.frequency);
        plfo.start(t);
        const pg = a.createGain(); pg.gain.value = 0.06;
        pulse.connect(pg).connect(this.musicGain); pulse.start(t);

        this._bossDrone = { nodes: [drone, o2, lfo, pulse, plfo], gains: [dg, og, pg] };
    }

    stopBossMusic() {
        if (!this._bossDrone) return;
        const t = this.ctx.currentTime;
        for (const g of this._bossDrone.gains) {
            g.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
        }
        const nodes = this._bossDrone.nodes;
        this._bossDrone = null;
        setTimeout(() => { for (const n of nodes) try { n.stop(); } catch(e){} }, 2000);
    }

    startAmbient() {
        if (!this.initialized || this._ambient) return;
        const a = this.ctx, t = a.currentTime;
        // Low wind
        const n = a.createBufferSource(); n.buffer = this._noise(4); n.loop = true;
        const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 300;
        const g = a.createGain(); g.gain.value = 0.04;
        n.connect(f).connect(g).connect(this.musicGain); n.start(t);
        this._ambient = { node: n, gain: g };
    }

    stopAmbient() {
        if (!this._ambient) return;
        try { this._ambient.node.stop(); } catch(e) {}
        this._ambient = null;
    }
}
