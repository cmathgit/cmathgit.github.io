export class Input {
    constructor(canvas) {
        this.canvas = canvas;
        this.keys = new Set();
        this.queue = [];
        this.enabled = false;
        this.tick = 0;
        this.dx = 0;
        this.dy = 0;
        this.guard = false;
        this.attackHeld = false;
        this.attackStart = 0;

        this.actions = {
            Space: 'roll',
            KeyQ: 'parry',
            KeyR: 'heal',
            KeyF: 'deliver',
            KeyE: 'interact',
            KeyI: 'inventory',
            Tab: 'lock'
        };

        addEventListener('keydown', event => {
            if (!this.enabled) return;

            if ([
                'Space', 'Tab', 'ArrowUp', 'ArrowDown',
                'ArrowLeft', 'ArrowRight'
            ].includes(event.code)) {
                event.preventDefault();
            }

            if (event.repeat) return;
            this.keys.add(event.code);

            const action = this.actions[event.code];
            if (action) this.push(action);
        });

        addEventListener('keyup', event => {
            this.keys.delete(event.code);
        });

        canvas.addEventListener('contextmenu', event => event.preventDefault());

        canvas.addEventListener('mousedown', event => {
            if (!this.enabled) return;

            if (event.button === 0) {
                this.attackHeld = true;
                this.attackStart = this.tick;
            }

            if (event.button === 2) this.guard = true;
            if (event.button === 1) {
                event.preventDefault();
                this.push('lock');
            }
        });

        addEventListener('mouseup', event => {
            if (event.button === 2) this.guard = false;

            if (event.button === 0 && this.attackHeld) {
                const charge = Math.min(1, (this.tick - this.attackStart) / 60);
                this.attackHeld = false;

                if (this.enabled) {
                    this.push(charge >= 0.35 ? 'heavy' : 'light', { charge });
                }
            }
        });

        addEventListener('mousemove', event => {
            if (this.enabled && document.pointerLockElement === canvas) {
                this.dx += event.movementX;
                this.dy += event.movementY;
            }
        });

        addEventListener('blur', () => this.clear());
    }

    setEnabled(value) {
        this.enabled = value;
        this.clear();
    }

    clear() {
        this.keys.clear();
        this.queue.length = 0;
        this.guard = false;
        this.attackHeld = false;
        this.dx = 0;
        this.dy = 0;
    }

    push(action, data = {}) {
        this.queue.push({ action, expires: this.tick + 10, ...data });
    }

    advance() {
        this.tick++;
        this.queue = this.queue.filter(item => item.expires >= this.tick);
    }

    take(action) {
        const index = this.queue.findIndex(item => item.action === action);
        if (index < 0) return null;
        return this.queue.splice(index, 1)[0];
    }

    takeAny(actions) {
        const index = this.queue.findIndex(item => actions.includes(item.action));
        if (index < 0) return null;
        return this.queue.splice(index, 1)[0];
    }

    down(code) {
        return this.keys.has(code);
    }

    look() {
        const result = { x: this.dx, y: this.dy };
        this.dx = 0;
        this.dy = 0;
        return result;
    }
}