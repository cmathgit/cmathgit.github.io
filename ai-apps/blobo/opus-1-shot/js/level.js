'use strict';

class Level {
    constructor() {
        this.width   = 200;
        this.height  = 25;
        this.tiles   = [];
        this.lamps   = [];
        this.fogGates = [];
        this.items   = [];
        this.messages = [];
        this.enemySpawns = [];
        this.bossSpawn   = null;
        this.playerStart = { x: 5, y: 18 };

        this._generate();
    }

    /* ============================================================
       Level generation — procedural tile placement by section
       ============================================================ */
    _generate() {
        const W = this.width, H = this.height;
        this.tiles = Array.from({ length: H }, () => new Array(W).fill(0));

        const fill = (x, y, w, h, t) => {
            for (let r = y; r < y + h && r < H; r++)
                for (let c = x; c < x + w && c < W; c++)
                    if (r >= 0 && c >= 0) this.tiles[r][c] = t;
        };

        /* ---- Section 1 : Start / Lamp  (0–24) ---- */
        fill(0, 20, 25, 5, 1);          // Ground
        fill(0, 0, 1, 25, 1);           // Left wall
        this.tiles[19][5] = 10;          // Lamp
        this.lamps.push({ x: 5, y: 19 });
        this.messages.push({ x: 3,  y: 18, text: '[J/Z] Attack   [Space] Dodge   [W/↑] Jump' });
        this.messages.push({ x: 10, y: 18, text: '[K/X] Gun Parry — shoot during enemy wind-up!' });
        this.messages.push({ x: 17, y: 18, text: '[L/C] Transform Weapon   [Q/V] Blood Vial' });

        /* ---- Section 2 : City Streets  (25–69) ---- */
        fill(25, 20, 45, 5, 1);          // Ground
        fill(29, 10, 3, 10, 1);          // Building wall L
        fill(35, 16, 6, 1, 2);           // Platform
        fill(45, 14, 5, 1, 2);           // High platform
        fill(55, 16, 6, 1, 2);           // Platform
        fill(63, 10, 3, 10, 1);          // Building wall R
        this.tiles[19][40] = 11;          // Crate
        this.tiles[19][41] = 11;          // Crate
        this.tiles[19][50] = 11;          // Crate

        this.enemySpawns.push({ type: 'huntsman', x: 36, y: 19, patrolL: 33, patrolR: 39 });
        this.enemySpawns.push({ type: 'huntsman', x: 50, y: 19, patrolL: 47, patrolR: 55 });
        this.enemySpawns.push({ type: 'huntsman', x: 60, y: 19, patrolL: 57, patrolR: 62 });

        this.items.push({ x: 45, y: 13, type: 'bloodVial', collected: false });

        /* ---- Section 3 : Bridge  (66–99) ---- */
        fill(66, 20, 4, 5, 1);           // Ramp start
        fill(70, 18, 30, 2, 1);          // Bridge deck
        fill(70, 23, 30, 2, 1);          // Pit floor below bridge
        fill(70, 17, 1, 1, 1);           // Railing L
        fill(99, 17, 1, 1, 1);           // Railing R

        this.enemySpawns.push({ type: 'beast',    x: 82, y: 17, patrolL: 74, patrolR: 92 });
        this.enemySpawns.push({ type: 'huntsman',  x: 92, y: 17, patrolL: 88, patrolR: 98 });

        /* ---- Section 4 : Descent + Sewer  (100–139) ---- */
        fill(100, 18, 5, 7, 1);          // Landing
        fill(105, 19, 4, 6, 1);          // Step 1
        fill(109, 20, 4, 5, 1);          // Step 2
        fill(113, 21, 27, 4, 3);         // Sewer floor
        fill(113, 10, 1, 11, 3);         // Sewer wall L
        fill(139, 10, 1, 15, 3);         // Sewer wall R
        fill(113, 10, 27, 1, 3);         // Sewer ceiling
        fill(120, 17, 5, 1, 2);          // Platform
        fill(130, 15, 5, 1, 2);          // Platform

        this.enemySpawns.push({ type: 'rat', x: 120, y: 20, patrolL: 115, patrolR: 127 });
        this.enemySpawns.push({ type: 'rat', x: 130, y: 20, patrolL: 126, patrolR: 137 });
        this.enemySpawns.push({ type: 'rat', x: 135, y: 20, patrolL: 132, patrolR: 138 });

        this.items.push({ x: 126, y: 20, type: 'bloodVial', collected: false });

        /* ---- Section 5 : Cathedral Approach  (140–169) ---- */
        fill(140, 21, 3, 4, 1);          // Step up
        fill(143, 20, 27, 5, 4);         // Cathedral floor
        fill(140, 5, 2, 16, 4);          // Left wall
        fill(148, 14, 1, 6, 4);          // Pillar
        fill(158, 14, 1, 6, 4);          // Pillar
        fill(145, 16, 5, 1, 2);          // Platform
        fill(155, 14, 5, 1, 2);          // Platform

        this.enemySpawns.push({ type: 'churchServant', x: 150, y: 19, patrolL: 145, patrolR: 156 });
        this.enemySpawns.push({ type: 'churchServant', x: 163, y: 19, patrolL: 159, patrolR: 168 });

        this.items.push({ x: 157, y: 13, type: 'bloodVial', collected: false });
        this.items.push({ x: 165, y: 19, type: 'bloodVial', collected: false });

        // Pre-boss lamp
        this.tiles[19][168] = 10;
        this.lamps.push({ x: 168, y: 19 });

        /* ---- Section 6 : Boss Arena  (170–199) ---- */
        fill(170, 20, 30, 5, 4);         // Arena floor
        fill(170, 5, 1, 15, 4);          // Left wall
        fill(199, 5, 1, 20, 4);          // Right wall

        this.fogGates.push({ x: 172, y: 15, active: true });
        this.bossSpawn = { x: 188, y: 17 };

        this.messages.push({ x: 171, y: 18, text: 'A great beast lurks beyond the fog…' });
    }

