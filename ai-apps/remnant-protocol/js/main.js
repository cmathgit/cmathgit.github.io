import * as THREE from 'three';

import { createRenderer } from './engine/renderer.js';
import { Input } from './engine/input.js';
import { Physics } from './engine/physics.js';
import { FollowCamera } from './engine/camera.js';
import { Sound } from './engine/audio.js';

import { Player } from './entities/player.js';
import { Enemy, rollEnemyArmorDrop } from './entities/enemy.js';
import { Boss } from './entities/boss.js';

import { Inventory, ITEMS } from './systems/inventory.js';
import { Progression } from './systems/progression.js';
import { Combat } from './systems/combat.js';
import { createLevel } from './world/level.js';

const $ = id => document.getElementById(id);

const canvas = $('game');
const { renderer, scene, camera } = createRenderer(canvas);
const world = createLevel(scene);
const physics = new Physics(world.solid);
const input = new Input(canvas);
const sound = new Sound();
const progression = new Progression();
const inventory = new Inventory();
const player = new Player(scene, physics, progression, inventory, world.spawn);
const follow = new FollowCamera(camera, physics);

const enemies = world.enemies.map(definition => new Enemy(
    scene, physics, definition.position, definition.kind
));

const boss = new Boss(scene, physics, world.bossSpawn);
enemies.push(boss);

const heraldTrader = createHeraldTrader(scene, world.bossSpawn);

let mode = 'title';
let started = false;
let accumulator = 0;
let previousTime = performance.now();
let toastRemaining = 0;
let deathTimer = 0;
let droppedGrace = null;

const graceMarker = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.3),
    new THREE.MeshStandardMaterial({
        color: 0xffd700,
        emissive: 0xffd700,
        emissiveIntensity: 3
    })
);

graceMarker.visible = false;
scene.add(graceMarker);

const game = {
    renderer,
    scene,
    camera,
    world,
    physics,
    input,
    sound,
    progression,
    inventory,
    player,
    follow,
    enemies,
    boss,
    target: null,
    difficulty: 1,
    time: 0,
    victory: false,

    toast(message, duration = 2.4) {
        $('toast').textContent = message;
        $('toast').style.opacity = '1';
        toastRemaining = duration;
    },

    awardEnemyArmor(enemy) {
        const id = rollEnemyArmorDrop(enemy, inventory);
        if (!id || !inventory.acquire(id)) return;

        game.toast(`ARMOR ACQUIRED — ${ITEMS[id].name}`, 3.5);

        if (mode === 'equipment') showEquipment();
    },

    awardHeraldSoul() {
        inventory.awardHeraldSoul();
        heraldTrader.reveal();
        sound.playHeraldTraderTheme();
    },

    onDeath() {
        if (deathTimer > 0) return;

        // A second death replaces an unrecovered Grace drop.
        droppedGrace = {
            amount: progression.grace,
            position: player.position.clone()
        };

        progression.grace = 0;
        graceMarker.position.copy(player.position);
        graceMarker.position.y += 0.6;
        graceMarker.visible = droppedGrace.amount > 0;

        game.target = null;
        deathTimer = 2.5;
        game.toast('DEFEATED — THE REMNANT ENDURES', 3.5);
    }
};

game.combat = new Combat(game);

