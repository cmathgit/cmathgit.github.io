'use strict';

/* ================================================================
   Player — The Hunter
   Full state machine with Bloodborne combat:
   Trick weapon (Saw Cleaver), rally, parry → visceral,
   quickstep dodge with i-frames, stamina, blood vials.
   ================================================================ */

const PS = Object.freeze({
    IDLE: 'idle', RUN: 'run', JUMP: 'jump', FALL: 'fall',
    DODGE: 'dodge',
    ATK1: 'atk1', ATK2: 'atk2', ATK3: 'atk3',
    TRANSFORM: 'transform', TRANSFORM_ATK: 'transformAtk',
    GUN: 'gun', VISCERAL: 'visceral',
    HEAL: 'heal', STAGGER: 'stagger', DEATH: 'death'
});

class Player {
    constructor(x, y) {
        // Position / physics  (world-pixel coords, top-left of AABB)
        this.x = x; this.y = y;
        this.w = 30; this.h = 60;          // ~10×20 native px  ×  3 scale
        this.vx = 0; this.vy = 0;
        this.facing   = 1;                  // 1 right, -1 left
        this.onGround = false;

        // Stats
        this.maxHp = 100; this.hp = 100;
        this.maxStamina = 100; this.stamina = 100;
        this.bloodVials = 5; this.maxBloodVials = 5;

        // Rally
        this.rallyAmt   = 0;
        this.rallyTimer = 0;
        this.RALLY_WIN  = 180;              // ~3 s at 60 fps
        this.RALLY_RATE = 0.7;

        // Weapon
        this.trickForm = false;             // false = normal saw cleaver

        // State machine
        this.state      = PS.IDLE;
        this.stateTimer = 0;
        this.comboCount = 0;

        // Invincibility
        this.invincible = false;
        this.invTimer   = 0;

        // Attack hitbox (set during active frames, null otherwise)
        this.atkBox     = null;
        this.atkDmg     = 0;
        this.isGunShot  = false;
        this.isVisceral = false;
        this.hitSet     = new Set();        // enemy IDs hit this swing

        // Animation
        this.animFrame  = 0;
        this.animTimer  = 0;

        // Movement constants
        this.SPEED        = 3.8;
        this.JUMP_FORCE   = -10.5;
        this.DODGE_SPEED  = 8.5;
        this.DODGE_DUR    = 14;
        this.STAM_REGEN   = 0.45;
        this.STAM_DELAY   = 28;
        this.stamDelay    = 0;

        // Spawn
        this.spawnX = x; this.spawnY = y;
        this.echoes = 0;
    }

    /* ---- state transition ---- */
    _set(s) {
        if (this.state === PS.DEATH) return;
        this.state = s; this.stateTimer = 0;
        this.hitSet.clear(); this.atkBox = null;
        this.isGunShot = false; this.isVisceral = false;
    }

    /* ================================================================
       UPDATE  —  called once per frame from main loop
       ================================================================ */
    update(input, level) {
        this.stateTimer++;
        this.animTimer++;

        // Rally decay
        if (this.rallyTimer > 0) {
            this.rallyTimer--;
            this.rallyAmt *= 0.997;
            if (this.rallyTimer <= 0 || this.rallyAmt < 0.5) {
                this.rallyAmt = 0; this.rallyTimer = 0;
            }
        }

        // Invincibility
        if (this.invTimer > 0) { this.invTimer--; this.invincible = this.invTimer > 0; }

        // Stamina regen
        if (this.stamDelay > 0) this.stamDelay--;
        else this.stamina = Math.min(this.maxStamina, this.stamina + this.STAM_REGEN);

        // State dispatch
        switch (this.state) {
            case PS.IDLE: case PS.RUN:
                this._moveGround(input);
                this._combatGround(input);
                break;
            case PS.JUMP: case PS.FALL:
                this._moveAir(input);
                this._combatAir(input);
                if (this.onGround) this._set(PS.IDLE);
                break;
            case PS.DODGE:      this._doDodge(); break;
            case PS.ATK1: case PS.ATK2: case PS.ATK3:
                this._doAttack(input); break;
            case PS.TRANSFORM:  this._doTransform(); break;
            case PS.TRANSFORM_ATK: this._doTransformAtk(); break;
            case PS.GUN:        this._doGun(); break;
            case PS.VISCERAL:   this._doVisceral(); break;
            case PS.HEAL:       this._doHeal(); break;
            case PS.STAGGER:    this._doStagger(); break;
            case PS.DEATH:      break;
        }

        // Gravity
        if (!this.onGround) {
            this.vy += G.GRAVITY;
            if (this.vy > 13) this.vy = 13;
        }

        // Ground friction
        if (this.onGround && this.state !== PS.DODGE &&
            this.state !== PS.ATK1 && this.state !== PS.ATK2 && this.state !== PS.ATK3) {
            this.vx *= 0.72;
        }

        // Collision
        level.resolveCollisions(this);

        // Became airborne?
        if (!this.onGround && this.vy > 1 &&
            (this.state === PS.IDLE || this.state === PS.RUN))
            this._set(PS.FALL);
    }

