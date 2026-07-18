'use strict';

/* ================================================================
   MAIN — Game loop, state machine, collision orchestration
   States: TITLE → PLAYING → BOSS_INTRO → BOSS → DEATH → VICTORY
   ================================================================ */

/* ---- Global game constants ---- */
window.G = {
    TILE:  16,
    SCALE: 3,
    RTILE: 48,          // TILE * SCALE
    W: 960, H: 540,
    GRAVITY: 0.55,
    // Runtime (filled during init)
    canvas: null, ctx: null,
    input: null, audio: null, particles: null,
    renderer: null, level: null,
    player: null, enemies: [], boss: null,
    hud: null,
    state: 'TITLE',
    stateTimer: 0,
    time: 0,
    droppedEchoes: null,
    bossEchoes: 2000,
    lastLamp: { x: 5, y: 18 }
};

/* ---- Helpers ---- */
function overlaps(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x &&
           a.y < b.y + b.h && a.y + a.h > b.y;
}

/* ================================================================
   INIT
   ================================================================ */
function init() {
    G.canvas = document.getElementById('game-canvas');
    G.canvas.width  = G.W;
    G.canvas.height = G.H;
    G.ctx = G.canvas.getContext('2d');
    G.ctx.imageSmoothingEnabled = false;

    G.input     = new InputManager();
    G.audio     = new AudioManager();
    G.particles = new ParticleSystem();
    G.renderer  = new Renderer(G.canvas);
    G.level     = new Level();
    G.hud       = new HUD(G.ctx);

    // Spawn player
    const sp = G.level.playerStart;
    G.player = new Player(sp.x * G.RTILE, sp.y * G.RTILE);

    // Spawn enemies
    G.enemies = G.level.enemySpawns.map(s =>
        new Enemy(s.type, s.x, s.y, s.patrolL, s.patrolR)
    );

    // Create boss (inactive)
    const bs = G.level.bossSpawn;
    G.boss = new Boss(bs.x, bs.y);

    G.state = 'TITLE';
    G.stateTimer = 0;

    G.loopId = requestAnimationFrame(loop);
}

/* ================================================================
   GAME LOOP
   ================================================================ */
let lastTime = 0;

function loop(ts) {
    G.time = ts;
    G.stateTimer++;
    update();
    render();
    G.input.update();
    G.loopId = requestAnimationFrame(loop);
}

/* ================================================================
   UPDATE
   ================================================================ */
function update() {
    switch (G.state) {
        case 'TITLE':
            if (G.input.confirm) {
                G.audio.init();
                G.audio.playVoice();
                G.state = 'PLAYING';
                G.stateTimer = 0;
            }
            break;

        case 'PLAYING':
            updateGameplay();
            // Check boss fog gate
            checkBossTrigger();
            break;

        case 'BOSS_INTRO':
            if (G.stateTimer >= 60) {
                G.state = 'BOSS';
                G.stateTimer = 0;
                G.boss.activate();
            }
            break;

        case 'BOSS':
            updateGameplay();
            break;

        case 'DEATH':
            G.particles.update();
            if (G.stateTimer > 120 && G.input.confirm) {
                respawnAll();
                G.state = 'PLAYING';
                G.stateTimer = 0;
            }
            break;

        case 'VICTORY':
            G.particles.update();
            if (G.stateTimer > 180 && G.input.confirm) {
                if (typeof initRush === 'function') {
                    cancelAnimationFrame(G.loopId);
                    initRush();
                }
            }
            break;
    }

    // Handle music switching based on player position and game state
    if (G.state !== 'TITLE' && G.audio && G.audio.initialized) {
        G.audio.updateMusicArea(G.player.x, G.state);
    }
}