function createHeraldTrader(scene, bossSpawn) {
    const root = new THREE.Group();
    root.name = 'MALAKH OF THE LAMPSTANDS';

    // Clear central arena floor, toward the entrance from the boss spawn.
    root.position.copy(bossSpawn);
    root.position.z += 4;
    root.visible = false;

    const figure = new THREE.Group();
    root.add(figure);

    const ivory = new THREE.MeshStandardMaterial({
        color: 0xe5e0ce,
        metalness: 0.55,
        roughness: 0.4
    });
    const gold = new THREE.MeshStandardMaterial({
        color: 0xcda957,
        metalness: 0.8,
        roughness: 0.3
    });
    const dark = new THREE.MeshStandardMaterial({
        color: 0x24232c,
        metalness: 0.5,
        roughness: 0.6
    });
    const radiance = new THREE.MeshStandardMaterial({
        color: 0xfff4cc,
        emissive: 0xffe7a0,
        emissiveIntensity: 2,
        roughness: 0.35
    });

    const box = new THREE.BoxGeometry(1, 1, 1);
    const sphere = new THREE.SphereGeometry(1, 12, 8);
    const torus = new THREE.TorusGeometry(1, 0.035, 6, 40);
    const robe = new THREE.CylinderGeometry(0.28, 0.7, 1.5, 10);

    function mesh(parent, geometry, material, x, y, z, sx, sy, sz) {
        const object = new THREE.Mesh(geometry, material);
        object.position.set(x, y, z);
        object.scale.set(sx, sy, sz);
        parent.add(object);
        return object;
    }

    mesh(figure, robe, ivory, 0, 0.95, 0, 1, 1, 1);
    mesh(figure, box, gold, 0, 1.48, 0.02, 0.62, 0.12, 0.4);
    mesh(figure, sphere, ivory, 0, 1.85, 0, 0.35, 0.46, 0.24);
    mesh(figure, sphere, radiance, 0, 1.9, 0.24, 0.13, 0.2, 0.06);

    // Sealed face and luminous brow.
    mesh(figure, sphere, dark, 0, 2.46, 0, 0.21, 0.29, 0.18);
    mesh(figure, box, ivory, 0, 2.44, 0.16, 0.28, 0.32, 0.07);
    mesh(figure, box, radiance, 0, 2.48, 0.205, 0.22, 0.018, 0.015);

    for (let i = 0; i < 8; i++) {
        const angle = i * Math.PI / 4;
        const panel = mesh(
            figure, box, i % 2 ? ivory : gold,
            Math.sin(angle) * 0.4, 0.95, Math.cos(angle) * 0.4,
            0.12, 1.25, 0.07
        );
        panel.rotation.y = angle;
    }

    for (const side of [-1, 1]) {
        const arm = mesh(
            figure, box, ivory,
            side * 0.39, 1.75, 0.08,
            0.18, 0.6, 0.2
        );
        arm.rotation.z = side * 0.28;

        mesh(
            figure, sphere, gold,
            side * 0.23, 1.54, 0.29,
            0.12, 0.08, 0.12
        );
    }

    const halo = new THREE.Group();
    halo.position.set(0, 2.48, -0.12);
    figure.add(halo);

    mesh(halo, torus, gold, 0, 0, 0, 0.51, 0.51, 0.51);
    mesh(halo, torus, radiance, 0, 0, 0, 0.57, 0.57, 0.57);

    // Seven lights echo the lampstand imagery in the NPC's title.
    for (let i = 0; i < 7; i++) {
        const angle = i * Math.PI * 2 / 7;
        mesh(
            halo, sphere, radiance,
            Math.sin(angle) * 0.57, Math.cos(angle) * 0.57, 0.025,
            0.055, 0.055, 0.035
        );
    }

    const wings = [];

    for (const side of [-1, 1]) {
        const wing = new THREE.Group();
        wing.position.set(side * 0.28, 1.95, -0.22);
        wing.rotation.z = -side * 0.18;
        figure.add(wing);
        wings.push({ object: wing, side });

        for (let i = 0; i < 6; i++) {
            const x = side * (0.22 + i * 0.18);
            const y = 0.16 + i * 0.1;

            const feather = mesh(
                wing, box, i % 2 ? ivory : gold,
                x, y, -i * 0.025,
                0.17, 0.9 - i * 0.065, 0.065
            );
            feather.rotation.z = -side * (0.3 + i * 0.065);

            mesh(
                wing, sphere, gold,
                x, y + 0.12, 0.055 - i * 0.025,
                0.075, 0.045, 0.025
            );
            mesh(
                wing, sphere, radiance,
                x, y + 0.12, 0.078 - i * 0.025,
                0.025, 0.027, 0.012
            );
        }
    }

    const groundSeal = mesh(
        root, torus, gold,
        0, 0.025, 0,
        0.9, 0.9, 0.9
    );
    groundSeal.rotation.x = -Math.PI / 2;

    scene.add(root);

    return {
        root,
        position: root.position,

        reveal() {
            root.visible = true;
        },

        update(time) {
            if (!root.visible) return;

            figure.position.y = 0.08 + Math.sin(time * 1.2) * 0.055;
            halo.rotation.z = time * 0.08;
            radiance.emissiveIntensity = 2 + Math.sin(time * 1.8) * 0.25;

            for (const wing of wings) {
                wing.object.rotation.z =
                    -wing.side * (0.18 + Math.sin(time) * 0.025);
            }
        }
    };
}