    /* ---- ground movement ---- */
    _moveGround(inp) {
        if (inp.left)       { this.vx = -this.SPEED; this.facing = -1; if (this.state !== PS.RUN) this._set(PS.RUN); }
        else if (inp.right) { this.vx =  this.SPEED; this.facing =  1; if (this.state !== PS.RUN) this._set(PS.RUN); }
        else if (this.state === PS.RUN) this._set(PS.IDLE);

        if (inp.jump && this.onGround) {
            this.vy = this.JUMP_FORCE; this.onGround = false; this._set(PS.JUMP);
        }
    }

    /* ---- air movement ---- */
    _moveAir(inp) {
        if (inp.left)       { this.vx = -this.SPEED * 0.75; this.facing = -1; }
        else if (inp.right) { this.vx =  this.SPEED * 0.75; this.facing =  1; }
    }

    /* ---- combat inputs (ground) ---- */
    _combatGround(inp) {
        if      (inp.dodge && this.stamina >= 15) this._startDodge(inp);
        else if (inp.attack && this.stamina >= 10) this._startAtk(1);
        else if (inp.gun && this.stamina >= 15)   this._startGun();
        else if (inp.transform)                   this._startTransform(false);
        else if (inp.heal && this.bloodVials > 0) this._startHeal();
    }

    /* ---- combat inputs (air) ---- */
    _combatAir(inp) {
        if      (inp.dodge && this.stamina >= 15) this._startDodge(inp);
        else if (inp.attack && this.stamina >= 10) this._startAtk(1);
        else if (inp.gun && this.stamina >= 15)   this._startGun();
    }

    /* ================================================================
       DODGE — quick dash with i-frames
       ================================================================ */
    _startDodge(inp) {
        this._set(PS.DODGE);
        this.stamina -= 15; this.stamDelay = this.STAM_DELAY;
        this.invincible = true; this.invTimer = 11;
        let dir = this.facing;
        if (inp.left) dir = -1; else if (inp.right) dir = 1;
        this.vx = this.DODGE_SPEED * dir;
        this.vy = -1.5;
        G.audio.dodge();
        G.particles.dust(this.x + this.w / 2, this.y + this.h, -dir);
    }

    _doDodge() {
        if (this.stateTimer >= this.DODGE_DUR) {
            this.vx *= 0.25;
            this._set(this.onGround ? PS.IDLE : PS.FALL);
        }
    }

    /* ================================================================
       ATTACK — Saw Cleaver combo (normal: 3-hit, trick: 2-hit)
       ================================================================ */
    _startAtk(combo) {
        const st = [PS.ATK1, PS.ATK2, PS.ATK3];
        const max = this.trickForm ? 2 : 3;
        combo = Math.min(combo, max);
        this._set(st[combo - 1]);
        this.comboCount = combo;
        this.stamina -= this.trickForm ? 15 : 10;
        this.stamDelay = this.STAM_DELAY;
        this.vx = this.facing * (this.trickForm ? 1.5 : 2.5);
        if (this.trickForm) G.audio.heavySlash(); else G.audio.slash();
    }

