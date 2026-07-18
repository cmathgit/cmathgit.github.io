'use strict';

/* ================================================================
   Enemies — Huntsman, Beast, Rat, Church Servant
   Each has patrol/chase AI, attack patterns, parryable attacks.
   ================================================================ */

let _enemyId = 0;

const ES = Object.freeze({
    IDLE: 'idle', PATROL: 'patrol', CHASE: 'chase',
    ATK_WINDUP: 'windup', ATK_ACTIVE: 'active', ATK_RECOVER: 'recover',
    STAGGER: 'stagger', PARRIED: 'parried', DEATH: 'death'
});

class Enemy {
    constructor(type, x, y, patrolL, patrolR) {
        this.id   = _enemyId++;
        this.type = type;
        this.alive = true;

        // Stats by type
        const stats = Enemy.STATS[type];
        this.maxHp = stats.hp;
        this.hp    = stats.hp;
        this.speed = stats.speed;
        this.dmg   = stats.dmg;
        this.echoes = stats.echoes;

        // Dimensions
        this.w = stats.w; this.h = stats.h;

        // Position
        this.x = x * G.RTILE; this.y = y * G.RTILE + (G.RTILE - this.h);
        this.vx = 0; this.vy = 0;
        this.facing = 1; this.onGround = false;

        // Patrol
        this.patrolL = patrolL * G.RTILE;
        this.patrolR = patrolR * G.RTILE;

        // State
        this.state = ES.PATROL;
        this.stateTimer = 0;
        this.aggroRange = stats.aggro;
        this.atkRange   = stats.atkRange;

        // Attack hitbox
        this.atkBox  = null;
        this.canParry = false;   // set during wind-up

        // Parried state
        this.parriedTimer = 0;

        // Spawn (for respawn)
        this.spawnX = this.x; this.spawnY = this.y;
    }

    _set(s) {
        if (this.state === ES.DEATH) return;
        this.state = s; this.stateTimer = 0;
        this.atkBox = null; this.canParry = false;
    }

    update(player, level) {
        if (!this.alive) return;
        this.stateTimer++;

        const px = player.x + player.w / 2;
        const py = player.y + player.h / 2;
        const cx = this.x + this.w / 2;
        const dist = Math.abs(px - cx);
        const dy   = Math.abs(py - (this.y + this.h / 2));

        switch (this.state) {
            case ES.PATROL:   this._patrol(dist, dy); break;
            case ES.IDLE:     this._idle(dist, dy); break;
            case ES.CHASE:    this._chase(px, dist, dy, player); break;
            case ES.ATK_WINDUP:  this._atkWindup(); break;
            case ES.ATK_ACTIVE:  this._atkActive(); break;
            case ES.ATK_RECOVER: this._atkRecover(); break;
            case ES.STAGGER:  this._stagger(); break;
            case ES.PARRIED:  this._parried(); break;
            case ES.DEATH:    break;
        }

        // Gravity
        if (!this.onGround) { this.vy += G.GRAVITY; if (this.vy > 10) this.vy = 10; }
        // Friction
        if (this.onGround && this.state !== ES.CHASE) this.vx *= 0.8;

        level.resolveCollisions(this);
    }

    /* ---- AI states ---- */
    _patrol(dist, dy) {
        this.vx = this.speed * 0.4 * this.facing;
        if (this.x <= this.patrolL)      { this.facing = 1; this.vx = this.speed * 0.4; }
        else if (this.x + this.w >= this.patrolR) { this.facing = -1; this.vx = -this.speed * 0.4; }

        if (dist < this.aggroRange && dy < 120) this._set(ES.CHASE);
    }

    _idle(dist, dy) {
        this.vx = 0;
        if (this.stateTimer > 40) this._set(ES.PATROL);
        if (dist < this.aggroRange && dy < 120) this._set(ES.CHASE);
    }

    _chase(px, dist, dy, player) {
        if (player.state === PS.DEATH) { this._set(ES.IDLE); return; }
        const dir = px > this.x + this.w / 2 ? 1 : -1;
        this.facing = dir;
        this.vx = this.speed * dir;

        // In range → attack
        if (dist < this.atkRange && dy < 80) {
            this.vx = 0;
            this._set(ES.ATK_WINDUP);
        }
        // Lost interest
        if (dist > this.aggroRange * 1.8) this._set(ES.PATROL);
    }

    _atkWindup() {
        this.vx = 0;
        this.canParry = true;    // CAN BE PARRIED during wind-up!
        const windupDur = this.type === 'beast' ? 18 : (this.type === 'churchServant' ? 30 : 22);
        if (this.stateTimer >= windupDur) this._set(ES.ATK_ACTIVE);
    }