function nearHeraldTrader() {
    return heraldTrader.root.visible &&
        player.alive &&
        player.position.distanceTo(heraldTrader.position) < 3 &&
        game.combat.clearPath(player, heraldTrader);
}

function showHeraldTrade() {
    if (!nearHeraldTrader()) return;

    const available = inventory.hasHeraldSoul;
    const chosen = inventory.heraldSoul.reward;
    const chosenItem = chosen ? ITEMS[chosen] : null;

    setMenu('heraldTrade', `
        <div class="eyebrow">SERVANT OF GOD · WITNESS OF VICTORY</div>
        <h2>MALAKH OF THE LAMPSTANDS</h2>

        <p>“Fear not. I am sent to witness what was overcome.”</p>
        <p>“Give glory to God. I am His servant.”</p>

        <p>${available
            ? '“The herald’s soul may be surrendered for a remembrance of victory.”'
            : inventory.heraldSoul.spent
                ? '“The exchange is sealed. Walk faithfully.”'
                : '“No soul of the herald remains in your keeping.”'
        }</p>

        <p class="small">
            Soul of the Herald of the Eclipse: ${available ? '1' : '0'}
            ${chosenItem ? `<br>Relic received: ${chosenItem.name}` : ''}
        </p>

        ${available ? `
            <p>“Choose one relic. The soul will be consumed.”</p>

            <div class="row">
                <span>
                    Eclipse Herald Blade<br>
                    <small>4 kg · Existing sword moves and damage</small>
                </span>
                <button data-herald-reward="eclipse_herald_blade">
                    TRADE SOUL FOR BLADE
                </button>
            </div>

            <div class="row">
                <span>
                    Crown of the Eclipse Herald<br>
                    <small>5.5 kg · 4.5% armor · 10 poise</small>
                </span>
                <button data-herald-reward="rahu_ketu_crown">
                    TRADE SOUL FOR CROWN
                </button>
            </div>

            <p class="small">
                One soul grants one relic. Equip acquired relics at the sanctuary altar.
            </p>
        ` : ''}

        <button id="leaveHerald">LEAVE</button>
    `);

    $('panel').querySelectorAll('[data-herald-reward]').forEach(button => {
        button.onclick = () => {
            if (mode !== 'heraldTrade' || !nearHeraldTrader()) return;

            const id = button.dataset.heraldReward;
            if (!inventory.tradeHeraldSoul(id)) return;

            game.toast(`RELIC ACQUIRED — ${ITEMS[id].name}`, 4);
            showHeraldTrade();
        };
    });

    $('leaveHerald').onclick = resume;
}

function nearAltar() {
    return player.position.distanceTo(world.altar) < 4.2;
}

function setMenu(nextMode, html) {
    mode = nextMode;
    input.setEnabled(false);
    $('menu').hidden = false;
    $('panel').innerHTML = html;

    if (document.pointerLockElement) document.exitPointerLock();
}

function resume() {
    mode = 'play';
    $('menu').hidden = true;
    input.setEnabled(true);
    previousTime = performance.now();
    accumulator = 0;

    sound.unlock();

    try {
        const request = canvas.requestPointerLock();

        request?.catch(() => {
            game.toast('Click the arena to capture the mouse. Arrow keys also turn.');
        });
    } catch {
        game.toast('Arrow keys can turn the camera.');
    }
}

function showTitle() {
    setMenu('title', `
    <div class="eyebrow">A CYBER-GOTHIC COMBAT PROTOTYPE</div>
    <h1>REMNANT:<br>PROTOCOL 66</h1>
    <p>Enter the Cathedral of the False Light.
       Break the Mark. Confront the Herald of the Eclipse.</p>

    <p class="small">
      Gold telegraphs can be parried. Crimson attacks require a roll or escape.
      Hold the left mouse button, then release for a heavy attack.
      Equipment and leveling are available at the golden altar behind your spawn.
    </p>

    <div class="row">
      <span>Incoming damage</span>
      <select id="difficulty">
        <option value="0.7">Pilgrim — 70%</option>
        <option value="1" selected>Remnant — 100%</option>
        <option value="1.35">Tribulation — 135%</option>
      </select>
    </div>

    <p class="small">
      Desktop keyboard and mouse. Progress lasts for this browser session.
      Three.js loads from a CDN.
    </p>

    <button id="start">ENTER THE CATHEDRAL</button>
  `);

    $('start').onclick = () => {
        game.difficulty = Number($('difficulty').value);
        started = true;
        sound.setMusicMode('main');
        resume();
    };
}

