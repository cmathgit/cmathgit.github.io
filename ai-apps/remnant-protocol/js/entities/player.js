import * as THREE from 'three';
import {
    AnimationController,
    makeRig
} from '../engine/animation-controller.js';

// Preserve the original import location used by other game files.
export { makeRig };

export class Player {
    constructor(scene, physics, progression, inventory, spawn) {
        this.physics = physics;
        this.progression = progression;
        this.inventory = inventory;
        this.body = physics.makeBody(spawn);
        this.position = this.body.position;

        this.rig = makeRig(0x8393a5, 0xffd700, 1, 'player');
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

        this.setState(
            guardBreak ? 'guardBreak' : 'stagger',
            guardBreak ? 144 : 34
        );
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

        this.rig.previousHP = this.hp;
        this.rig.damagedAt = -Infinity;
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

                if (direction.lengthSq()) {
                    this.facing.copy(direction.normalize());
                }
            } else if (this.moving) {
                this.facing.copy(move);
            }
        }

        // Preserve the original roll-cancel window.
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
            const action = input.takeAny([
                'parry', 'heal', 'deliver', 'light', 'heavy'
            ]);

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
        const speed = this.actionable ? this.velocity.length() : 0;

        this.animations.update(
            dt,
            this.animationState(game),
            speed,
            this,
            game
        );
    }

    animationState(game) {
        if (this.state === 'guardBreak') return 'stagger';

        if (this.state === 'idle' && this.moving && this.actionable) {
            return 'run';
        }

        if (game.input.attackHeld && this.actionable) return 'heavy';

        return this.state;
    }

    // Retained for compatibility. Procedural attack poses use actual
    // gameplay frames instead of altering playback speed.
    animationSpeed() {
        if (this.state === 'roll' && this.rollTier) return 1.15;
        if (this.state === 'heavy') return 0.85 + (this.charge || 0) * 0.3;
        if (this.state === 'light') return this.combo ? 1.08 : 1;
        if (this.state === 'block') return 0.85;
        if (this.state === 'heal') return 0.8;
        return 1;
    }
}