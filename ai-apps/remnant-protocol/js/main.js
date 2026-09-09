import * as THREE from 'three';

import { createRenderer } from './engine/renderer.js';
import { Input } from './engine/input.js';
import { Physics } from './engine/physics.js';
import { FollowCamera } from './engine/camera.js';
import { Sound } from './engine/audio.js';

import { Player } from './entities/player.js';
import { Enemy } from './entities/enemy.js';
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
    sound.setMusicMode('main');
}

function rest() {
    player.restore(world.spawn);
    game.target = null;

    for (const enemy of enemies) {
        if (enemy.boss && game.victory) continue;
        enemy.reset();
    }

    world.eclipse(false);
    sound.setMusicMode('main');
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
            .filter(([, item]) => item.slot === slot)
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
      All listed equipment is available for prototype testing.
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