function showPause() {
    if (!started || mode !== 'play') return;

    setMenu('pause', `
    <h2>THE REMNANT ENDURES</h2>
    <p>Combat is paused.</p>
    <button id="resume">RESUME</button>
  `);

    $('resume').onclick = resume;
}

function respawn() {
    deathTimer = 0;
    player.restore(world.spawn);
    game.target = null;

    for (const enemy of enemies) {
        if (enemy.boss && game.victory) continue;
        enemy.reset();
    }

    world.eclipse(false);
    if (game.victory && heraldTrader.root.visible) {
        sound.playHeraldTraderTheme();
    } else {
        sound.setMusicMode('main');
    }
}

function rest() {
    player.restore(world.spawn);
    game.target = null;

    for (const enemy of enemies) {
        if (enemy.boss && game.victory) continue;
        enemy.reset();
    }

    world.eclipse(false);
    if (game.victory && heraldTrader.root.visible) {
        sound.playHeraldTraderTheme();
    } else {
        sound.setMusicMode('main');
    }
    sound.playPrayer();
    showAltar();
}

function showAltar() {
    const descriptions = {
        Vigor: '+24 maximum HP',
        Endurance: '+6 stamina, +1.8 kg capacity',
        Faith: '+4.5% base weapon damage',
        Fortitude: '+0.8% physical armor, +2 poise',
        Discernment: '+1 parry tick per 20 points'
    };

    setMenu('altar', `
    <h2>VEStry SANCTUARY</h2>
    <p>Level ${progression.level} · Grace ${progression.grace}
      · Next level ${progression.cost}</p>

    ${Object.keys(progression.stats).map(attribute => `
      <div class="row">
        <span>
          ${attribute} ${progression.stats[attribute]}<br>
          <small>${descriptions[attribute]}</small>
        </span>
        <button data-stat="${attribute}"
          ${progression.grace < progression.cost ? 'disabled' : ''}>
          LEVEL UP
        </button>
      </div>
    `).join('')}

    <p class="small">Resting restores flasks and respawns ordinary enemies.</p>

    <button id="equipment">EQUIPMENT</button>
    <button id="leave">LEAVE ALTAR</button>
  `);

    document.querySelectorAll('[data-stat]').forEach(button => {
        button.onclick = () => {
            if (progression.levelUp(button.dataset.stat)) {
                player.hp = progression.maxHP;
                player.stamina = progression.maxStamina;
                showAltar();
            }
        };
    });

    $('equipment').onclick = showEquipment;
    $('leave').onclick = resume;
}

function showEquipment() {
    const ratio = inventory.weight / progression.maxLoad;
    const tier = inventory.tier(progression.maxLoad);

    setMenu('equipment', `
    <h2>EPHESIAN PANOPLY</h2>
    <p>
      ${inventory.weight.toFixed(1)} / ${progression.maxLoad.toFixed(1)} kg
      · ${(ratio * 100).toFixed(1)}% · ${tier.name}
    </p>
    <p class="small">
      ${Math.max(0, tier.end - tier.start + 1)} invulnerable ticks
      · ${tier.travel.toFixed(1)} m roll
      · Base stamina regeneration ${tier.regen}/s
    </p>

    ${Object.keys(inventory.equipped).map(slot => `
      <div class="row">
        <span>${slot.toUpperCase()}</span>
        <select data-slot="${slot}">
          ${slot !== 'weapon' ? '<option value="">Unequipped</option>' : ''}
          ${Object.entries(ITEMS)
            .filter(([id, item]) =>
                item.slot === slot && inventory.owns(id)
            )
            .map(([id, item]) => `
              <option value="${id}"
                ${inventory.equipped[slot] === id ? 'selected' : ''}>
                ${item.name} (${item.weight} kg)
              </option>
            `).join('')}
        </select>
      </div>
    `).join('')}

    <p class="small">
      Only acquired equipment is listed. Defeat cathedral soldiers
      for a chance to acquire their armor.
      Under 30% is light; 30–69.99% medium; 70–100% heavy.
      Above 100%, rolling is disabled.
    </p>

    <button id="altar">LEVELING</button>
    <button id="leave">RETURN</button>
  `);

    document.querySelectorAll('[data-slot]').forEach(select => {
        select.value = inventory.equipped[select.dataset.slot] || '';

        select.onchange = () => {
            inventory.equip(select.dataset.slot, select.value);
            player.updateEquipmentVisuals();
            showEquipment();
        };
    });

    $('altar').onclick = showAltar;
    $('leave').onclick = resume;
}