    _doAttack(inp) {
        const dur      = this.trickForm ? 30 : 22;
        const hitStart = this.trickForm ? 7  : 4;
        const hitEnd   = this.trickForm ? 16 : 11;

        // Active hitbox frames
        if (this.stateTimer >= hitStart && this.stateTimer <= hitEnd) {
            const reach = this.trickForm ? 72 : 48;
            const hx = this.facing === 1 ? this.x + this.w : this.x - reach;
            this.atkBox = { x: hx, y: this.y + 5, w: reach, h: this.h - 10 };
            this.atkDmg = this.trickForm ? 25 : 15;
            // Combo scaling
            if (this.comboCount === 2) this.atkDmg += 3;
            if (this.comboCount === 3) this.atkDmg += 6;
        } else {
            this.atkBox = null;
        }

        // Combo window — can chain next attack or transform attack
        if (this.stateTimer >= dur - 10 && this.stateTimer < dur) {
            const max = this.trickForm ? 2 : 3;
            if (inp.attack && this.stamina >= 10 && this.comboCount < max) {
                this._startAtk(this.comboCount + 1); return;
            }
            if (inp.transform) { this._startTransform(true); return; }
        }

        if (this.stateTimer >= dur) {
            this.comboCount = 0;
            this._set(this.onGround ? PS.IDLE : PS.FALL);
        }
    }

    /* ================================================================
       TRANSFORM (Trick Weapon switch + optional transform attack)
       ================================================================ */
    _startTransform(fromCombo) {
        this._set(fromCombo ? PS.TRANSFORM_ATK : PS.TRANSFORM);
        this.trickForm = !this.trickForm;
        G.audio.transformWeapon();
    }

    _doTransform() {
        if (this.stateTimer >= 22) this._set(PS.IDLE);
    }

    _doTransformAtk() {
        if (this.stateTimer >= 6 && this.stateTimer <= 14) {
            const reach = 65;
            const hx = this.facing === 1 ? this.x + this.w : this.x - reach;
            this.atkBox = { x: hx, y: this.y, w: reach, h: this.h };
            this.atkDmg = 32;
        } else { this.atkBox = null; }
        if (this.stateTimer >= 28) { this.comboCount = 0; this._set(PS.IDLE); }
    }

    /* ================================================================
       GUN (Hunter Pistol) — fires instantly, parry check done in main
       ================================================================ */
    _startGun() {
        this._set(PS.GUN);
        this.stamina -= 15; this.stamDelay = this.STAM_DELAY;
        this.vx = 0;
        G.audio.gunshot();
    }

    _doGun() {
        if (this.stateTimer === 4) {
            const reach = 220;
            const hx = this.facing === 1 ? this.x + this.w : this.x - reach;
            this.atkBox = { x: hx, y: this.y + this.h / 2 - 6, w: reach, h: 12 };
            this.atkDmg = 5;
            this.isGunShot = true;
        } else {
            this.atkBox = null; this.isGunShot = false;
        }
        if (this.stateTimer >= 28) this._set(PS.IDLE);
    }

    /* ================================================================
       VISCERAL ATTACK — triggered on parried enemy
       ================================================================ */
    startVisceral(target) {
        this._set(PS.VISCERAL);
        this.invincible = true; this.invTimer = 45;
        // Snap to target
        this.x = target.x + target.w / 2 - this.w / 2 - this.facing * 20;
        this.vx = 0;
        G.audio.visceral();
        G.renderer.addShake(10, 18);
        G.particles.visceralBurst(target.x + target.w / 2, target.y + target.h / 2);
    }

    _doVisceral() {
        if (this.stateTimer === 10) {
            const reach = 55;
            const hx = this.facing === 1 ? this.x + this.w : this.x - reach;
            this.atkBox = { x: hx, y: this.y, w: reach, h: this.h };
            this.atkDmg = 80;
            this.isVisceral = true;
        } else {
            this.atkBox = null; this.isVisceral = false;
        }
        if (this.stateTimer >= 38) {
            this.hp = Math.min(this.maxHp, this.hp + 15);
            this._set(PS.IDLE);
        }
    }

    /* ================================================================
       HEAL — blood vial injection
       ================================================================ */
    _startHeal() {
        this._set(PS.HEAL); this.vx = 0; G.audio.heal();
    }

    _doHeal() {
        if (this.stateTimer === 22) {
            this.bloodVials--;
            this.hp = Math.min(this.maxHp, this.hp + 40);
            G.particles.healEffect(this.x + this.w / 2, this.y + this.h / 2);
        }
        if (this.stateTimer >= 38) this._set(PS.IDLE);
    }