function updateGameplay() {
    const player = G.player;
    const level  = G.level;

    // Player update
    player.update(G.input, level);

    // Enemies
    for (const e of G.enemies) {
        if (e.alive) e.update(player, level);
    }

    // Boss
    if (G.boss.active && G.boss.alive) {
        G.boss.update(player, level);
    }

    // Particles
    G.particles.update();

    // Ambient embers
    if (Math.random() < 0.03) {
        G.particles.ember(
            player.x + (Math.random() - 0.5) * G.W,
            player.y + G.H * 0.3 + Math.random() * G.H * 0.4
        );
    }

    // ---- Collision checks ----
    checkPlayerAttacks();
    checkEnemyAttacks();
    checkItemPickup();
    checkEchoPickup();

    // ---- Camera ----
    G.renderer.updateCamera(
        player.x + player.w / 2,
        player.y + player.h / 2,
        level.worldW, level.worldH
    );

    // ---- Death check ----
    if (player.state === PS.DEATH && G.stateTimer === 0) {
        // Handled by player.die() setting state
    }
    if (player.state === PS.DEATH && player.hp <= 0) {
        if (G.state !== 'DEATH') {
            G.state = 'DEATH';
            G.stateTimer = 0;
            // Drop echoes on death
            if (player.echoes > 0) {
                G.droppedEchoes = { x: player.x, y: player.y, amount: player.echoes, active: true };
                player.echoes = 0;
            }
        }
    }
}

/* ================================================================
   COLLISION — Player attacks vs enemies/boss
   ================================================================ */
function checkPlayerAttacks() {
    const p = G.player;
    if (!p.atkBox) return;

    // vs Enemies
    for (const e of G.enemies) {
        if (!e.alive || p.hitSet.has(e.id)) continue;
        if (!overlaps(p.atkBox, e.bounds)) continue;

        p.hitSet.add(e.id);

        if (p.isGunShot && e.canParry) {
            // PARRY!
            e.parry();
        } else if (p.isVisceral && e.state === ES.PARRIED) {
            // Visceral damage
            const died = e.takeDamage(p.atkDmg);
            if (died) p.echoes += e.echoes;
        } else {
            // Normal hit
            const died = e.takeDamage(p.atkDmg);
            p.rally(p.atkDmg);
            G.particles.blood(e.x + e.w / 2, e.y + e.h / 3, -p.facing);
            G.renderer.addShake(2, 3);
            if (died) p.echoes += e.echoes;
        }
    }

    // vs Boss
    if (G.boss.active && G.boss.alive && !p.hitSet.has('boss')) {
        if (overlaps(p.atkBox, G.boss.bounds)) {
            p.hitSet.add('boss');

            if (p.isGunShot && G.boss.canParry) {
                G.boss.parry();
            } else if (p.isVisceral && G.boss.state === BS.PARRIED) {
                const died = G.boss.takeDamage(p.atkDmg);
                if (died) { victory(); }
            } else {
                const died = G.boss.takeDamage(p.atkDmg);
                p.rally(p.atkDmg);
                G.particles.blood(
                    G.boss.x + G.boss.w / 2,
                    G.boss.y + G.boss.h / 3, -p.facing
                );
                G.renderer.addShake(2, 4);
                if (died) { victory(); }
            }
        }
    }

    // Check if near a PARRIED enemy — allow visceral
    if (p.state !== PS.VISCERAL && (p.state === PS.IDLE || p.state === PS.RUN)) {
        for (const e of G.enemies) {
            if (e.alive && e.state === ES.PARRIED) {
                const dist = Math.abs((e.x + e.w / 2) - (p.x + p.w / 2));
                if (dist < 60 && G.input.attack) {
                    p.facing = (e.x + e.w / 2) > (p.x + p.w / 2) ? 1 : -1;
                    p.startVisceral(e);
                    return;
                }
            }
        }
        // Boss
        if (G.boss.active && G.boss.alive && G.boss.state === BS.PARRIED) {
            const dist = Math.abs((G.boss.x + G.boss.w / 2) - (p.x + p.w / 2));
            if (dist < 80 && G.input.attack) {
                p.facing = (G.boss.x + G.boss.w / 2) > (p.x + p.w / 2) ? 1 : -1;
                p.startVisceral(G.boss);
            }
        }
    }
}

/* ================================================================
   COLLISION — Enemy/Boss attacks vs player
   ================================================================ */
function checkEnemyAttacks() {
    const p = G.player;
    if (p.invincible || p.state === PS.DEATH) return;

    for (const e of G.enemies) {
        if (!e.alive || !e.atkBox) continue;
        if (overlaps(e.atkBox, p.bounds)) {
            p.takeDamage(e.dmg, e.x + e.w / 2);
            e.atkBox = null; // only hit once per swing
        }
    }

    if (G.boss.active && G.boss.alive && G.boss.atkBox) {
        if (overlaps(G.boss.atkBox, p.bounds)) {
            p.takeDamage(G.boss.atkDmg, G.boss.x + G.boss.w / 2);
            G.boss.atkBox = null;
        }
    }
}

