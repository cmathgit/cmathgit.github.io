'use strict';

class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx    = canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = false;

        this.camera = { x: 0, y: 0 };
        this.shake  = { x: 0, y: 0, t: 0, max: 0, mag: 0 };

        this.tileCache = {};
        this._initTiles();
    }

    /* ============================================================
       Tile texture cache — procedurally drawn, cached to off-screen
       canvases so we only draw them once.
       ============================================================ */
    _initTiles() {
        const S = G.RTILE;
        this.tileCache[1]  = this._makeTile(S, '#3a3a4a', '#2d2d3d', 'brick');
        this.tileCache[2]  = this._makeTile(S, '#4a3a2a', '#3d2d1a', 'wood');
        this.tileCache[3]  = this._makeTile(S, '#2a2a3a', '#1d1d2d', 'sewer');
        this.tileCache[4]  = this._makeTile(S, '#4a4a5a', '#3a3a4a', 'cathedral');
        this.tileCache[10] = this._makeLamp(S);
        this.tileCache[11] = this._makeTile(S, '#5a4a2a', '#4a3a1a', 'crate');
    }

    _makeTile(S, c1, c2, style) {
        const c = document.createElement('canvas'); c.width = c.height = S;
        const x = c.getContext('2d');
        x.fillStyle = c1; x.fillRect(0, 0, S, S);
        x.fillStyle = c2;

        if (style === 'brick') {
            for (let r = 0; r < 4; r++) {
                const off = r % 2 ? S / 2 : 0;
                x.fillRect(0, r * (S / 4), S, 1);
                x.fillRect(off, r * (S / 4), 1, S / 4);
                x.fillRect(off + S / 2, r * (S / 4), 1, S / 4);
            }
            x.fillStyle = 'rgba(255,255,255,0.04)';
            x.fillRect(2, 2, S - 4, 1);
        } else if (style === 'wood') {
            for (let i = 0; i < S; i += 8) x.fillRect(i, 0, 1, S);
            x.fillStyle = 'rgba(255,255,255,0.07)'; x.fillRect(0, 2, S, 1);
        } else if (style === 'sewer') {
            for (let r = 0; r < 3; r++) x.fillRect(0, r * (S / 3) + S / 6, S, 2);
            x.fillStyle = '#1a3a1a'; x.fillRect(0, S - 5, S, 5);
        } else if (style === 'cathedral') {
            x.fillRect(S / 2 - 1, 0, 2, S); x.fillRect(0, S / 2, S, 2);
            x.fillStyle = 'rgba(255,255,255,0.04)'; x.fillRect(2, 2, S / 2 - 4, S / 2 - 4);
        } else if (style === 'crate') {
            x.strokeStyle = c2; x.lineWidth = 2;
            x.strokeRect(2, 2, S - 4, S - 4);
            x.beginPath(); x.moveTo(2, 2); x.lineTo(S - 2, S - 2);
            x.moveTo(S - 2, 2); x.lineTo(2, S - 2); x.stroke();
        }
        // Edge shadow
        x.fillStyle = 'rgba(0,0,0,0.15)';
        x.fillRect(0, S - 2, S, 2); x.fillRect(S - 2, 0, 2, S);
        return c;
    }

    _makeLamp(S) {
        const c = document.createElement('canvas'); c.width = c.height = S;
        const x = c.getContext('2d');
        x.fillStyle = '#555'; x.fillRect(S / 2 - 3, S / 4, 6, S * 3 / 4);
        x.fillStyle = '#aa8800'; x.fillRect(S / 2 - 7, S / 8, 14, S / 4);
        x.fillStyle = '#ffcc44'; x.fillRect(S / 2 - 5, S / 8 + 3, 10, S / 4 - 6);
        return c;
    }

    /* ============================================================
       Camera
       ============================================================ */
    updateCamera(tx, ty, levelW, levelH) {
        const cx = tx - G.W / 2;
        const cy = ty - G.H / 2;
        this.camera.x += (cx - this.camera.x) * 0.08;
        this.camera.y += (cy - this.camera.y) * 0.08;
        this.camera.x = Math.max(0, Math.min(levelW - G.W, this.camera.x));
        this.camera.y = Math.max(0, Math.min(levelH - G.H, this.camera.y));

        if (this.shake.t > 0) {
            this.shake.t--;
            const f = this.shake.mag * (this.shake.t / this.shake.max);
            this.shake.x = (Math.random() - 0.5) * f * 2;
            this.shake.y = (Math.random() - 0.5) * f * 2;
        } else {
            this.shake.x = this.shake.y = 0;
        }
    }

    addShake(mag, dur) {
        this.shake.mag = mag; this.shake.t = dur; this.shake.max = dur;
    }

    get camX() { return Math.round(this.camera.x + this.shake.x); }
    get camY() { return Math.round(this.camera.y + this.shake.y); }

    /* ============================================================
       Background — multi-layer parallax Yharnam skyline
       ============================================================ */
    clear() {
        this.ctx.fillStyle = '#0a0a12';
        this.ctx.fillRect(0, 0, G.W, G.H);
    }

    drawBackground() {
        const ctx = this.ctx, cam = this.camera;
        // Sky gradient
        const sg = ctx.createLinearGradient(0, 0, 0, G.H);
        sg.addColorStop(0, '#0a0a1a'); sg.addColorStop(0.4, '#1a1030'); sg.addColorStop(1, '#2a1a3a');
        ctx.fillStyle = sg; ctx.fillRect(0, 0, G.W, G.H);

        // Moon
        const mx = G.W * 0.78 - cam.x * 0.015, my = 55;
        ctx.fillStyle = '#eeddcc';
        ctx.beginPath(); ctx.arc(mx, my, 28, 0, Math.PI * 2); ctx.fill();
        const mg = ctx.createRadialGradient(mx, my, 18, mx, my, 110);
        mg.addColorStop(0, 'rgba(238,221,204,0.12)'); mg.addColorStop(1, 'rgba(238,221,204,0)');
        ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(mx, my, 110, 0, Math.PI * 2); ctx.fill();

        // Building layers
        this._buildings(cam.x * 0.08, '#15151f', 0.25, 190);
        this._buildings(cam.x * 0.2,  '#101018', 0.45, 260);
        this._buildings(cam.x * 0.4,  '#0c0c14', 0.65, 330);
    }

    _buildings(scroll, color, density, baseY) {
        const ctx = this.ctx;
        const seed = Math.floor(scroll / 100);
        for (let i = -2; i < 22; i++) {
            const bx = i * 70 - (scroll % 70);
            const r  = this._srand(seed + i);
            const bw = 25 + r * 45;
            const bh = 35 + r * 110 * density;
            ctx.fillStyle = color;
            ctx.fillRect(bx, baseY - bh, bw, bh + G.H);
            // Dim windows
            ctx.fillStyle = 'rgba(200,180,100,0.1)';
            for (let wy = baseY - bh + 10; wy < baseY - 10; wy += 18) {
                for (let wx = bx + 6; wx < bx + bw - 6; wx += 14) {
                    if (this._srand(seed + i + wy * 7 + wx * 3) > 0.55)
                        ctx.fillRect(wx, wy, 4, 5);
                }
            }
        }
    }

    _srand(s) { const x = Math.sin(s * 127.1) * 43758.5453; return x - Math.floor(x); }

    /* ============================================================
       Tiles
       ============================================================ */
    drawTiles(level) {
        const S = G.RTILE, cx = this.camX, cy = this.camY;
        const sc = Math.max(0, Math.floor(cx / S));
        const ec = Math.min(level.width,  Math.ceil((cx + G.W) / S) + 1);
        const sr = Math.max(0, Math.floor(cy / S));
        const er = Math.min(level.height, Math.ceil((cy + G.H) / S) + 1);

        for (let r = sr; r < er; r++) {
            for (let c = sc; c < ec; c++) {
                const t = level.getTile(c, r);
                if (t === 0) continue;
                const tex = this.tileCache[t];
                if (tex) this.ctx.drawImage(tex, c * S - cx, r * S - cy);
                else {
                    this.ctx.fillStyle = '#3a3a4a';
                    this.ctx.fillRect(c * S - cx, r * S - cy, S, S);
                }
            }
        }
    }

    /* ============================================================
       Fog gate drawing
       ============================================================ */
    drawFogGates(level) {
        const S = G.RTILE, cx = this.camX, cy = this.camY, ctx = this.ctx;
        for (const fg of level.fogGates) {
            if (!fg.active) continue;
            const fx = fg.x * S - cx, fy = fg.y * S - cy;
            for (let row = 0; row < 5; row++) {
                const alpha = 0.15 + Math.sin(G.time * 0.003 + row) * 0.08;
                ctx.fillStyle = `rgba(180,180,220,${alpha})`;
                ctx.fillRect(fx, fy + row * S, S, S);
            }
        }
    }

    /* ============================================================
       Lighting overlays
       ============================================================ */
    drawLampGlow(level) {
        const S = G.RTILE, cx = this.camX, cy = this.camY, ctx = this.ctx;
        for (const lamp of level.lamps) {
            const lx = lamp.x * S + S / 2 - cx;
            const ly = lamp.y * S - cy;
            if (lx < -200 || lx > G.W + 200) continue;
            const g = ctx.createRadialGradient(lx, ly, 8, lx, ly, 140);
            g.addColorStop(0, 'rgba(255,170,0,0.10)');
            g.addColorStop(0.5, 'rgba(255,120,0,0.04)');
            g.addColorStop(1, 'rgba(255,100,0,0)');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(lx, ly, 140, 0, Math.PI * 2); ctx.fill();
        }
    }

    drawVignette() {
        const g = this.ctx.createRadialGradient(
            G.W / 2, G.H / 2, G.W * 0.3,
            G.W / 2, G.H / 2, G.W * 0.7
        );
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(1, 'rgba(0,0,0,0.45)');
        this.ctx.fillStyle = g;
        this.ctx.fillRect(0, 0, G.W, G.H);
    }

    /* ============================================================
       Item / echo / message rendering
       ============================================================ */
    drawItems(level) {
        const S = G.RTILE, cx = this.camX, cy = this.camY, ctx = this.ctx;
        for (const item of level.items) {
            if (item.collected) continue;
            const ix = item.x * S + S / 2 - cx;
            const iy = item.y * S + S / 2 - cy + Math.sin(G.time * 0.004) * 4;
            // Blood vial glow
            ctx.fillStyle = '#cc3333';
            ctx.fillRect(ix - 4, iy - 8, 8, 16);
            ctx.fillStyle = '#ff4444';
            ctx.fillRect(ix - 3, iy - 6, 6, 12);
            // Glow
            ctx.globalAlpha = 0.3 + Math.sin(G.time * 0.005) * 0.1;
            const ig = ctx.createRadialGradient(ix, iy, 2, ix, iy, 25);
            ig.addColorStop(0, 'rgba(255,60,60,0.3)');
            ig.addColorStop(1, 'rgba(255,60,60,0)');
            ctx.fillStyle = ig;
            ctx.beginPath(); ctx.arc(ix, iy, 25, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1;
        }
    }

    drawDroppedEchoes(echoes) {
        if (!echoes || !echoes.active) return;
        const cx = this.camX, cy = this.camY, ctx = this.ctx;
        const ex = echoes.x - cx, ey = echoes.y - cy;
        const pulse = Math.sin(G.time * 0.006) * 0.15 + 0.6;
        ctx.globalAlpha = pulse;
        ctx.fillStyle = '#88ccff';
        ctx.fillRect(ex - 6, ey - 6, 12, 12);
        const eg = ctx.createRadialGradient(ex, ey, 3, ex, ey, 30);
        eg.addColorStop(0, 'rgba(130,200,255,0.4)');
        eg.addColorStop(1, 'rgba(130,200,255,0)');
        ctx.fillStyle = eg;
        ctx.beginPath(); ctx.arc(ex, ey, 30, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
    }

    drawMessages(level, playerX) {
        const S = G.RTILE, cx = this.camX, cy = this.camY, ctx = this.ctx;
        for (const msg of level.messages) {
            const dist = Math.abs(playerX - msg.x * S);
            if (dist > S * 3) continue;
            const mx = msg.x * S + S / 2 - cx;
            const my = msg.y * S - 10 - cy;
            ctx.globalAlpha = Math.max(0, 1 - dist / (S * 3));
            ctx.fillStyle = '#ddd';
            ctx.font = '13px "Courier New", monospace';
            ctx.textAlign = 'center';
            ctx.fillText(msg.text, mx, my);
            ctx.globalAlpha = 1;
        }
    }
}