    /* ---- stagger from enemy hit ---- */
    _doStagger() {
        this.vx *= 0.85;
        if (this.stateTimer >= 18) this._set(this.onGround ? PS.IDLE : PS.FALL);
    }

    /* ================================================================
       TAKE DAMAGE — rally window starts here
       ================================================================ */
    takeDamage(amount, fromX) {
        if (this.invincible || this.state === PS.DEATH) return;

        // Rally window
        this.rallyAmt   = Math.min(amount * this.RALLY_RATE, this.hp);
        this.rallyTimer = this.RALLY_WIN;

        this.hp -= amount;
        this.facing = fromX > this.x + this.w / 2 ? 1 : -1;

        G.audio.playerHurt();
        G.particles.blood(this.x + this.w / 2, this.y + this.h / 3, fromX > this.x ? -1 : 1);
        G.renderer.addShake(5, 8);

        if (this.hp <= 0) { this.hp = 0; this.die(); }
        else {
            // Cancel heal if interrupted
            this._set(PS.STAGGER);
            this.vx = (fromX > this.x + this.w / 2 ? -3.5 : 3.5);
            this.invincible = true; this.invTimer = 30;
        }
    }

    /* ---- rally: call when player hits an enemy ---- */
    rally(dealt) {
        if (this.rallyTimer > 0 && this.rallyAmt > 0) {
            const rec = Math.min(dealt * 0.45, this.rallyAmt);
            this.hp = Math.min(this.maxHp, this.hp + rec);
            this.rallyAmt -= rec;
            if (this.rallyAmt < 0.5) { this.rallyAmt = 0; this.rallyTimer = 0; }
        }
    }

    /* ---- death ---- */
    die() {
        this._set(PS.DEATH);
        this.vx = 0; this.vy = 0;
    }

    /* ---- respawn at last lamp ---- */
    respawn(lampX, lampY) {
        this.x = lampX; this.y = lampY;
        this.spawnX = lampX; this.spawnY = lampY;
        this.hp = this.maxHp; this.stamina = this.maxStamina;
        this.bloodVials = this.maxBloodVials;
        this.rallyAmt = 0; this.rallyTimer = 0;
        this.invincible = false; this.invTimer = 0;
        this.trickForm = false;
        this._set(PS.IDLE);
        this.vx = 0; this.vy = 0; this.facing = 1;
    }

    /* ================================================================
       RENDER — procedural pixel-art Hunter
       ================================================================ */
    render(ctx, camX, camY) {
        if (this.state === PS.DEATH && this.stateTimer > 60) return;

        // Invincibility flicker
        if (this.invincible && this.state !== PS.DODGE && this.state !== PS.VISCERAL) {
            if (Math.floor(this.invTimer / 2) % 2 === 0) return;
        }

        const px = Math.round(this.x - camX);
        const py = Math.round(this.y - camY);

        ctx.save();
        if (this.facing === -1) {
            ctx.translate(px + this.w, py);
            ctx.scale(-1, 1);
        } else {
            ctx.translate(px, py);
        }

        // Death fade
        if (this.state === PS.DEATH) ctx.globalAlpha = Math.max(0, 1 - this.stateTimer / 60);

        // Dodge ghost trail
        if (this.state === PS.DODGE) {
            ctx.globalAlpha = 0.3;
            this._drawBody(ctx);
            ctx.globalAlpha = 1;
        } else {
            this._drawBody(ctx);
        }

        ctx.restore();
    }