    _atkActive() {
        this.canParry = false;
        const dur     = this.type === 'beast' ? 8 : (this.type === 'churchServant' ? 12 : 10);
        const reach   = this.type === 'churchServant' ? 60 : (this.type === 'beast' ? 55 : 45);
        const hx = this.facing === 1 ? this.x + this.w : this.x - reach;
        this.atkBox = { x: hx, y: this.y + 5, w: reach, h: this.h - 10 };

        // Lunge
        if (this.stateTimer < 4) this.vx = this.facing * 3;

        if (this.stateTimer >= dur) { this.atkBox = null; this._set(ES.ATK_RECOVER); }
    }

    _atkRecover() {
        this.vx = 0;
        const dur = this.type === 'churchServant' ? 35 : 25;
        if (this.stateTimer >= dur) this._set(ES.CHASE);
    }

    _stagger() {
        this.vx *= 0.85;
        if (this.stateTimer >= 15) this._set(ES.CHASE);
    }

    _parried() {
        this.vx = 0;
        this.parriedTimer = this.stateTimer;
        if (this.stateTimer >= 90) this._set(ES.CHASE); // recover from parry if not visceraled
    }

    /* ---- damage ---- */
    takeDamage(amount) {
        if (!this.alive) return;
        this.hp -= amount;
        if (this.hp <= 0) {
            this.hp = 0; this.alive = false;
            this._set(ES.DEATH);
            G.audio.enemyDeath();
            G.particles.deathSmoke(this.x + this.w / 2, this.y + this.h / 2);
            return true; // died
        }
        if (this.state !== ES.PARRIED) this._set(ES.STAGGER);
        G.audio.hit();
        return false;
    }

    parry() {
        this._set(ES.PARRIED);
        this.vx = 0;
        G.audio.parry();
        G.particles.sparks(this.x + this.w / 2, this.y + 10);
        G.renderer.addShake(4, 6);
    }

    /* ---- render ---- */
    render(ctx, camX, camY) {
        if (!this.alive && this.stateTimer > 45) return;

        const px = Math.round(this.x - camX);
        const py = Math.round(this.y - camY);

        ctx.save();
        if (this.facing === -1) {
            ctx.translate(px + this.w, py); ctx.scale(-1, 1);
        } else {
            ctx.translate(px, py);
        }

        if (!this.alive) ctx.globalAlpha = Math.max(0, 1 - this.stateTimer / 45);

        // Stagger / parry flash
        if (this.state === ES.STAGGER || this.state === ES.PARRIED) {
            ctx.globalAlpha *= (Math.floor(this.stateTimer / 3) % 2 ? 1 : 0.5);
        }

        this._drawBody(ctx);
        ctx.restore();
    }

    _drawBody(ctx) {
        switch (this.type) {
            case 'huntsman':      this._drawHuntsman(ctx); break;
            case 'beast':         this._drawBeast(ctx); break;
            case 'rat':           this._drawRat(ctx); break;
            case 'churchServant': this._drawChurchServant(ctx); break;
        }
    }

    _drawHuntsman(ctx) {
        const w = this.w, h = this.h;
        // Head
        ctx.fillStyle = '#998877';
        ctx.fillRect(6, 0, 12, 10);
        // Eyes (angry)
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(9, 3, 3, 2);
        ctx.fillRect(15, 3, 3, 2);
        // Body (ragged)
        ctx.fillStyle = '#4a3a2a';
        ctx.fillRect(3, 10, w - 6, 20);
        // Tattered edges
        ctx.fillStyle = '#3a2a1a';
        ctx.fillRect(3, 28, 4, 4);
        ctx.fillRect(w - 7, 26, 4, 6);
        // Legs
        ctx.fillStyle = '#332211';
        ctx.fillRect(6, 30, 5, 14);
        ctx.fillRect(13, 30, 5, 14);
        // Boots
        ctx.fillStyle = '#222';
        ctx.fillRect(5, h - 4, 7, 4);
        ctx.fillRect(12, h - 4, 7, 4);
        // Torch (weapon)
        ctx.fillStyle = '#5a4020';
        ctx.fillRect(w, 8, 4, 20);
        // Flame
        if (this.alive) {
            const flicker = Math.sin(this.stateTimer * 0.5) * 2;
            ctx.fillStyle = '#ff6600';
            ctx.fillRect(w - 1, 2 + flicker, 8, 8);
            ctx.fillStyle = '#ffaa00';
            ctx.fillRect(w, 4 + flicker, 6, 5);
            ctx.fillStyle = '#ffdd44';
            ctx.fillRect(w + 1, 5 + flicker, 4, 3);
        }

        // Attack swing
        if (this.state === ES.ATK_ACTIVE) {
            ctx.fillStyle = '#5a4020';
            const swing = -0.5 + (this.stateTimer / 8) * 1.5;
            ctx.save(); ctx.translate(w, 14); ctx.rotate(swing);
            ctx.fillRect(0, -2, 30, 4);
            ctx.restore();
        }
    }

