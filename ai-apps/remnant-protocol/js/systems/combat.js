import * as THREE from 'three';

export class Combat {
    constructor(game) {
        this.game = game;
        this.effects = [];
    }

    inArc(source, target, range, minimumDot) {
        const offset = target.position.clone().sub(source.position);
        offset.y = 0;

        if (offset.length() > range) return false;
        if (offset.lengthSq() < 0.001) return true;

        return source.facing.dot(offset.normalize()) >= minimumDot;
    }

    clearPath(source, target) {
        const from = source.position.clone().add(new THREE.Vector3(0, 1, 0));
        const to = target.position.clone().add(new THREE.Vector3(0, 1, 0));
        return this.game.physics.visible(from, to);
    }

    playerSwing(player, heavy) {
        const game = this.game;

        for (const enemy of game.enemies) {
            if (!enemy.alive || player.hit.has(enemy)) continue;
            if (!this.inArc(player, enemy, heavy ? 3.3 : 2.9, -0.05)) continue;
            if (!this.clearPath(player, enemy)) continue;

            player.hit.add(enemy);

            if (enemy.state === 'transition') continue;

            if (enemy.broken) {
                if (enemy.boss) {
                    enemy.hp -= 420 * player.progression.damageScale;
                    enemy.poise = enemy.maxPoise;
                    enemy.state = 'idle';
                    enemy.cooldown = 1.2;
                    enemy.cancelExtras?.();
                    game.toast('RIPOSTE');
                } else {
                    enemy.hp = 0;
                }

                game.sound.playParry();
            } else {
                let damage = (heavy ? 90 + player.charge * 55 : 62 + player.combo * 12)
                    * player.progression.damageScale;

                const guarded = enemy.kind === 'enforcer' &&
                    enemy.state === 'idle' &&
                    this.inArc(enemy, player, 4, 0.2);

                if (guarded && !heavy) {
                    damage *= 0.15;
                    game.sound.playBlock();
                } else {
                    game.sound.playHit();
                }

                enemy.hp -= damage;
                enemy.poise -= heavy ? 100 : guarded ? 8 : 30;

                if (enemy.hp > 0 && enemy.poise <= 0) {
                    enemy.stanceBreak(game);
                }
            }

            this.burst(enemy.position, heavy ? 0xffffff : 0xffd700);

            if (enemy.hp <= 0) this.defeat(enemy, false);
        }
    }

    enemySwing(enemy, move) {
        const player = this.game.player;

        if (!player.alive || move.hit.has(player)) return;
        if (!this.inArc(enemy, player, move.range, move.arc)) return;
        if (!this.clearPath(enemy, player)) return;

        // One contact per swing, including a successfully dodged contact.
        move.hit.add(player);
        this.damagePlayer(enemy, move);
    }

    damagePlayer(source, move) {
        const game = this.game;
        const player = game.player;

        if (!player.alive || player.invulnerable) return;

        const frontal = this.inArc(player, source, Infinity, 0.15);

        if (!move.unblockable &&
            !source.phantom &&
            frontal &&
            player.parrying) {
            source.stanceBreak(game);
            game.sound.playParry();
            game.follow.zoomTime = 0.15;
            this.burst(player.position, 0xffe7a0, 2);
            return;
        }

        let damage = move.damage * game.difficulty;
        const alreadyGuardBroken = player.state === 'guardBreak';

        if (!move.unblockable && frontal && player.state === 'block') {
            const staminaCost = damage * 0.3;

            player.regenDelay = 0.9;

            if (player.stamina > staminaCost) {
                player.stamina -= staminaCost;
                damage *= move.elemental ? 0.25 : 0;
                game.sound.playBlock();
                this.burst(player.position, 0x00f2fe);
            } else {
                player.stamina = 0;
                player.stun(true);
                game.toast('GUARD BROKEN');
                damage *= move.elemental ? 0.5 : 0.2;
            }
        }

        const armor = Math.min(
            0.65,
            player.inventory.armor + player.progression.armor
        );

        if (!move.elemental) damage *= 1 - armor;
        if (alreadyGuardBroken) damage *= 1.5;

        if (damage > 0) {
            player.hp = Math.max(0, player.hp - damage);
            player.poiseDamage += move.poise || 40;
            player.poiseTimer = 2.5;
            game.sound.playHit();
            this.burst(player.position, 0xff2a5f);

            const hyperArmor = (
                player.state === 'light' || player.state === 'heavy'
            ) && player.poiseDamage < (
                20 + player.inventory.poise + player.progression.poise
            );

            if (player.alive && !hyperArmor && player.state !== 'guardBreak') {
                player.stun();
            }
        }

        if (!player.alive) game.onDeath();
    }

    deliver(player) {
        const enemy = this.game.enemies.find(candidate =>
            candidate.alive &&
            !candidate.boss &&
            candidate.broken &&
            this.inArc(player, candidate, 3, 0) &&
            this.clearPath(player, candidate)
        );

        if (!enemy) return;

        // A short committed gesture follows the close-range interaction.
        player.setState('deliver', 48);
        enemy.hp = 0;
        this.defeat(enemy, true);
    }

    defeat(enemy, converted) {
        if (enemy.removed) return;

        enemy.removed = true;
        enemy.hp = 0;
        enemy.rig.root.visible = false;
        enemy.cancelExtras?.();

        const game = this.game;
        const progression = game.progression;

        if (enemy.boss) {
            progression.grace += 1800;
            game.victory = true;
            game.world.eclipse(false);
            game.toast('ARCHON VANQUISHED', 6);
            game.sound.playPrayer();
        } else if (converted) {
            progression.grace += 120;
            progression.converts++;
            game.player.flasks = Math.min(3, game.player.flasks + 1);
            game.toast('DELIVERANCE ACHIEVED');
            game.sound.playPrayer();
        } else {
            progression.grace += 50;
            progression.scrap += 2;
        }

        this.burst(enemy.position, converted ? 0xfff8e7 : 0xffd700, 2);

        if (!enemy.boss && !converted) {
            game.awardEnemyArmor(enemy);
        }
    }

    burst(position, color, scale = 1) {
        const mesh = new THREE.Mesh(
            new THREE.RingGeometry(0.25, 0.34, 32),
            new THREE.MeshBasicMaterial({
                color,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 1,
                depthWrite: false
            })
        );

        mesh.rotation.x = -Math.PI / 2;
        mesh.position.copy(position);
        mesh.position.y += 0.08;
        this.game.scene.add(mesh);
        this.effects.push({ mesh, age: 0, scale });
    }

    update(dt) {
        for (let i = this.effects.length - 1; i >= 0; i--) {
            const effect = this.effects[i];
            effect.age += dt;
            effect.mesh.scale.setScalar(1 + effect.age * 12 * effect.scale);
            effect.mesh.material.opacity = Math.max(0, 1 - effect.age / 0.5);

            if (effect.age >= 0.5) {
                this.game.scene.remove(effect.mesh);
                effect.mesh.geometry.dispose();
                effect.mesh.material.dispose();
                this.effects.splice(i, 1);
            }
        }
    }
}