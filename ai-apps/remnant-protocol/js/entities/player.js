import * as THREE from 'three';
import { AnimationController } from '../engine/animation-controller.js';

// Shared procedural rig. Faces local +Z.
export function makeRig(color = 0x8393a5, glow = 0xffd700, scale = 1) {
    const root = new THREE.Group();
    const pivot = new THREE.Group();
    pivot.position.y = 0.95;
    root.add(pivot);

    const metal = new THREE.MeshStandardMaterial({
        color,
        metalness: 0.8,
        roughness: 0.35
    });

    const light = new THREE.MeshStandardMaterial({
        color: glow,
        emissive: glow,
        emissiveIntensity: 1.8,
        metalness: 0.4,
        roughness: 0.25
    });

    function box(parent, width, height, depth, x, y, z, material = metal) {
        const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(width, height, depth),
            material
        );

        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        parent.add(mesh);
        return mesh;
    }

    const torso = box(pivot, 0.67, 0.7, 0.36, 0, 0.15, 0);
    box(pivot, 0.4, 0.4, 0.4, 0, 0.74, 0);
    box(pivot, 0.3, 0.06, 0.04, 0, 0.77, 0.22, light);

    function limb(x, y) {
        const joint = new THREE.Group();
        joint.position.set(x, y, 0);
        pivot.add(joint);
        box(joint, 0.2, 0.65, 0.22, 0, -0.3, 0);
        return joint;
    }

    const leftLeg = limb(-0.2, -0.3);
    const rightLeg = limb(0.2, -0.3);
    const leftArm = limb(-0.47, 0.42);
    const rightArm = limb(0.47, 0.42);

    box(rightArm, 0.1, 0.12, 0.3, 0, -0.65, 0.15);
    box(rightArm, 0.09, 0.08, 1.2, 0, -0.65, 0.85, light);

    const shield = box(
        leftArm, 0.58, 0.78, 0.12, 0, -0.2, 0.3, light
    );

    root.scale.setScalar(scale);

    return {
        root, pivot, torso, leftLeg, rightLeg,
        leftArm, rightArm, shield, light
    };
}

export class Player {
    constructor(scene, physics, progression, inventory, spawn) {
        this.physics = physics;
        this.progression = progression;
        this.inventory = inventory;
        this.body = physics.makeBody(spawn);
        this.position = this.body.position;
        this.rig = makeRig();
        scene.add(this.rig.root);
        this.animations = new AnimationController(scene, this.rig);

        this.facing = new THREE.Vector3(0, 0, -1);
        this.rollDirection = this.facing.clone();
        this.velocity = new THREE.Vector3();
        this.hp = progression.maxHP;
        this.stamina = progression.maxStamina;
        this.flasks = 3;
        this.state = 'idle';
        this.frame = 0;
        this.duration = 0;
        this.regenDelay = 0;
        this.poiseDamage = 0;
        this.poiseTimer = 0;
        this.combo = 0;
        this.lastAttackTick = -100;
        this.hit = new Set();
        this.moving = false;
    }

    get alive() {
        return this.hp > 0;
    }

    get tier() {
        return this.inventory.tier(this.progression.maxLoad);
    }

    get invulnerable() {
        return this.state === 'roll' &&
            this.frame >= this.rollTier.start &&
            this.frame <= this.rollTier.end;
    }

    get parrying() {
        return this.state === 'parry' &&
            this.frame >= 4 &&
            this.frame <= 9 + this.progression.extraParryFrames;
    }

    get actionable() {
        return this.state === 'idle' || this.state === 'block';
    }

    spend(amount) {
        if (this.stamina + 0.0001 < amount) return false;

        this.stamina = Math.max(0, this.stamina - amount);
        this.regenDelay = 0.7;
        return true;
    }

    setState(state, duration = 0) {
        this.state = state;
        this.frame = 0;
        this.duration = duration;
        this.hit.clear();
    }

    stun(guardBreak = false) {
        if (!this.alive) return;
        this.setState(guardBreak ? 'guardBreak' : 'stagger', guardBreak ? 144 : 34);
    }