    _drawBody(ctx) {
        const w = this.w, h = this.h;

        // ---- HAT (wide-brimmed hunter hat) ----
        ctx.fillStyle = '#1a1420';
        ctx.fillRect(-4, 0, w + 8, 6);
        ctx.fillRect(4, -5, w - 8, 7);

        // ---- HEAD ----
        ctx.fillStyle = '#c9a882';
        ctx.fillRect(8, 6, 14, 10);
        // Eyes
        ctx.fillStyle = '#ddd';
        ctx.fillRect(11, 9, 3, 2);
        ctx.fillRect(17, 9, 3, 2);
        ctx.fillStyle = '#222';
        ctx.fillRect(12, 9, 2, 2);
        ctx.fillRect(18, 9, 2, 2);

        // ---- COAT ----
        ctx.fillStyle = '#2a1a0e';
        ctx.fillRect(3, 16, w - 6, 28);
        // Coat seam
        ctx.fillStyle = '#1e140a';
        ctx.fillRect(w / 2 - 1, 16, 2, 28);
        // Collar
        ctx.fillStyle = '#3a2a1e';
        ctx.fillRect(5, 16, w - 10, 4);
        // Belt
        ctx.fillStyle = '#5a4a30';
        ctx.fillRect(5, 30, w - 10, 3);
        ctx.fillStyle = '#aa9944';
        ctx.fillRect(w / 2 - 2, 30, 4, 3); // buckle

        // ---- LEGS (animated) ----
        const legA = this.state === PS.RUN ? Math.sin(this.animTimer * 0.3) * 5 : 0;
        ctx.fillStyle = '#1e1408';
        ctx.fillRect(8,  44, 6, 12 + legA);
        ctx.fillRect(16, 44, 6, 12 - legA);
        // Boots
        ctx.fillStyle = '#2a2018';
        ctx.fillRect(7,  h - 5 + (legA > 0 ? legA : 0), 8, 5);
        ctx.fillRect(15, h - 5 - (legA > 0 ? 0 : legA), 8, 5);

        // ---- WEAPON ----
        this._drawWeapon(ctx);

        // ---- GUN (left hand) ----
        ctx.fillStyle = '#555';
        ctx.fillRect(-2, 24, 8, 4);
        ctx.fillRect(-2, 28, 3, 5);
        // Muzzle flash
        if (this.state === PS.GUN && this.stateTimer >= 3 && this.stateTimer <= 6) {
            ctx.fillStyle = '#ffcc00';
            ctx.fillRect(-12, 22, 10, 8);
            ctx.fillStyle = '#fff';
            ctx.fillRect(-9, 24, 5, 4);
        }
    }

    _drawWeapon(ctx) {
        const w = this.w;
        const attacking = this.state === PS.ATK1 || this.state === PS.ATK2 ||
                          this.state === PS.ATK3 || this.state === PS.TRANSFORM_ATK ||
                          this.state === PS.VISCERAL;

        if (this.state === PS.VISCERAL) {
            // Visceral thrust
            ctx.fillStyle = '#999';
            const ext = Math.min(this.stateTimer * 3, 30);
            ctx.fillRect(w, 20, ext, 5);
            ctx.fillStyle = '#cc0000';
            ctx.fillRect(w + ext - 6, 18, 8, 9);
            return;
        }

        if (!this.trickForm) {
            // ---- Saw Cleaver (normal — short) ----
            ctx.fillStyle = '#888';
            if (attacking) {
                const swing = -0.8 + (this.stateTimer / 18) * 2.2;
                ctx.save(); ctx.translate(w, 24); ctx.rotate(swing);
                ctx.fillRect(0, -3, 28, 5);
                ctx.fillStyle = '#aaa';
                for (let i = 6; i < 28; i += 5) ctx.fillRect(i, -5, 2, 2);
                ctx.restore();
            } else {
                ctx.fillRect(w - 2, 20, 22, 4);
                ctx.fillStyle = '#aaa';
                for (let i = 6; i < 22; i += 5) ctx.fillRect(w - 2 + i, 18, 2, 2);
            }
        } else {
            // ---- Saw Cleaver (trick — extended) ----
            ctx.fillStyle = '#777';
            if (attacking) {
                const swing = -1.0 + (this.stateTimer / 24) * 2.5;
                ctx.save(); ctx.translate(w, 22); ctx.rotate(swing);
                ctx.fillRect(0, -3, 42, 5);
                ctx.fillStyle = '#999';
                for (let i = 8; i < 42; i += 5) { ctx.fillRect(i, -6, 2, 3); ctx.fillRect(i, 4, 2, 3); }
                ctx.restore();
            } else {
                ctx.fillRect(w - 2, 16, 38, 4);
                ctx.fillStyle = '#999';
                for (let i = 8; i < 38; i += 5) { ctx.fillRect(w - 2 + i, 14, 2, 2); ctx.fillRect(w - 2 + i, 20, 2, 2); }
            }
        }
    }

    /** Bounding box in world coords */
    get bounds() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
}
