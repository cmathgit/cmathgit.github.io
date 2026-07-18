'use strict';

class Level {
    constructor() {
        this.width = 200;
        this.height = 25;
        this.tiles = [];
        this.lamps = [];
        this.fogGates = [];
        this.items = [];
        this.messages = [];
        this.enemySpawns = [];
        this.bossSpawn = null;
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
        fill(0, 20, 26, 5, 1);          // Ground — extends to col 25 to join seamlessly
        fill(0, 0, 1, 25, 1);           // Left wall
        this.tiles[19][5] = 10;          // Lamp
        this.lamps.push({ x: 5, y: 19 });
        this.messages.push({ x: 3, y: 18, text: '[J/Z] Attack   [Space] Dodge   [W/↑] Jump' });
        this.messages.push({ x: 10, y: 18, text: '[K/X] Gun Parry — shoot during enemy wind-up!' });
        this.messages.push({ x: 17, y: 18, text: '[L/C] Transform Weapon   [Q/V] Blood Vial' });
        // Arrow hint pointing right
        this.messages.push({ x: 22, y: 18, text: '→ Head right to explore Yharnam' });

        /* ---- Section 2 : City Streets  (25–69) ---- */
        fill(25, 20, 45, 5, 1);          // Ground (continuous with section 1)
        // Building backdrops — below ground level, decorative only
        fill(29, 21, 3, 4, 1);          // Building facade L
        fill(63, 21, 3, 4, 1);          // Building facade R
        // Platforms — all reachable with a single jump
        fill(33, 18, 7, 1, 2);           // Platform low-left  (1 tile above ground)
        fill(44, 17, 5, 1, 2);           // Stepping stone to mid (2 tiles above ground)
        fill(50, 16, 6, 1, 2);           // Platform high-mid   (3 tiles above ground -- needs step)
        fill(59, 18, 6, 1, 2);           // Platform low-right  (1 tile above ground)
        this.tiles[19][40] = 11;          // Crate on ground
        this.tiles[19][41] = 11;          // Crate on ground
        this.tiles[19][50] = 11;          // Crate on ground
        this.tiles[17][67] = 11;          // Crate on high-mid platform (reward)

        this.enemySpawns.push({ type: 'huntsman', x: 36, y: 17, patrolL: 33, patrolR: 39 }); // on low-left plat
        this.enemySpawns.push({ type: 'huntsman', x: 50, y: 19, patrolL: 47, patrolR: 55 }); // on ground
        this.enemySpawns.push({ type: 'huntsman', x: 61, y: 17, patrolL: 57, patrolR: 64 }); // on low-right plat
        this.enemySpawns.push({ type: 'huntsman', x: 63, y: 17, patrolL: 61, patrolR: 64 }); // on low-right plat

        this.items.push({ x: 47, y: 16, type: 'bloodVial', collected: false }); // on stepping stone

        /* ---- Section 3 : Bridge  (66–99) ---- */
        fill(66, 20, 4, 5, 1);           // Ramp start
        fill(70, 18, 12, 2, 1);          // Bridge deck Left (cols 70-80)
        // Hole from col 81 to 84 (3 tiles wide gap)
        fill(85, 18, 15, 2, 1);          // Bridge deck Right (cols 85-99)
        fill(70, 23, 30, 2, 1);          // Pit floor below bridge
        fill(70, 17, 1, 1, 1);           // Railing L
        fill(99, 17, 1, 1, 1);           // Railing R

        this.enemySpawns.push({ type: 'beast', x: 82, y: 17, patrolL: 74, patrolR: 90 });
        this.enemySpawns.push({ type: 'beast', x: 84, y: 17, patrolL: 76, patrolR: 92 });
        this.enemySpawns.push({ type: 'huntsman', x: 92, y: 17, patrolL: 88, patrolR: 96 });
        this.enemySpawns.push({ type: 'huntsman', x: 94, y: 17, patrolL: 90, patrolR: 98 });
        this.enemySpawns.push({ type: 'huntsman', x: 95, y: 17, patrolL: 89, patrolR: 95 });
        this.items.push({ x: 95, y: 17, type: 'bloodVial', collected: false }); // on Bridge R

        // 1. The top ceiling of the left side of the tunnel (so the bridge surface remains)
        fill(100, 18, 3, 3, 1);          // Ceiling (cols 100-101, rows 18-20)
        // 2. The common floor of the tunnel (so there is solid ground at the bottom)
        fill(100, 23, 5, 2, 1);          // Tunnel Floor (cols 100-104, rows 23-24)
        // 3. A one-way jump platform inside the vertical shaft to climb back up
        fill(103, 21, 1, 1, 2);          // Climbing step (col 102-103, row 21, tile type 2)

        /* ---- Section 4 : Descent + Sewer  (100–139) ---- */
        //fill(100, 18, 5, 7, 1);          // Landing
        fill(105, 19, 4, 6, 1);          // Step 1
        fill(109, 20, 4, 5, 1);          // Step 2
        fill(113, 21, 27, 4, 3);         // Sewer floor
        fill(113, 10, 1, 8, 3);         // Sewer wall L

        // Sewer wall R split: gap at rows 13-15 (level with Plat 2)
        fill(139, 10, 1, 3, 3);         // Sewer wall R top (rows 10-12)
        fill(139, 16, 1, 9, 3);         // Sewer wall R bottom (rows 16-24)

        fill(113, 10, 27, 1, 3);         // Sewer ceiling

        // Platforms (Platform 1 lowered to row 18 for jump reachability)
        fill(120, 18, 5, 1, 2);          // Platform 1 (row 18)
        fill(130, 15, 5, 1, 2);          // Platform 2 (row 15)

        // Access crates
        this.tiles[20][117] = 11;        // Crate on floor (col 119) to jump onto Plat 1
        this.tiles[20][118] = 11;        // Crate on floor (col 119) to jump onto Plat 1
        this.tiles[16][127] = 11;        // Crate bridging the gap (col 127, row 16) between Plat 1 and Plat 2
        this.tiles[16][128] = 11;        // Crate bridging the gap (col 127, row 16) between Plat 1 and Plat 2

        this.enemySpawns.push({ type: 'rat', x: 119, y: 20, patrolL: 119, patrolR: 134 });
        this.enemySpawns.push({ type: 'rat', x: 124, y: 20, patrolL: 120, patrolR: 135 });
        this.enemySpawns.push({ type: 'rat', x: 130, y: 20, patrolL: 121, patrolR: 136 });
        this.enemySpawns.push({ type: 'rat', x: 133, y: 20, patrolL: 122, patrolR: 137 });
        this.enemySpawns.push({ type: 'rat', x: 135, y: 20, patrolL: 123, patrolR: 138 });
        this.enemySpawns.push({ type: 'rat', x: 138, y: 20, patrolL: 124, patrolR: 139 });

        this.items.push({ x: 126, y: 20, type: 'bloodVial', collected: false });

        /* ---- Section 5 : Cathedral Approach  (140–169) ---- */
        //fill(140, 21, 3, 4, 1);          // Step up
        fill(142, 20, 28, 5, 4);         // Cathedral floor

        // Cathedral left wall split: gap at rows 13-15 (matching Sewer Wall R exit)
        fill(140, 5, 2, 8, 4);           // Cathedral left wall top (rows 5-12)
        fill(140, 16, 2, 5, 4);          // Cathedral left wall bottom (rows 16-20)

        // Pre-boss lamp
        this.tiles[15][140] = 10;
        // Register the Lamp checkpoint coordinates
        this.lamps.push({ x: 140, y: 15 });


        this.tiles[18][142] = 11;        // crate
        this.tiles[19][142] = 11;        // crate
        this.tiles[19][143] = 11;        // crate

        fill(148, 14, 1, 6, 4);          // Pillar
        fill(158, 14, 1, 6, 4);          // Pillar
        fill(145, 16, 6, 1, 2);          // Platform
        fill(151, 18, 2, 1, 2);          // Platform
        this.tiles[15][152] = 11;        // crate
        this.tiles[15][153] = 11;        // crate
        fill(155, 14, 5, 1, 2);          // Platform

        this.enemySpawns.push({ type: 'churchServant', x: 150, y: 19, patrolL: 145, patrolR: 156 });
        this.enemySpawns.push({ type: 'churchServant', x: 165, y: 19, patrolL: 160, patrolR: 167 });
        this.enemySpawns.push({ type: 'churchServant', x: 163, y: 19, patrolL: 159, patrolR: 168 });

        this.items.push({ x: 157, y: 19, type: 'bloodVial', collected: false });
        this.items.push({ x: 165, y: 19, type: 'bloodVial', collected: false });

        // Pre-boss lamp
        //this.tiles[19][168] = 10;
        //this.lamps.push({ x: 168, y: 19 });

        /* ---- Section 6 : Boss Arena  (170–199) ---- */
        fill(170, 20, 30, 5, 4);         // Arena floor
        fill(170, 5, 1, 12, 4);          // Left wall
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
        let left = Math.floor(ent.x / S);
        let right = Math.floor((ent.x + ent.w - 1) / S);
        let top = Math.floor(ent.y / S);
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
        left = Math.floor(ent.x / S);
        right = Math.floor((ent.x + ent.w - 1) / S);
        top = Math.floor(ent.y / S);
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
    get worldW() { return this.width * G.RTILE; }
    get worldH() { return this.height * G.RTILE; }

    /** Reset items and gates for respawn */
    reset() {
        for (const it of this.items) it.collected = false;
        for (const fg of this.fogGates) fg.active = true;
    }
}
