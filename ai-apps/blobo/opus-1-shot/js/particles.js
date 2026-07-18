'use strict';

class ParticleSystem {
    constructor() {
        this.particles = [];
        this.MAX = 600;
    }

    emit(x, y, count, cfg) {
        for (let i = 0; i < count && this.particles.length < this.MAX; i++) {
            const angle = (cfg.angle || 0) + (Math.random() - 0.5) * (cfg.spread || Math.PI * 2);
            const speed = (cfg.speed || 2) + Math.random() * (cfg.speedVar || 2);
            const life  = (cfg.life || 30) + Math.random() * (cfg.lifeVar || 15);
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life, maxLife: life,
                size: (cfg.size || 2) + Math.random() * (cfg.sizeVar || 1),
                color: cfg.colors
                    ? cfg.colors[Math.floor(Math.random() * cfg.colors.length)]
                    : (cfg.color || '#f00'),
                gravity:  cfg.gravity  || 0,
                friction: cfg.friction || 0.98,
                shrink:   cfg.shrink !== undefined ? cfg.shrink : true
            });
        }
    }

    /* ---- preset emitters ---- */

    blood(x, y, dir) {
        this.emit(x, y, 10, {
            angle: dir < 0 ? Math.PI : 0, spread: 1.2,
            speed: 3, speedVar: 4, life: 22, lifeVar: 15,
            size: 3, sizeVar: 2,
            colors: ['#8b0000','#a00000','#cc0000','#660000'],
            gravity: 0.18, friction: 0.96
        });
    }

    visceralBurst(x, y) {
        this.emit(x, y, 35, {
            spread: Math.PI * 2,
            speed: 5, speedVar: 6, life: 35, lifeVar: 20,
            size: 4, sizeVar: 3,
            colors: ['#8b0000','#a00000','#cc0000','#660000','#ff0000'],
            gravity: 0.2, friction: 0.95
        });
    }

    dust(x, y, dir) {
        this.emit(x, y, 6, {
            angle: dir < 0 ? 0 : Math.PI, spread: 0.8,
            speed: 1, speedVar: 2, life: 15, lifeVar: 10,
            size: 3, sizeVar: 2,
            colors: ['#665544','#887766','#554433'],
            gravity: -0.04, friction: 0.94
        });
    }

    sparks(x, y) {
        this.emit(x, y, 14, {
            spread: Math.PI * 2,
            speed: 5, speedVar: 4, life: 10, lifeVar: 8,
            size: 2, sizeVar: 1,
            colors: ['#ffff00','#ffaa00','#ffffff','#ffdd44'],
            gravity: 0.1, friction: 0.95
        });
    }

    healEffect(x, y) {
        this.emit(x, y, 18, {
            angle: -Math.PI / 2, spread: 1.5,
            speed: 1, speedVar: 1.5, life: 28, lifeVar: 12,
            size: 2, sizeVar: 1,
            colors: ['#ff4444','#ff6666','#ff2222','#cc0000'],
            gravity: -0.08, friction: 0.97
        });
    }

    ember(x, y) {
        this.emit(x, y, 1, {
            angle: -Math.PI / 2, spread: 0.5,
            speed: 0.3, speedVar: 0.5, life: 70, lifeVar: 40,
            size: 1.5, sizeVar: 0.5,
            colors: ['#ff6600','#ff4400','#ffaa00'],
            gravity: -0.02, friction: 0.99
        });
    }

    bossEnrage(x, y) {
        this.emit(x, y, 45, {
            spread: Math.PI * 2,
            speed: 3, speedVar: 5, life: 45, lifeVar: 25,
            size: 4, sizeVar: 3,
            colors: ['#8b0000','#cc0000','#ff0000','#ff4400'],
            gravity: -0.03, friction: 0.97
        });
    }

    deathSmoke(x, y) {
        this.emit(x, y, 20, {
            spread: Math.PI * 2,
            speed: 1, speedVar: 2, life: 50, lifeVar: 30,
            size: 5, sizeVar: 4,
            colors: ['#222','#333','#444','#1a1a1a'],
            gravity: -0.04, friction: 0.97, shrink: false
        });
    }

    /* ---- update & render ---- */

    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.vx *= p.friction;
            p.vy *= p.friction;
            p.vy += p.gravity;
            p.x += p.vx;
            p.y += p.vy;
            if (--p.life <= 0) this.particles.splice(i, 1);
        }
    }

    render(ctx, camX, camY) {
        for (const p of this.particles) {
            const alpha = Math.min(1, p.life / (p.maxLife * 0.3));
            const size  = p.shrink ? p.size * (p.life / p.maxLife) : p.size;
            ctx.globalAlpha = alpha;
            ctx.fillStyle   = p.color;
            ctx.fillRect(
                Math.round(p.x - camX - size / 2),
                Math.round(p.y - camY - size / 2),
                Math.ceil(size), Math.ceil(size)
            );
        }
        ctx.globalAlpha = 1;
    }

    clear() { this.particles.length = 0; }
}
