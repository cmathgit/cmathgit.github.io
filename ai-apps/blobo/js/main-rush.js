'use strict';

/* ================================================================
   BOSS RUSH MODE
   ================================================================ */

function initRush() {
    // Reset player
    G.player.hp = G.player.maxHp;
    G.player.bloodVials = G.player.maxBloodVials;
    G.player.state = PS.IDLE;
    G.player.alive = true;
    G.player.vx = 0;
    G.player.vy = 0;
    
    // Spawn in the boss room
    G.player.x = 175 * G.RTILE;
    G.player.y = 20 * G.RTILE;

    // Remove fog gates so they don't block
    for (const fg of G.level.fogGates) {
        fg.active = false;
    }

    // Spawn 3 Bosses
    const by = G.level.bossSpawn.y;
    G.bosses = [
        new Boss(182, by),
        new Boss(189, by),
        new Boss(196, by)
    ];

    // Activate them
    for (const b of G.bosses) {
        b.activate();
    }

    G.state = 'BOSS';
    G.stateTimer = 0;
    
    // Force music
    if (G.audio && G.audio.initialized) {
        G.audio.bossLocked = true;
        G.audio._switchTrack(G.audio.tracks.boss);
    }

    G.hud = new HUDRush(G.ctx);

    G.loopId = requestAnimationFrame(loopRush);
}

function loopRush(ts) {
    G.time = ts;
    G.stateTimer++;
    updateRush();
    renderRush();
    G.input.update();
    G.loopId = requestAnimationFrame(loopRush);
}

function updateRush() {
    switch (G.state) {
        case 'BOSS':
            updateGameplayRush();
            break;
        case 'DEATH':
            G.particles.update();
            if (G.stateTimer > 120 && G.input.confirm) {
                // If you die in Boss Rush, you restart Boss Rush instantly
                initRush(); 
            }
            break;
        case 'VICTORY':
            G.particles.update();
            if (G.stateTimer > 180 && G.input.confirm) {
                initRush(); // Replay Boss Rush
            }
            break;
    }

    if (G.audio && G.audio.initialized) {
        G.audio.updateMusicArea(G.player.x, G.state);
    }
}

function updateGameplayRush() {
    const player = G.player;
    const level  = G.level;

    player.update(G.input, level);

    for (const b of G.bosses) {
        if (b.active && b.alive) {
            b.update(player, level);
        }
    }

    G.particles.update();

    if (Math.random() < 0.05) {
        G.particles.ember(
            player.x + (Math.random() - 0.5) * G.W,
            player.y + G.H * 0.3 + Math.random() * G.H * 0.4
        );
    }

    checkPlayerAttacksRush();
    checkEnemyAttacksRush();
    checkItemPickupRush();
    checkEchoPickupRush();

    G.renderer.updateCamera(
        player.x + player.w / 2,
        player.y + player.h / 2,
        level.worldW, level.worldH
    );

    if (player.state === PS.DEATH && player.hp <= 0) {
        if (G.state !== 'DEATH') {
            G.state = 'DEATH';
            G.stateTimer = 0;
        }
    }
}

function checkPlayerAttacksRush() {
    const p = G.player;
    if (!p.atkBox) return;

    for (let i = 0; i < G.bosses.length; i++) {
        const b = G.bosses[i];
        const hitId = 'boss_' + i;

        if (b.active && b.alive && !p.hitSet.has(hitId)) {
            if (overlaps(p.atkBox, b.bounds)) {
                p.hitSet.add(hitId);

                if (p.isGunShot && b.canParry) {
                    b.parry();
                } else if (p.isVisceral && b.state === BS.PARRIED) {
                    const died = b.takeDamage(p.atkDmg);
                    if (died) { checkVictoryRush(); }
                } else {
                    const died = b.takeDamage(p.atkDmg);
                    p.rally(p.atkDmg);
                    G.particles.blood(b.x + b.w / 2, b.y + b.h / 3, -p.facing);
                    G.renderer.addShake(2, 4);
                    if (died) { checkVictoryRush(); }
                }
            }
        }
    }

    if (p.state !== PS.VISCERAL && (p.state === PS.IDLE || p.state === PS.RUN)) {
        for (const b of G.bosses) {
            if (b.active && b.alive && b.state === BS.PARRIED) {
                const dist = Math.abs((b.x + b.w / 2) - (p.x + p.w / 2));
                if (dist < 80 && G.input.attack) {
                    p.facing = (b.x + b.w / 2) > (p.x + p.w / 2) ? 1 : -1;
                    p.startVisceral(b);
                    return; // Only visceral one at a time
                }
            }
        }
    }
}

function checkEnemyAttacksRush() {
    const p = G.player;
    if (p.invincible || p.state === PS.DEATH) return;

    for (const b of G.bosses) {
        if (b.active && b.alive && b.atkBox) {
            if (overlaps(b.atkBox, p.bounds)) {
                p.takeDamage(b.atkDmg, b.x + b.w / 2);
                b.atkBox = null;
            }
        }
    }
}

function checkItemPickupRush() {
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

function checkEchoPickupRush() {
    if (!G.droppedEchoes || !G.droppedEchoes.active) return;
    const p = G.player;
    const e = G.droppedEchoes;
    if (Math.abs(p.x - e.x) < 40 && Math.abs(p.y - e.y) < 40) {
        p.echoes += e.amount;
        e.active = false;
        G.audio.pickup();
    }
}

function checkVictoryRush() {
    const allDead = G.bosses.every(b => !b.alive);
    if (allDead) {
        G.player.echoes += (G.bossEchoes * 3);
        G.state = 'VICTORY';
        G.stateTimer = 0;
    }
}

function renderRush() {
    const ctx = G.ctx;
    const r   = G.renderer;

    r.clear();
    r.drawBackground();
    r.drawTiles(G.level);
    r.drawFogGates(G.level);
    r.drawItems(G.level);
    r.drawDroppedEchoes(G.droppedEchoes);
    r.drawLampGlow(G.level);

    const camX = r.camX, camY = r.camY;

    for (const b of G.bosses) {
        b.render(ctx, camX, camY);
    }
    G.player.render(ctx, camX, camY);

    G.particles.render(ctx, camX, camY);

    r.drawVignette();
    r.drawMessages(G.level, G.player.x);

    if (G.state === 'BOSS') {
        G.hud.render(G.player, G.bosses); // Pass the array to HUD
    }

    if (G.state === 'DEATH')   G.hud.renderDeath(G.stateTimer);
    if (G.state === 'VICTORY') G.hud.renderVictory(G.stateTimer, G.bossEchoes * 3);
}
