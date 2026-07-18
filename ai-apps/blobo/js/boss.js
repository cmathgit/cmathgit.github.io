'use strict';

/* ================================================================
   CLERIC BEAST  — Boss Fight
   Phase 1 (100%–50%): Claw Swipe, Leap, 3-Hit Combo
   Phase 2 ( 50%– 0%): + Frenzy Howl, Charge, faster attacks
   ================================================================ */

const BS = Object.freeze({
    IDLE: 'idle', WALK: 'walk',
    CLAW: 'claw', LEAP: 'leap', COMBO1: 'combo1', COMBO2: 'combo2', COMBO3: 'combo3',
    HOWL: 'howl', CHARGE: 'charge',
    STAGGER: 'stagger', PARRIED: 'parried', DEATH: 'death'
});

class Boss {
    constructor(x, y) {
        this.alive = true;
        this.active = false;

        // Stats
        this.maxHp = 450;
        this.hp    = 450;
        this.phase = 1;

        // Dimensions (large creature)
        this.w = 80; this.h = 96;
        this.x = x * G.RTILE;
        this.y = y * G.RTILE + (G.RTILE - this.h);
        this.vx = 0; this.vy = 0;
        this.facing = -1;
        this.onGround = false;

        // State
        this.state = BS.IDLE;
        this.stateTimer = 0;
        this.cooldown = 60;          // frames between attacks
        this.cooldownTimer = 0;

        // Attack hitbox
        this.atkBox = null;
        this.atkDmg = 0;
        this.canParry = false;

        // Name reveal
        this.nameReveal = 0;

        // Animation
        this.animTimer = 0;

        // Spawn
        this.spawnX = this.x; this.spawnY = this.y;
    }

    _set(s) {
        if (this.state === BS.DEATH) return;
        this.state = s; this.stateTimer = 0;
        this.atkBox = null; this.canParry = false;
    }

    activate() {
        this.active = true;
        this.nameReveal = 180;
        G.audio.bossRoar();
        G.renderer.addShake(6, 20);
    }

    update(player, level) {
        if (!this.alive || !this.active) return;
        this.stateTimer++;
        this.animTimer++;
        if (this.nameReveal > 0) this.nameReveal--;

        const px = player.x + player.w / 2;
        const cx = this.x + this.w / 2;
        const dist = Math.abs(px - cx);

        // Phase check
        if (this.phase === 1 && this.hp <= this.maxHp * 0.5) {
            this.phase = 2;
            this._set(BS.HOWL);
            G.audio.bossRoar();
            G.renderer.addShake(10, 30);
            G.particles.bossEnrage(cx, this.y + this.h / 2);
            this.cooldown = 40; // Faster in phase 2
            return;
        }

        switch (this.state) {
            case BS.IDLE:    this._idle(px, dist, player); break;
            case BS.WALK:    this._walk(px, dist, player); break;
            case BS.CLAW:    this._claw(); break;
            case BS.LEAP:    this._leap(player); break;
            case BS.COMBO1:  this._combo(1); break;
            case BS.COMBO2:  this._combo(2); break;
            case BS.COMBO3:  this._combo(3); break;
            case BS.HOWL:    this._howl(); break;
            case BS.CHARGE:  this._charge(); break;
            case BS.STAGGER: this._stagger(); break;
            case BS.PARRIED: this._parried(); break;
            case BS.DEATH:   break;
        }

        // Gravity
        if (!this.onGround) { this.vy += G.GRAVITY; if (this.vy > 14) this.vy = 14; }
        if (this.onGround && this.state !== BS.LEAP && this.state !== BS.CHARGE) this.vx *= 0.8;

        level.resolveCollisions(this);
    }

    /* ---- AI ---- */
    _idle(px, dist, player) {
        this.vx = 0;
        if (player.state === PS.DEATH) return;
        this.facing = px > this.x + this.w / 2 ? 1 : -1;
        this.cooldownTimer--;
        if (this.cooldownTimer <= 0) {
            this._chooseAttack(dist);
        } else if (this.cooldownTimer < this.cooldown - 20) {
            this._set(BS.WALK);
        }
    }

    _walk(px, dist, player) {
        if (player.state === PS.DEATH) { this._set(BS.IDLE); return; }
        this.facing = px > this.x + this.w / 2 ? 1 : -1;
        this.vx = this.facing * (this.phase === 2 ? 2.2 : 1.6);
        this.cooldownTimer--;
        if (this.cooldownTimer <= 0) this._chooseAttack(dist);
    }