function toggleLock() {
    if (game.target) {
        game.target = null;
        return;
    }

    const candidates = enemies.filter(enemy =>
        enemy.alive &&
        enemy.position.distanceTo(player.position) < 25 &&
        game.combat.clearPath(player, enemy)
    );

    candidates.sort((a, b) =>
        a.position.distanceToSquared(player.position) -
        b.position.distanceToSquared(player.position)
    );

    game.target = candidates[0] || null;
}

function separateActors(dt) {
    const actors = [player, ...enemies].filter(actor => actor.alive);

    for (let i = 0; i < actors.length; i++) {
        for (let j = i + 1; j < actors.length; j++) {
            const a = actors[i];
            const b = actors[j];
            const offset = b.position.clone().sub(a.position);
            offset.y = 0;

            const distance = offset.length();
            const minimum = a.body.radius + b.body.radius;

            if (distance >= minimum) continue;

            if (distance < 0.001) offset.set(1, 0, 0);
            else offset.divideScalar(distance);

            const correction = Math.min(0.12, (minimum - distance) * 0.5);
            const speed = correction / dt;

            physics.move(a.body, offset.clone().multiplyScalar(-speed), dt);
            physics.move(b.body, offset.clone().multiplyScalar(speed), dt);
        }
    }
}

function updateHUD() {
    $('hp').style.width = `${100 * player.hp / progression.maxHP}%`;
    $('stamina').style.width =
        `${100 * player.stamina / progression.maxStamina}%`;

    $('hpText').textContent = `${Math.ceil(player.hp)} / ${progression.maxHP}`;
    $('staminaText').textContent =
        `${Math.floor(player.stamina)} / ${progression.maxStamina}`;

    $('resources').textContent =
        `FLASKS ${player.flasks}/3 · GRACE ${progression.grace}` +
        ` · SCRAP ${progression.scrap} · FREED ${progression.converts}`;

    if (inventory.heraldSoul.awarded) {
        $('resources').textContent += inventory.hasHeraldSoul
            ? ' · HERALD SOUL 1'
            : ' · HERALD SOUL EXCHANGED';
    }

    $('load').textContent =
        `LOAD ${(inventory.weight / progression.maxLoad * 100).toFixed(1)}%` +
        ` · ${player.tier.name}`;

    $('state').textContent = player.invulnerable
        ? 'INVULNERABLE'
        : player.parrying
            ? 'PARRY ACTIVE'
            : player.state.toUpperCase();

    $('bossHud').hidden = !boss.engaged || !boss.alive;
    $('bossName').textContent =
        `PRINCE RAHU-KETU — PHASE ${boss.phase}`;
    $('bossHP').style.width = `${Math.max(0, boss.hp / boss.maxHP * 100)}%`;

    const target = game.target;

    if (target?.alive) {
        const screen = target.position.clone();
        screen.y += target.boss ? 2.4 : 1.5;
        screen.project(camera);

        const visible = screen.z >= -1 && screen.z <= 1 &&
            Math.abs(screen.x) <= 1 && Math.abs(screen.y) <= 1;

        $('reticle').hidden = !visible;
        $('reticle').style.left = `${(screen.x * 0.5 + 0.5) * innerWidth}px`;
        $('reticle').style.top = `${(-screen.y * 0.5 + 0.5) * innerHeight}px`;
        $('reticle').style.color = target.broken ? '#ffffff' : '#ffd700';
    } else {
        $('reticle').hidden = true;
    }

    let hint = '';

    if (player.alive && nearAltar()) {
        hint = '[E] REST & LEVEL UP · [I] EQUIPMENT';
    }

    if (nearHeraldTrader()) {
        hint = inventory.hasHeraldSoul
            ? '[E] SPEAK TO MALAKH · BOSS SOUL ACQUIRED · CHOOSE ONE RELIC'
            : '[E] SPEAK TO MALAKH OF THE LAMPSTANDS';
    }

    const broken = enemies.find(enemy =>
        enemy.alive &&
        enemy.broken &&
        enemy.position.distanceTo(player.position) < 3
    );

    if (broken) {
        hint = broken.boss
            ? '[LMB] RIPOSTE'
            : '[F] DELIVER: +120 GRACE, +1 FLASK · [LMB] EXECUTE: +50 GRACE, +2 SCRAP';
    }

    if (droppedGrace?.amount &&
        player.position.distanceTo(droppedGrace.position) < 2) {
        hint = `[E] RECOVER ${droppedGrace.amount} GRACE`;
    }

    $('hint').textContent = hint;
}

