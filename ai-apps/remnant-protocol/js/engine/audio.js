export class Sound {
    constructor() {
        this.context = null;
        this.master = null;
    }

    async unlock() {
        try {
            if (!this.context) {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                if (!AudioContext) return;

                this.context = new AudioContext();
                this.master = this.context.createGain();
                this.master.gain.value = 0.16;
                this.master.connect(this.context.destination);
            }

            await this.context.resume();
        } catch {
            // Audio availability should never stop gameplay.
        }
    }

    tone(startHz, endHz, duration, type = 'sine', volume = 0.5) {
        const context = this.context;
        if (!context || context.state !== 'running') return;

        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const now = context.currentTime;

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(Math.max(1, startHz), now);
        oscillator.frequency.exponentialRampToValueAtTime(
            Math.max(1, endHz), now + duration
        );

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(volume, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        oscillator.connect(gain);
        gain.connect(this.master);

        oscillator.start(now);
        oscillator.stop(now + duration + 0.02);
        oscillator.onended = () => {
            oscillator.disconnect();
            gain.disconnect();
        };
    }

    playSlash() {
        this.tone(360, 60, 0.15, 'sawtooth', 0.2);
    }

    playHit() {
        this.tone(110, 35, 0.18, 'triangle', 0.8);
    }

    playBlock() {
        this.tone(650, 170, 0.12, 'square', 0.25);
    }

    playParry() {
        [880, 1320, 1760].forEach(hz => {
            this.tone(hz, hz * 0.93, 0.65, 'sine', 0.4);
        });
    }

    playTelegraph(unblockable = false) {
        this.tone(
            unblockable ? 75 : 460,
            unblockable ? 40 : 700,
            0.3,
            'triangle',
            0.3
        );
    }

    playPrayer() {
        [261.63, 329.63, 392].forEach(hz => {
            this.tone(hz, hz, 0.8, 'sine', 0.3);
        });
    }

    playBossPhase2() {
        this.tone(180, 25, 1.8, 'sawtooth', 0.5);
    }
}