    restore(spawn) {
        this.physics.teleport(this.body, spawn);
        this.hp = this.progression.maxHP;
        this.stamina = this.progression.maxStamina;
        this.flasks = 3;
        this.poiseDamage = 0;
        this.poiseTimer = 0;
        this.regenDelay = 0;
        this.setState('idle');
    }

    update(dt, game) {
        if (!this.alive) {
            this.state = 'dead';
            this.animate(dt, game);
            return;
        }

        const input = game.input;
        this.frame++;
        this.regenDelay = Math.max(0, this.regenDelay - dt);
        this.poiseTimer = Math.max(0, this.poiseTimer - dt);

        if (this.poiseTimer === 0) this.poiseDamage = 0;

        if (this.duration && this.frame >= this.duration) {
            this.setState('idle');
        }

        const move = game.follow.direction(input);
        this.moving = move.lengthSq() > 0;

        if (this.actionable) {
            if (game.target?.alive) {
                const direction = game.target.position.clone().sub(this.position);
                direction.y = 0;
                if (direction.lengthSq()) this.facing.copy(direction.normalize());
            } else if (this.moving) {
                this.facing.copy(move);
            }
        }

        // Roll can cancel light-attack recovery from frame 18 onward.
        if (this.actionable || (this.state === 'light' && this.frame >= 18)) {
            const roll = input.take('roll');

            if (roll) {
                if (!this.tier.travel) {
                    game.toast('OVERBURDENED — REMOVE EQUIPMENT');
                } else if (this.spend(this.inventory.has('greaves') ? 24 : 28)) {
                    this.rollTier = this.tier;
                    this.rollDirection.copy(this.moving ? move : this.facing);
                    this.setState('roll', this.rollTier.duration);
                }
            }
        }

        if (this.actionable) {
            const action = input.takeAny(['parry', 'heal', 'deliver', 'light', 'heavy']);

            if (action?.action === 'parry' && this.inventory.has('shield')) {
                this.setState('parry', 24 + this.progression.extraParryFrames);
            }

            if (action?.action === 'heal' &&
                this.flasks > 0 &&
                this.hp < this.progression.maxHP) {
                this.setState('heal', 75);
            }

            if (action?.action === 'deliver') {
                game.combat.deliver(this);
            }

            if (action?.action === 'light' || action?.action === 'heavy') {
                const heavy = action.action === 'heavy';
                const cost = heavy ? 36 : 20;

                if (this.spend(cost)) {
                    this.combo = !heavy && input.tick - this.lastAttackTick < 65
                        ? (this.combo + 1) % 2
                        : 0;

                    this.lastAttackTick = input.tick;
                    this.charge = action.charge || 0;
                    this.setState(heavy ? 'heavy' : 'light', heavy ? 58 : 32);
                    game.sound.playSlash();
                }
            }
        }

        if (this.actionable) {
            this.state = input.guard && this.inventory.has('shield')
                ? 'block'
                : 'idle';
        }

        if (this.state === 'heal' && this.frame === 42) {
            this.flasks--;
            this.hp = Math.min(
                this.progression.maxHP,
                this.hp + this.progression.maxHP * 0.55
            );
            game.sound.playPrayer();
        }

        if (this.state === 'light' && this.frame >= 10 && this.frame <= 15) {
            game.combat.playerSwing(this, false);
        }

        if (this.state === 'heavy' && this.frame >= 24 && this.frame <= 31) {
            game.combat.playerSwing(this, true);
        }

        this.velocity.set(0, 0, 0);
        let sprinting = false;

        if (this.actionable) {
            let speed = this.tier.travel ? 4 : 1.5;

            if (this.state === 'block') speed *= 0.45;
            if (input.attackHeld) speed *= 0.45;

            if (this.moving &&
                input.down('ShiftLeft') &&
                this.state !== 'block' &&
                !input.attackHeld &&
                this.tier.travel &&
                this.spend(17 * dt)) {
                speed = 6.6;
                sprinting = true;
            }

            this.velocity.copy(move).multiplyScalar(speed);
        }

        if (this.state === 'roll' && this.frame < this.rollTier.motion) {
            this.velocity.copy(this.rollDirection).multiplyScalar(
                this.rollTier.travel / (this.rollTier.motion / 60)
            );
        }

        if ((this.state === 'light' && this.frame < 12) ||
            (this.state === 'heavy' && this.frame >= 17 && this.frame < 26)) {
            this.velocity.copy(this.facing).multiplyScalar(2);
        }

        this.physics.move(this.body, this.velocity, dt);

        if (!sprinting && this.regenDelay <= 0 &&
            (this.actionable || this.state === 'stagger')) {
            const beltBonus = this.inventory.has('belt') ? 1.15 : 1;
            const guardPenalty = this.state === 'block' ? 0.25 : 1;

            this.stamina = Math.min(
                this.progression.maxStamina,
                this.stamina + this.tier.regen * beltBonus * guardPenalty * dt
            );
        }

        this.animate(dt, game);
    }