    /* ============================================================
       Tile queries
       ============================================================ */
    getTile(col, row) {
        if (col < 0 || col >= this.width || row < 0 || row >= this.height) return 1;
        return this.tiles[row][col];
    }

    isSolid(col, row) {
        const t = this.getTile(col, row);
        return t === 1 || t === 3 || t === 4 || t === 11;
    }

    isPlatform(col, row) {
        return this.getTile(col, row) === 2;
    }

    breakTile(col, row) {
        if (this.getTile(col, row) === 11) this.tiles[row][col] = 0;
    }

    /* ============================================================
       Physics collision — separate horizontal then vertical
       ============================================================ */
    resolveCollisions(ent) {
        const S = G.RTILE;

        // ---- horizontal ----
        ent.x += ent.vx;
        let left   = Math.floor(ent.x / S);
        let right  = Math.floor((ent.x + ent.w - 1) / S);
        let top    = Math.floor(ent.y / S);
        let bottom = Math.floor((ent.y + ent.h - 1) / S);

        for (let r = top; r <= bottom; r++) {
            for (let c = left; c <= right; c++) {
                if (this.isSolid(c, r)) {
                    if (ent.vx > 0) ent.x = c * S - ent.w;
                    else if (ent.vx < 0) ent.x = (c + 1) * S;
                    ent.vx = 0;
                }
            }
        }

        // ---- vertical ----
        ent.y += ent.vy;
        left   = Math.floor(ent.x / S);
        right  = Math.floor((ent.x + ent.w - 1) / S);
        top    = Math.floor(ent.y / S);
        bottom = Math.floor((ent.y + ent.h - 1) / S);

        ent.onGround = false;

        for (let r = top; r <= bottom; r++) {
            for (let c = left; c <= right; c++) {
                if (this.isSolid(c, r)) {
                    if (ent.vy > 0) { ent.y = r * S - ent.h; ent.onGround = true; }
                    else if (ent.vy < 0) { ent.y = (r + 1) * S; }
                    ent.vy = 0;
                }
                // One-way platforms — only when falling
                if (this.isPlatform(c, r) && ent.vy >= 0) {
                    const platTop = r * S;
                    if (ent.y + ent.h - ent.vy <= platTop + 4 && ent.y + ent.h > platTop) {
                        ent.y = platTop - ent.h;
                        ent.vy = 0;
                        ent.onGround = true;
                    }
                }
            }
        }
    }

    /** World-pixel dimensions */
    get worldW() { return this.width  * G.RTILE; }
    get worldH() { return this.height * G.RTILE; }

    /** Reset items and gates for respawn */
    reset() {
        for (const it of this.items) it.collected = false;
        for (const fg of this.fogGates) fg.active = true;
    }
}