    _chooseAttack(dist) {
        const roll = Math.random();
        if (this.phase === 2 && roll < 0.2 && dist > 200) {
            this._set(BS.CHARGE);
        } else if (dist > 250) {
            this._set(BS.LEAP);
        } else if (roll < 0.35) {
            this._set(BS.CLAW);
        } else if (roll < 0.7) {
            this._set(BS.COMBO1);
        } else if (this.phase === 2 && roll < 0.85) {
            this._set(BS.HOWL);
        } else {
            this._set(BS.LEAP);
        }
    }

    /* ---- Claw Swipe ---- */
    _claw() {
        const WINDUP = this.phase === 2 ? 18 : 24;
        const ACTIVE = WINDUP + 10;
        const END    = ACTIVE + 20;

        if (this.stateTimer < WINDUP) {
            this.canParry = true;
            this.vx = 0;
        } else if (this.stateTimer < ACTIVE) {
            this.canParry = false;
            const reach = 75;
            const hx = this.facing === 1 ? this.x + this.w : this.x - reach;
            this.atkBox = { x: hx, y: this.y + 10, w: reach, h: this.h - 20 };
            this.atkDmg = this.phase === 2 ? 25 : 20;
            if (this.stateTimer === WINDUP) this.vx = this.facing * 4;
        } else {
            this.atkBox = null;
        }

        if (this.stateTimer >= END) {
            this.cooldownTimer = this.cooldown;
            this._set(BS.IDLE);
        }
    }

    /* ---- Leap Attack ---- */
    _leap(player) {
        if (this.stateTimer === 1) {
            // Jump toward player
            const dx = (player.x + player.w / 2) - (this.x + this.w / 2);
            this.vx = Math.sign(dx) * Math.min(Math.abs(dx) * 0.04, 8);
            this.vy = -14;
            this.onGround = false;
            G.audio.bossRoar();
        }

        // Landing
        if (this.onGround && this.stateTimer > 10) {
            // AoE landing
            this.atkBox = {
                x: this.x - 30, y: this.y,
                w: this.w + 60, h: this.h
            };
            this.atkDmg = this.phase === 2 ? 28 : 22;
            G.renderer.addShake(8, 12);
            G.particles.dust(this.x + this.w / 2, this.y + this.h, 0);
            G.particles.dust(this.x + this.w / 2, this.y + this.h, 1);

            this.cooldownTimer = this.cooldown + 10;
            this._set(BS.IDLE);
        }
    }

    /* ---- 3-Hit Combo ---- */
    _combo(hit) {
        const WINDUP = this.phase === 2 ? 12 : 18;
        const ACTIVE = WINDUP + 8;
        const END    = ACTIVE + (hit === 3 ? 25 : 8);

        if (this.stateTimer < WINDUP) {
            this.canParry = (hit === 1); // Only first hit is parryable
            this.vx = 0;
        } else if (this.stateTimer < ACTIVE) {
            this.canParry = false;
            const reach = hit === 3 ? 85 : 65;
            const hx = this.facing === 1 ? this.x + this.w : this.x - reach;
            this.atkBox = { x: hx, y: this.y + 5, w: reach, h: this.h - 10 };
            this.atkDmg = hit === 3 ? (this.phase === 2 ? 30 : 24) : (this.phase === 2 ? 18 : 14);
            if (this.stateTimer === WINDUP) this.vx = this.facing * 3;
        } else {
            this.atkBox = null;
        }

        if (this.stateTimer >= END) {
            if (hit < 3) {
                this._set(hit === 1 ? BS.COMBO2 : BS.COMBO3);
            } else {
                this.cooldownTimer = this.cooldown + 15;
                this._set(BS.IDLE);
            }
        }
    }

    /* ---- Frenzy Howl (Phase 2) — AoE stagger ---- */
    _howl() {
        this.vx = 0;
        if (this.stateTimer === 15) {
            // AoE around boss
            this.atkBox = {
                x: this.x - 60, y: this.y - 20,
                w: this.w + 120, h: this.h + 20
            };
            this.atkDmg = 12;
            G.audio.bossRoar();
            G.renderer.addShake(8, 15);
            G.particles.bossEnrage(this.x + this.w / 2, this.y + this.h / 2);
        } else {
            this.atkBox = null;
        }

        if (this.stateTimer >= 50) {
            this.cooldownTimer = this.cooldown;
            this._set(BS.IDLE);
        }
    }

