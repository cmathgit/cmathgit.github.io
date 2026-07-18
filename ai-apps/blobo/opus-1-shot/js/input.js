'use strict';

class InputManager {
    constructor() {
        this.keys = {};
        this.prev = {};
        this.buffer = {};
        this.BUFFER_TIME = 150; // ms — allows input queuing for responsive combat

        const handled = [
            'Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight',
            'KeyW','KeyA','KeyS','KeyD','KeyJ','KeyK','KeyL',
            'KeyQ','KeyE','KeyV','KeyZ','KeyX','KeyC','Enter','Escape'
        ];

        window.addEventListener('keydown', e => {
            if (handled.includes(e.code)) e.preventDefault();
            if (!this.keys[e.code]) {
                this.keys[e.code] = true;
                this.buffer[e.code] = performance.now();
            }
        });

        window.addEventListener('keyup', e => {
            this.keys[e.code] = false;
        });
    }

    update() {
        this.prev = { ...this.keys };
    }

    isDown(code) { return !!this.keys[code]; }

    justPressed(code) {
        return !!this.keys[code] && !this.prev[code];
    }

    /** Consumes a buffered press — used for attack combos so rapid presses aren't lost */
    buffered(code) {
        if (this.justPressed(code)) return true;
        const t = this.buffer[code];
        if (t && performance.now() - t < this.BUFFER_TIME) {
            this.buffer[code] = 0;
            return true;
        }
        return false;
    }

    /* ---- named accessors ---- */
    get left()      { return this.isDown('KeyA') || this.isDown('ArrowLeft'); }
    get right()     { return this.isDown('KeyD') || this.isDown('ArrowRight'); }
    get up()        { return this.isDown('KeyW') || this.isDown('ArrowUp'); }
    get down()      { return this.isDown('KeyS') || this.isDown('ArrowDown'); }
    get jump()      { return this.justPressed('KeyW') || this.justPressed('ArrowUp'); }
    get dodge()     { return this.justPressed('Space'); }
    get attack()    { return this.buffered('KeyJ') || this.buffered('KeyZ'); }
    get gun()       { return this.justPressed('KeyK') || this.justPressed('KeyX'); }
    get transform() { return this.justPressed('KeyL') || this.justPressed('KeyC'); }
    get heal()      { return this.justPressed('KeyQ') || this.justPressed('KeyV'); }
    get interact()  { return this.justPressed('KeyE'); }
    get confirm()   { return this.justPressed('Enter') || this.justPressed('Space'); }
}