    _drawBeast(ctx) {
        const w = this.w, h = this.h;
        // Body (hunched quadruped)
        ctx.fillStyle = '#2a2020';
        ctx.fillRect(4, 8, w - 8, h - 16);
        // Head
        ctx.fillStyle = '#3a2828';
        ctx.fillRect(w - 6, 2, 10, 12);
        // Jaws
        ctx.fillStyle = '#1a1010';
        ctx.fillRect(w, 8, 6, 6);
        // Eyes
        ctx.fillStyle = '#ff2222';
        ctx.fillRect(w - 2, 4, 3, 2);
        // Legs (front)
        ctx.fillStyle = '#221818';
        const legA = Math.sin(this.stateTimer * 0.4) * 3;
        ctx.fillRect(w - 10, h - 10 + legA, 5, 10 - legA);
        ctx.fillRect(w - 4,  h - 10 - legA, 5, 10 + legA);
        // Legs (back)
        ctx.fillRect(6, h - 10 - legA, 5, 10 + legA);
        ctx.fillRect(12, h - 10 + legA, 5, 10 - legA);
        // Fur spikes
        ctx.fillStyle = '#3a2828';
        for (let i = 8; i < w - 8; i += 6) ctx.fillRect(i, 5, 3, 5);
        // Claw attack
        if (this.state === ES.ATK_ACTIVE) {
            ctx.fillStyle = '#ff4444';
            ctx.fillRect(w + 2, 6, 15, 3);
            ctx.fillRect(w + 2, 11, 15, 3);
        }
    }

    _drawRat(ctx) {
        const w = this.w, h = this.h;
        ctx.fillStyle = '#554433';
        ctx.fillRect(2, 4, w - 4, h - 6);
        // Head
        ctx.fillStyle = '#665544';
        ctx.fillRect(w - 4, 2, 8, 8);
        // Eye
        ctx.fillStyle = '#ff6666';
        ctx.fillRect(w, 3, 2, 2);
        // Tail
        ctx.fillStyle = '#887766';
        ctx.fillRect(-4, h / 2 - 1, 6, 2);
        // Legs
        ctx.fillStyle = '#443322';
        ctx.fillRect(4, h - 3, 3, 3);
        ctx.fillRect(w - 6, h - 3, 3, 3);
    }

    _drawChurchServant(ctx) {
        const w = this.w, h = this.h;
        // Hood
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(4, 0, w - 8, 14);
        ctx.fillRect(2, 4, w - 4, 8);
        // Face (shadowed)
        ctx.fillStyle = '#aa9977';
        ctx.fillRect(8, 6, 10, 6);
        // Eyes (pale)
        ctx.fillStyle = '#ccccff';
        ctx.fillRect(10, 7, 2, 3);
        ctx.fillRect(16, 7, 2, 3);
        // Robe
        ctx.fillStyle = '#12122a';
        ctx.fillRect(2, 14, w - 4, 30);
        // Robe detail
        ctx.fillStyle = '#1a1a35';
        ctx.fillRect(w / 2 - 1, 14, 2, 30);
        ctx.fillRect(4, 24, w - 8, 2);
        // Feet
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(6, h - 4, 6, 4);
        ctx.fillRect(w - 12, h - 4, 6, 4);
        // Staff
        ctx.fillStyle = '#666';
        ctx.fillRect(w + 2, 0, 3, h);
        // Staff head
        ctx.fillStyle = '#8888cc';
        ctx.fillRect(w, -4, 7, 6);
        // Attack
        if (this.state === ES.ATK_ACTIVE) {
            ctx.save(); ctx.translate(w + 3, h / 2);
            const swing = -0.6 + (this.stateTimer / 10) * 1.8;
            ctx.rotate(swing);
            ctx.fillStyle = '#666';
            ctx.fillRect(0, -2, 35, 3);
            ctx.fillStyle = '#8888cc';
            ctx.fillRect(30, -4, 7, 7);
            ctx.restore();
        }
    }

    get bounds() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }

    reset() {
        this.x = this.spawnX; this.y = this.spawnY;
        this.hp = this.maxHp; this.alive = true;
        this.vx = 0; this.vy = 0;
        this._set(ES.PATROL);
    }
}

Enemy.STATS = {
    huntsman: {
        hp: 40, speed: 1.8, dmg: 15, echoes: 80,
        w: 28, h: 48, aggro: 200, atkRange: 50
    },
    beast: {
        hp: 55, speed: 2.8, dmg: 20, echoes: 120,
        w: 40, h: 32, aggro: 250, atkRange: 55
    },
    rat: {
        hp: 15, speed: 2.2, dmg: 8, echoes: 30,
        w: 24, h: 16, aggro: 150, atkRange: 30
    },
    churchServant: {
        hp: 60, speed: 1.5, dmg: 22, echoes: 150,
        w: 28, h: 54, aggro: 220, atkRange: 60
    }
};