    /* ---- Charge (Phase 2) ---- */
    _charge() {
        if (this.stateTimer < 20) {
            this.vx = 0;
            this.canParry = true;
        } else if (this.stateTimer < 45) {
            this.canParry = false;
            this.vx = this.facing * 10;
            this.atkBox = {
                x: this.x + (this.facing === 1 ? this.w / 2 : 0),
                y: this.y + 10,
                w: this.w / 2 + 20, h: this.h - 20
            };
            this.atkDmg = 28;
        } else {
            this.atkBox = null;
            this.vx *= 0.7;
        }

        if (this.stateTimer >= 60) {
            this.cooldownTimer = this.cooldown + 20;
            this._set(BS.IDLE);
        }
    }

    /* ---- damage states ---- */
    _stagger() {
        this.vx *= 0.85;
        if (this.stateTimer >= 20) this._set(BS.IDLE);
    }

    _parried() {
        this.vx = 0;
        if (this.stateTimer >= 100) this._set(BS.IDLE);
    }

    /* ---- take damage ---- */
    takeDamage(amount) {
        if (!this.alive) return false;
        this.hp -= amount;
        if (this.hp <= 0) {
            this.hp = 0; this.alive = false;
            this._set(BS.DEATH);
            this.vx = 0;
            G.audio.enemyDeath();
            G.renderer.addShake(12, 30);
            G.particles.deathSmoke(this.x + this.w / 2, this.y + this.h / 2);
            G.particles.visceralBurst(this.x + this.w / 2, this.y + this.h / 3);
            return true;
        }
        // Only stagger on big hits
        if (amount >= 25 && this.state !== BS.PARRIED && this.state !== BS.HOWL) {
            this._set(BS.STAGGER);
        }
        G.audio.hit();
        return false;
    }

    parry() {
        this._set(BS.PARRIED);
        this.vx = 0;
        G.audio.parry();
        G.particles.sparks(this.x + this.w / 2, this.y + 20);
        G.renderer.addShake(6, 10);
    }

    /* ================================================================
       RENDER — Cleric Beast procedural pixel art
       ================================================================ */
    render(ctx, camX, camY) {
        if (!this.active) return;
        if (!this.alive && this.stateTimer > 120) return;

        const px = Math.round(this.x - camX);
        const py = Math.round(this.y - camY);

        ctx.save();
        if (this.facing === -1) {
            ctx.translate(px + this.w, py); ctx.scale(-1, 1);
        } else {
            ctx.translate(px, py);
        }

        if (!this.alive) ctx.globalAlpha = Math.max(0, 1 - this.stateTimer / 120);
        if (this.state === BS.PARRIED) ctx.globalAlpha *= (Math.floor(this.stateTimer / 3) % 2 ? 1 : 0.5);

        this._drawBody(ctx);
        ctx.restore();

        // Name reveal
        if (this.nameReveal > 0 && this.alive) {
            const alpha = this.nameReveal > 30 ? Math.min(1, (180 - this.nameReveal) / 30) :
                          this.nameReveal / 30;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#ddd';
            ctx.font = 'bold 22px "Georgia", serif';
            ctx.textAlign = 'center';
            ctx.fillText('CLERIC BEAST', G.W / 2, G.H - 80);
            ctx.font = '14px "Georgia", serif';
            ctx.fillStyle = '#aaa';
            ctx.fillText('Nightmare of Yharnam', G.W / 2, G.H - 58);
            ctx.globalAlpha = 1;
        }
    }

