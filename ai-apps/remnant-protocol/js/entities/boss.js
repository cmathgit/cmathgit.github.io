import * as THREE from 'three';
import { Enemy } from './enemy.js';

export class Boss extends Enemy {
    constructor(scene, physics, position) {
        super(scene, physics, position, 'boss');

        this.scene = scene;
        this.phase = 1;
        this.engaged = false;
        this.pattern = 0;
        this.phantoms = [];

        this.beams = new THREE.Group();

        const material = new THREE.MeshBasicMaterial({
            color: 0xbb55ff,
            transparent: true,
            opacity: 0.7
        });

        for (let i = 0; i < 3; i++) {
            const arm = new THREE.Group();
            arm.rotation.y = i * Math.PI * 2 / 3;

            const beam = new THREE.Mesh(
                new THREE.BoxGeometry(0.28, 0.18, 16),
                material
            );

            beam.position.set(0, 0.7, 8);
            arm.add(beam);
            this.beams.add(arm);
        }

        this.beams.visible = false;
        scene.add(this.beams);
    }

    cancelExtras() {
        this.phantoms.length = 0;
        this.beams.visible = false;
    }

    reset() {
        super.reset();
        this.phase = 1;
        this.engaged = false;
        this.pattern = 0;
        this.cancelExtras();
    }

    chooseAttack(game) {
        this.pattern++;

        if (this.phase === 2 && this.pattern % 3 === 0) {
            this.state = 'laser';
            this.frame = 0;
            this.beamCooldown = 0;
            this.beamAngle = 0;
            game.toast('DARK SOLAR ARRAY — ROLL THROUGH THE BEAMS');
            game.sound.playTelegraph(true);
            return;
        }

        if (this.pattern % 3 === 0) {
            this.beginAttack(game, [{
                at: 55,
                active: 8,
                recovery: 65,
                range: 6,
                arc: -1,
                damage: 150,
                poise: 90,
                unblockable: true
            }]);
            return;
        }

        this.beginAttack(game, [35, 68, 112].map((at, index) => ({
            at: this.phase === 2 ? at - 5 : at,
            active: 6,
            recovery: index === 2 ? 45 : 0,
            range: 4.3,
            arc: -0.05,
            damage: 76 + index * 16,
            poise: 48,
            unblockable: false
        })));
    }

    update(dt, game) {
        if (!this.alive) {
            this.cancelExtras();
            super.update(dt, game);
            return;
        }

        if (!this.engaged && game.player.position.z < -18) {
            this.engaged = true;
            game.toast('PRINCE RAHU-KETU — HERALD OF THE ECLIPSE');
        }

        if (this.engaged && this.phase === 1 && this.hp <= this.maxHP * 0.5) {
            this.phase = 2;
            this.state = 'transition';
            this.frame = 0;
            this.cancelExtras();
            game.world.eclipse(true);
            game.sound.playBossPhase2();
            game.toast('THE FALSE ECLIPSE');
        }

        if (this.state === 'transition') {
            this.frame++;
            this.animate(game, 0);
            this.rig.pivot.position.y += Math.sin(this.frame / 120 * Math.PI) * 0.8;

            if (this.frame >= 120) {
                this.state = 'idle';
                this.cooldown = 0.4;
            }

            return;
        }

        if (this.state === 'laser') {
            this.frame++;
            this.beamCooldown = Math.max(0, this.beamCooldown - dt);
            this.animate(game, 0);
            this.rig.rightArm.rotation.x = -2;
            this.beams.position.copy(this.position);
            this.beams.visible = this.frame >= 60;
            this.beamAngle += dt * 0.8;
            this.beams.rotation.y = this.beamAngle;

            if (this.frame >= 60 && this.beamCooldown === 0) {
                const offset = game.player.position.clone().sub(this.position);
                const radius = Math.hypot(offset.x, offset.z);
                const angle = Math.atan2(offset.x, offset.z);

                for (let i = 0; i < 3; i++) {
                    const beamAngle = this.beamAngle + i * Math.PI * 2 / 3;
                    const delta = Math.atan2(
                        Math.sin(angle - beamAngle),
                        Math.cos(angle - beamAngle)
                    );

                    if (radius < 16 &&
                        Math.cos(delta) > 0 &&
                        Math.abs(Math.sin(delta) * radius) < 0.65) {
                        game.combat.damagePlayer(this, {
                            damage: 95,
                            poise: 55,
                            unblockable: true,
                            elemental: true
                        });

                        this.beamCooldown = 0.55;
                        break;
                    }
                }
            }

            if (this.frame >= 240) {
                this.beams.visible = false;
                this.state = 'idle';
                this.cooldown = 1.2;
            }

            return;
        }

        const previousState = this.state;
        const previousFrame = this.frame;

        super.update(dt, game);

        if (this.phase === 2 &&
            this.state === 'attack' &&
            previousState === 'attack') {
            for (const move of this.moves) {
                if (previousFrame < move.at && this.frame >= move.at) {
                    this.phantoms.push({
                        delay: 24,
                        position: this.position.clone(),
                        facing: this.facing.clone(),
                        move: { ...move, damage: move.damage * 0.6 }
                    });
                }
            }
        }

        for (const phantom of [...this.phantoms]) {
            phantom.delay--;

            if (phantom.delay === 12) {
                game.combat.burst(phantom.position, 0x9944ff, 1.2);
            }

            if (phantom.delay <= 0) {
                game.combat.enemySwing({
                    position: phantom.position,
                    facing: phantom.facing,
                    alive: true,
                    state: 'attack',
                    phantom: true
                }, {
                    ...phantom.move,
                    unblockable: true,
                    hit: new Set()
                });

                this.phantoms.splice(this.phantoms.indexOf(phantom), 1);
            }
        }
    }
}