    animate(dt, game) {
        const animationState = this.animationState(game);
        const animationSpeed = this.animationSpeed();
        this.animations.root.position.copy(this.position);
        this.animations.root.rotation.y = Math.atan2(this.facing.x, this.facing.z);
        this.animations.update(dt, animationState, animationSpeed);

        if (this.animations.ready) return;

        const rig = this.rig;
        rig.root.position.copy(this.position);
        rig.root.rotation.y = Math.atan2(this.facing.x, this.facing.z);
        rig.shield.visible = this.inventory.has('shield');

        rig.pivot.rotation.set(0, 0, 0);
        rig.pivot.position.y = 0.95;
        rig.leftArm.rotation.set(0, 0, 0);
        rig.rightArm.rotation.set(0, 0, 0);

        const stride = this.moving && this.actionable
            ? Math.sin(game.time * 11) * 0.65
            : 0;

        rig.leftLeg.rotation.x = stride;
        rig.rightLeg.rotation.x = -stride;

        if (this.state === 'roll') {
            rig.pivot.rotation.x = Math.min(
                1, this.frame / this.rollTier.motion
            ) * Math.PI * 2;

            rig.pivot.position.y = 0.72;
        }

        if (this.state === 'light' || this.state === 'heavy') {
            const progress = this.frame / this.duration;
            rig.rightArm.rotation.x = -1.1;
            rig.rightArm.rotation.y = Math.sin(progress * Math.PI * 2) * 1.8;
            rig.pivot.rotation.y = Math.sin(progress * Math.PI * 2) * 0.35;
        } else if (game.input.attackHeld && this.actionable) {
            rig.rightArm.rotation.x = -2;
        }

        if (this.state === 'block' || this.state === 'parry') {
            rig.leftArm.rotation.x = -0.9;
            rig.leftArm.rotation.z = -0.35;
        }

        if (this.state === 'heal') rig.leftArm.rotation.x = -2;
        if (this.state === 'deliver') rig.leftArm.rotation.x = -1.5;

        if (this.state === 'stagger' || this.state === 'guardBreak') {
            rig.pivot.rotation.x = -0.45;
        }

        if (this.state === 'dead') {
            rig.pivot.rotation.z = Math.PI / 2;
            rig.pivot.position.y = 0.2;
        }

        rig.light.emissiveIntensity = this.invulnerable ? 5 : 1.8;
    }

    animationState(game) {
        if (this.state === 'guardBreak') return 'stagger';
        if (this.state === 'idle' && this.moving && this.actionable) return 'run';
        if (game.input.attackHeld && this.actionable) return 'heavy';
        return this.state;
    }

    animationSpeed() {
        if (this.state === 'roll' && this.rollTier) return 1.15;
        if (this.state === 'heavy') return 0.85 + this.charge * 0.3;
        if (this.state === 'light') return this.combo ? 1.08 : 1;
        if (this.state === 'block') return 0.85;
        if (this.state === 'heal') return 0.8;
        return 1;
    }
}