/* ================================================================
   ITEMS — Blood vial pickup
   ================================================================ */
function checkItemPickup() {
    const p = G.player;
    for (const item of G.level.items) {
        if (item.collected) continue;
        const ix = item.x * G.RTILE;
        const iy = item.y * G.RTILE;
        if (Math.abs(p.x - ix) < G.RTILE && Math.abs(p.y - iy) < G.RTILE) {
            if (item.type === 'bloodVial' && p.bloodVials < p.maxBloodVials) {
                item.collected = true;
                p.bloodVials++;
                G.audio.pickup();
            }
        }
    }
}

/* ================================================================
   ECHO RETRIEVAL
   ================================================================ */
function checkEchoPickup() {
    if (!G.droppedEchoes || !G.droppedEchoes.active) return;
    const p = G.player;
    const e = G.droppedEchoes;
    if (Math.abs(p.x - e.x) < 40 && Math.abs(p.y - e.y) < 40) {
        p.echoes += e.amount;
        e.active = false;
        G.audio.pickup();
    }
}

/* ================================================================
   BOSS TRIGGER
   ================================================================ */
function checkBossTrigger() {
    if (G.boss.active) return;
    const p = G.player;
    const fg = G.level.fogGates[0];
    if (!fg || !fg.active) return;
    const fgX = fg.x * G.RTILE;
    if (p.x + p.w > fgX + G.RTILE / 2) {
        fg.active = false;
        G.state = 'BOSS_INTRO';
        G.stateTimer = 0;
    }
}

/* ================================================================
   VICTORY
   ================================================================ */
function victory() {
    G.player.echoes += G.bossEchoes;
    G.state = 'VICTORY';
    G.stateTimer = 0;
}

/* ================================================================
   RESPAWN
   ================================================================ */
function respawnAll() {
    const lamp = G.lastLamp;
    // Find closest lamp the player has touched
    let closestLamp = G.level.lamps[0];
    for (const l of G.level.lamps) {
        if (l.x * G.RTILE <= G.player.spawnX + G.RTILE) closestLamp = l;
    }
    G.player.respawn(closestLamp.x * G.RTILE, (closestLamp.y - 1) * G.RTILE);
    // Reset enemies
    for (const e of G.enemies) e.reset();
    // Reset boss
    G.boss.reset();
    // Reset level
    G.level.reset();
    G.particles.clear();
}

/* ================================================================
   RENDER
   ================================================================ */
function render() {
    const ctx = G.ctx;
    const r   = G.renderer;

    if (G.state === 'TITLE') {
        G.hud.renderTitle();
        return;
    }

    // ---- World ----
    r.clear();
    r.drawBackground();
    r.drawTiles(G.level);
    r.drawFogGates(G.level);
    r.drawItems(G.level);
    r.drawDroppedEchoes(G.droppedEchoes);
    r.drawLampGlow(G.level);

    // ---- Entities ----
    const camX = r.camX, camY = r.camY;

    // Enemies
    for (const e of G.enemies) e.render(ctx, camX, camY);
    // Boss
    G.boss.render(ctx, camX, camY);
    // Player
    G.player.render(ctx, camX, camY);

    // Particles (on top)
    G.particles.render(ctx, camX, camY);

    // ---- Overlays ----
    r.drawVignette();
    r.drawMessages(G.level, G.player.x);

    // ---- HUD ----
    if (G.state === 'PLAYING' || G.state === 'BOSS') {
        G.hud.render(G.player, G.boss);
    }

    // ---- State overlays ----
    if (G.state === 'BOSS_INTRO') G.hud.renderBossIntro(G.stateTimer);
    if (G.state === 'DEATH')      G.hud.renderDeath(G.stateTimer);
    if (G.state === 'VICTORY')    G.hud.renderVictory(G.stateTimer, G.bossEchoes);

    // Lamp interaction — update spawn point
    for (const lamp of G.level.lamps) {
        const lx = lamp.x * G.RTILE;
        const ly = lamp.y * G.RTILE;
        if (Math.abs(G.player.x - lx) < G.RTILE && Math.abs(G.player.y - ly) < G.RTILE * 2) {
            G.player.spawnX = lx;
            G.player.spawnY = (lamp.y - 1) * G.RTILE;
        }
    }
}

/* ---- Start ---- */
window.addEventListener('load', init);