function tick(dt) {
    game.time += dt;
    heraldTrader.update(game.time);
    input.advance();

    if (input.take('lock') && player.alive) toggleLock();

    if (game.target && (
        !game.target.alive ||
        game.target.position.distanceTo(player.position) > 30
    )) {
        game.target = null;
    }

    if (player.alive && player.actionable) {
        if (input.take('interact')) {
            if (droppedGrace?.amount &&
                player.position.distanceTo(droppedGrace.position) < 2) {
                progression.grace += droppedGrace.amount;
                droppedGrace = null;
                graceMarker.visible = false;
                game.toast('GRACE RECOVERED');
            } else if (nearHeraldTrader()) {
                showHeraldTrade();
                return;
            } else if (nearAltar()) {
                rest();
                return;
            }
        }

        if (input.take('inventory')) {
            if (nearAltar()) {
                showEquipment();
                return;
            }

            game.toast('CHANGE EQUIPMENT AT THE SANCTUARY ALTAR');
        }
    }

    player.update(dt, game);

    if (player.alive) {
        for (const enemy of enemies) {
            enemy.update(dt, game);
            if (!player.alive) break;
        }

        if (player.alive) separateActors(dt);
    }

    if (player.position.y < -10 && player.alive) {
        player.hp = 0;
        game.onDeath();
    }

    if (deathTimer > 0) {
        deathTimer -= dt;

        if (deathTimer <= 0) {
            deathTimer = 0;

            setMenu('dead', `
        <h2>THE REMNANT ENDURES</h2>
        <p>Your unspent Grace remains where you fell.
           Dying again replaces that drop.</p>
        <button id="rise">RISE AT THE SANCTUARY</button>
      `);

            $('rise').onclick = () => {
                respawn();
                resume();
            };
        }
    }

    game.combat.update(dt);

    if (graceMarker.visible) {
        graceMarker.rotation.y += dt;
    }

    if (toastRemaining > 0) {
        toastRemaining -= dt;
        if (toastRemaining <= 0) $('toast').style.opacity = '0';
    }
}

document.addEventListener('pointerlockchange', () => {
    if (!document.pointerLockElement && mode === 'play') showPause();
});

document.addEventListener('visibilitychange', () => {
    if (document.hidden) showPause();
});

addEventListener('blur', showPause);

addEventListener('keydown', event => {
    if (event.code === 'Escape' && mode === 'play') showPause();
});

canvas.addEventListener('click', () => {
    if (mode === 'play' && !document.pointerLockElement) {
        try {
            canvas.requestPointerLock()?.catch(() => { });
        } catch {
            // Keyboard camera turning remains available.
        }
    }
});

const STEP = 1 / 60;

function frame(now) {
    const elapsed = Math.min(0.1, (now - previousTime) / 1000);
    previousTime = now;

    if (mode === 'play') {
        accumulator += elapsed;

        while (accumulator >= STEP && mode === 'play') {
            tick(STEP);
            accumulator -= STEP;
        }
    } else {
        accumulator = 0;
    }

    follow.update(
        Math.min(elapsed, 0.05),
        player,
        game.target,
        input
    );

    updateHUD();
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
}

showTitle();
requestAnimationFrame(frame);
