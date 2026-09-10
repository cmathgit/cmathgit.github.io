import * as THREE from 'three';
import { makeRig } from './player.js';
import {
    animateRig,
    resetRig
} from '../engine/animation-controller.js';

export class Enemy {
    constructor(scene, physics, position, kind = 'initiate') {
        this.physics = physics;
        this.kind = kind;
        this.boss = kind === 'boss';
        this.spawn = position.clone();

        this.body = physics.makeBody(
            position,
            this.boss ? 0.7 : 0.45,
            this.boss ? 3.1 : 1.8
        );

        this.position = this.body.position;

        this.rig = makeRig(
            kind === 'enforcer' ? 0x344456 : 0x382a40,
            0xff2a5f,
            this.boss ? 1.65 : 1,
            kind
        );

        this.rig.shield.visible = kind === 'enforcer';
        scene.add(this.rig.root);

        this.facing = new THREE.Vector3(0, 0, 1);
        this.maxHP = this.boss ? 3500 : kind === 'enforcer' ? 380 : 220;
        this.maxPoise = this.boss ? 160 : kind === 'enforcer' ? 95 : 55;

        this.hp = this.maxHP;
        this.poise = this.maxPoise;
        this.state = 'idle';
        this.frame = 0;
        this.cooldown = 0.5;
        this.attackSerial = 0;
        this.removed = false;
    }

    get alive() {
        return !this.removed && this.hp > 0;
    }

    get broken() {
        return this.state === 'broken';
    }

    reset() {
        this.physics.teleport(this.body, this.spawn);
        this.hp = this.maxHP;
        this.poise = this.maxPoise;
        this.state = 'idle';
        this.frame = 0;
        this.cooldown = 0.6;
        this.removed = false;

        resetRig(this.rig);
        this.rig.root.visible = true;
        this.rig.previousHP = this.hp;
        this.rig.damagedAt = -Infinity;
        this.rig.previousState = '';

        // boss.js resets phase immediately after super.reset().
        // Restore the visual phase-one presentation as well.
        this.rig.materials.aura.color.setHex(
            this.boss ? 0xc9984e : this.rig.glow
        );
        this.rig.materials.aura.emissive.copy(
            this.rig.materials.aura.color
        );

        for (let i = 0; i < this.rig.appendages.length; i++) {
            this.rig.appendages[i].base.visible = i < 2;
        }
    }

    stanceBreak(game) {
        this.state = 'broken';
        this.frame = 0;
        this.cancelExtras?.();
        game.toast('STANCE BROKEN');
    }

    beginAttack(game, moves) {
        this.state = 'attack';
        this.frame = 0;
        this.moves = moves;
        this.attackSerial++;

        for (const move of moves) {
            move.hit = new Set();
            move.warned = false;
        }
    }

    chooseAttack(game) {
        const enforcer = this.kind === 'enforcer';

        this.beginAttack(game, [{
            at: enforcer ? 43 : 34,
            active: 5,
            recovery: 36,
            range: enforcer ? 3.2 : 2.6,
            arc: 0.3,
            damage: enforcer ? 92 : 58,
            poise: 40,
            unblockable: false
        }]);
    }

    update(dt, game) {
        if (!this.alive) {
            // Preserve the existing immediate enemy-removal behavior.
            this.rig.root.visible = false;
            return;
        }

        this.frame++;
        this.cooldown -= dt;

        const offset = game.player.position.clone().sub(this.position);
        offset.y = 0;

        const distance = offset.length();
        const velocity = new THREE.Vector3();

        if (this.state === 'broken') {
            if (this.frame >= 210) {
                this.state = 'idle';
                this.poise = this.maxPoise;
                this.cooldown = 0.6;
            }
        } else if (this.state === 'attack') {
            const first = this.moves[0];

            // Original tracking cutoff: attacks can still be sidestepped.
            if (this.frame < first.at - 12 && distance > 0.01) {
                this.facing.lerp(offset.normalize(), 0.12).normalize();
            }

            for (const move of this.moves) {
                if (!move.warned && this.frame >= move.at - 24) {
                    move.warned = true;
                    game.sound.playTelegraph(move.unblockable);
                }

                if (this.frame >= move.at &&
                    this.frame < move.at + move.active) {
                    game.combat.enemySwing(this, move);

                    if (this.state !== 'attack') break;
                }
            }

            const last = this.moves[this.moves.length - 1];

            if (this.state === 'attack' &&
                this.frame >= last.at + last.active + last.recovery) {
                this.state = 'idle';
                this.cooldown = this.boss ? 0.65 : 0.9;
            }
        } else if (this.state === 'idle' && game.player.alive) {
            const active = this.boss ? this.engaged : distance < 12;

            if (active && distance > 0.01) {
                this.facing.copy(offset.normalize());

                if (distance > (this.boss ? 4 : 2.2)) {
                    velocity.copy(this.facing).multiplyScalar(
                        this.boss ? 2.7 : 2
                    );
                } else if (this.cooldown <= 0) {
                    this.chooseAttack(game);
                }
            }
        }

        this.physics.move(this.body, velocity, dt);
        this.animate(game, velocity.length());
    }

    // Boss.update() also calls this during transition and laser states.
    animate(game, speed) {
        animateRig(this.rig, this, game, speed);
    }
}