    _drawBody(ctx) {
        const w = this.w, h = this.h;
        const phase2 = this.phase === 2;

        // ---- Body (hunched, massive torso) ----
        ctx.fillStyle = phase2 ? '#3a1818' : '#2a1a1a';
        ctx.fillRect(10, 30, w - 20, 40);

        // ---- Head ----
        ctx.fillStyle = phase2 ? '#4a2020' : '#3a2222';
        ctx.fillRect(w - 15, 8, 20, 24);
        // Snout
        ctx.fillStyle = '#2a1818';
        ctx.fillRect(w, 18, 10, 12);
        // Jaws (open during attack/howl)
        const jawOpen = (this.state === BS.CLAW || this.state === BS.HOWL ||
                         this.state === BS.COMBO1 || this.state === BS.COMBO2 || this.state === BS.COMBO3);
        if (jawOpen) {
            ctx.fillStyle = '#1a0808';
            ctx.fillRect(w, 24, 10, 8);
            ctx.fillStyle = '#fff';
            ctx.fillRect(w + 2, 23, 2, 3);
            ctx.fillRect(w + 6, 23, 2, 3);
        }
        // Eyes
        ctx.fillStyle = phase2 ? '#ff2200' : '#ff6644';
        ctx.fillRect(w - 8, 14, 4, 4);
        ctx.fillRect(w - 2, 14, 4, 4);
        // Eye glow (phase 2)
        if (phase2) {
            ctx.globalAlpha *= 0.4;
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(w - 12, 10, 14, 12);
            ctx.globalAlpha /= 0.4;
        }

        // ---- Antlers ----
        ctx.fillStyle = '#554433';
        ctx.fillRect(w - 14, 0, 3, 12);
        ctx.fillRect(w - 18, 2, 3, 8);
        ctx.fillRect(w - 6, 0, 3, 10);
        ctx.fillRect(w - 2, 2, 3, 7);
        ctx.fillRect(w - 22, 4, 5, 3);
        ctx.fillRect(w + 2, 3, 4, 3);

        // ---- Arms (long, clawed) ----
        ctx.fillStyle = phase2 ? '#3a1818' : '#2a1a1a';
        // Right arm
        const armSwing = (this.state === BS.CLAW || this.state === BS.COMBO1 ||
                          this.state === BS.COMBO2 || this.state === BS.COMBO3);
        if (armSwing && this.stateTimer > 10) {
            const angle = -0.5 + Math.min(this.stateTimer - 10, 12) / 12 * 1.5;
            ctx.save(); ctx.translate(w - 5, 35); ctx.rotate(angle);
            ctx.fillRect(0, -5, 45, 10);
            // Claws
            ctx.fillStyle = '#ddd';
            ctx.fillRect(42, -7, 3, 5);
            ctx.fillRect(45, -5, 3, 5);
            ctx.fillRect(42, 5, 3, 5);
            ctx.restore();
        } else {
            ctx.fillRect(w - 5, 30, 12, 35);
            ctx.fillStyle = '#ddd';
            ctx.fillRect(w + 3, 62, 3, 6);
            ctx.fillRect(w + 6, 60, 3, 6);
        }
        // Left arm
        ctx.fillStyle = phase2 ? '#3a1818' : '#2a1a1a';
        ctx.fillRect(8, 32, 10, 30);
        ctx.fillStyle = '#ddd';
        ctx.fillRect(6, 60, 3, 5);
        ctx.fillRect(10, 58, 3, 5);

        // ---- Legs ----
        ctx.fillStyle = phase2 ? '#2a1010' : '#1a1212';
        const legA = Math.sin(this.animTimer * 0.2) * 3;
        ctx.fillRect(18, 68, 12, 24 + legA);
        ctx.fillRect(w - 30, 68, 12, 24 - legA);
        // Feet/claws
        ctx.fillStyle = '#ddd';
        ctx.fillRect(16, h - 4 + (legA > 0 ? legA : 0), 5, 4);
        ctx.fillRect(w - 32, h - 4 - (legA > 0 ? 0 : legA), 5, 4);
        ctx.fillRect(26, h - 3 + (legA > 0 ? legA : 0), 5, 3);
        ctx.fillRect(w - 22, h - 3 - (legA > 0 ? 0 : legA), 5, 3);

        // ---- Fur / detail ----
        ctx.fillStyle = phase2 ? '#4a2222' : '#3a2828';
        for (let i = 15; i < w - 15; i += 8) {
            ctx.fillRect(i, 26, 4, 6);
        }
        // Ribs visible
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        for (let i = 0; i < 4; i++) {
            ctx.fillRect(14, 38 + i * 8, w - 28, 2);
        }

        // ---- Phase 2 blood drip particles ----
        if (phase2 && this.alive && this.animTimer % 8 === 0) {
            G.particles.blood(
                this.x + w / 2 + (Math.random() - 0.5) * 30,
                this.y + 40, 0
            );
        }

        // ---- Howl effect ----
        if (this.state === BS.HOWL && this.stateTimer > 10 && this.stateTimer < 30) {
            ctx.globalAlpha = 0.3;
            ctx.strokeStyle = '#ff4400';
            ctx.lineWidth = 2;
            const r = (this.stateTimer - 10) * 5;
            ctx.beginPath(); ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2); ctx.stroke();
            ctx.globalAlpha = 1;
        }

        // ---- Charge dust ----
        if (this.state === BS.CHARGE && this.stateTimer >= 20 && this.stateTimer < 45) {
            if (this.animTimer % 3 === 0) {
                G.particles.dust(this.x + w / 2, this.y + h, -this.facing);
            }
        }
    }

    get bounds() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }

    reset() {
        this.x = this.spawnX; this.y = this.spawnY;
        this.hp = this.maxHp; this.alive = true; this.active = false;
        this.phase = 1; this.cooldown = 60;
        this.vx = 0; this.vy = 0; this.facing = -1;
        this._set(BS.IDLE);
        this.nameReveal = 0;
    }
}
