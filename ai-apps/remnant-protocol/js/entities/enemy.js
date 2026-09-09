import * as THREE from 'three';
import { makeRig } from './player.js';

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
            this.boss ? 1.65 : 1
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
        this.rig.root.visible = true;
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

            // Tracking stops before impact so attacks can be sidestepped.
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
                    velocity.copy(this.facing).multiplyScalar(this.boss ? 2.7 : 2);
                } else if (this.cooldown <= 0) {
                    this.chooseAttack(game);
                }
            }
        }

        this.physics.move(this.body, velocity, dt);
        this.animate(game, velocity.length());
    }

    animate(game, speed) {
        const rig = this.rig;

        rig.root.position.copy(this.position);
        rig.root.rotation.y = Math.atan2(this.facing.x, this.facing.z);
        rig.pivot.rotation.set(0, 0, 0);
        rig.pivot.position.y = 0.95;
        rig.rightArm.rotation.set(0, 0, 0);
        rig.leftLeg.rotation.x = Math.sin(game.time * 8) * speed * 0.2;
        rig.rightLeg.rotation.x = -rig.leftLeg.rotation.x;

        let color = 0xff2a5f;

        if (this.broken) {
            rig.pivot.position.y = 0.55;
            rig.pivot.rotation.x = 0.5;
            color = 0xffd700;
        }

        if (this.state === 'attack') {
            const upcoming = this.moves.find(
                move => this.frame < move.at + move.active
            );

            if (upcoming) {
                const windup = this.frame < upcoming.at;
                color = upcoming.unblockable ? 0xff174d : 0xffd700;
                rig.rightArm.rotation.x = windup ? -2.1 : -0.5;
                rig.rightArm.rotation.y = windup ? -0.8 : 1.2;

                if (upcoming.unblockable && windup) {
                    rig.pivot.position.y = 0.75;
                }
            }
        }

        rig.light.color.setHex(color);
        rig.light.emissive.setHex(color);
        rig.light.emissiveIntensity = this.state === 'attack' ? 3.5 : 1.5;
    }
}