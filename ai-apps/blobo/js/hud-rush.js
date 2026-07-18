'use strict';

/* ================================================================
   HUD — Bloodborne-style UI overlay
   HP bar (with rally), stamina, blood vials, echoes, boss HP
   ================================================================ */

class HUDRush {
    constructor(ctx) {
        this.ctx = ctx;
    }

    render(player, boss) {
        const ctx = this.ctx;

        // ---- Player HP bar ----
        const hpX = 20, hpY = 20, hpW = 240, hpH = 14;
        // Background
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(hpX - 2, hpY - 2, hpW + 4, hpH + 4);
        // Lost HP (dark)
        ctx.fillStyle = '#2a0a0a';
        ctx.fillRect(hpX, hpY, hpW, hpH);
        // Rally segment (orange — shows recoverable HP)
        if (player.rallyAmt > 0) {
            const rallyStart = (player.hp / player.maxHp) * hpW;
            const rallyW = (player.rallyAmt / player.maxHp) * hpW;
            ctx.fillStyle = '#cc8800';
            ctx.fillRect(hpX + rallyStart, hpY, rallyW, hpH);
        }
        // Current HP (red gradient)
        const hpFrac = player.hp / player.maxHp;
        const hpGrad = ctx.createLinearGradient(hpX, hpY, hpX, hpY + hpH);
        hpGrad.addColorStop(0, '#cc2222');
        hpGrad.addColorStop(1, '#881111');
        ctx.fillStyle = hpGrad;
        ctx.fillRect(hpX, hpY, hpW * hpFrac, hpH);
        // Border
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 1;
        ctx.strokeRect(hpX - 1, hpY - 1, hpW + 2, hpH + 2);
        // Label
        ctx.fillStyle = '#ddd';
        ctx.font = '11px "Courier New", monospace';
        ctx.textAlign = 'left';
        ctx.fillText('HP', hpX + 3, hpY + 11);

        // ---- Stamina bar ----
        const stX = 20, stY = 40, stW = 180, stH = 8;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(stX - 1, stY - 1, stW + 2, stH + 2);
        ctx.fillStyle = '#1a2a1a';
        ctx.fillRect(stX, stY, stW, stH);
        const stFrac = player.stamina / player.maxStamina;
        const stGrad = ctx.createLinearGradient(stX, stY, stX, stY + stH);
        stGrad.addColorStop(0, '#44aa44');
        stGrad.addColorStop(1, '#226622');
        ctx.fillStyle = stGrad;
        ctx.fillRect(stX, stY, stW * stFrac, stH);
        ctx.strokeStyle = '#666';
        ctx.strokeRect(stX - 1, stY - 1, stW + 2, stH + 2);

        // ---- Blood Vials ----
        ctx.fillStyle = '#ddd';
        ctx.font = '13px "Courier New", monospace';
        ctx.textAlign = 'left';
        ctx.fillText('Vials:', 20, 65);
        for (let i = 0; i < player.maxBloodVials; i++) {
            if (i < player.bloodVials) {
                ctx.fillStyle = '#cc3333';
                ctx.fillRect(72 + i * 16, 55, 8, 14);
                ctx.fillStyle = '#ff4444';
                ctx.fillRect(73 + i * 16, 57, 6, 10);
            } else {
                ctx.fillStyle = '#333';
                ctx.fillRect(72 + i * 16, 55, 8, 14);
            }
        }

        // ---- Blood Echoes ----
        ctx.fillStyle = '#88bbff';
        ctx.font = '13px "Courier New", monospace';
        ctx.textAlign = 'right';
        ctx.fillText('Echoes: ' + player.echoes, G.W - 20, 30);

        // ---- Weapon indicator ----
        ctx.fillStyle = '#aaa';
        ctx.font = '11px "Courier New", monospace';
        ctx.textAlign = 'right';
        ctx.fillText(player.trickForm ? 'Saw Cleaver [EXTENDED]' : 'Saw Cleaver [NORMAL]', G.W - 20, 50);

        // ---- Boss HP bar ----
        let totalHp = 0, totalMaxHp = 0, isBossActive = false;
        
        if (Array.isArray(boss)) {
            for (const b of boss) {
                if (b.active) isBossActive = true;
                if (b.alive) {
                    totalHp += b.hp;
                    totalMaxHp += b.maxHp;
                }
            }
        } else if (boss && boss.active && boss.alive) {
            isBossActive = true;
            totalHp = boss.hp;
            totalMaxHp = boss.maxHp;
        }

        if (isBossActive && totalMaxHp > 0) {
            const bx = G.W / 2 - 200, by = G.H - 40, bw = 400, bh = 12;
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(bx - 2, by - 2, bw + 4, bh + 4);
            ctx.fillStyle = '#1a0a0a';
            ctx.fillRect(bx, by, bw, bh);
            const bFrac = totalHp / totalMaxHp;
            const bGrad = ctx.createLinearGradient(bx, by, bx, by + bh);
            bGrad.addColorStop(0, '#ff6644');
            bGrad.addColorStop(1, '#cc3322');
            ctx.fillStyle = bGrad;
            ctx.fillRect(bx, by, bw * bFrac, bh);
            ctx.strokeStyle = '#aa8866';
            ctx.lineWidth = 1;
            ctx.strokeRect(bx - 1, by - 1, bw + 2, bh + 2);
            // Boss name
            ctx.fillStyle = '#ddd';
            ctx.font = '12px "Georgia", serif';
            ctx.textAlign = 'center';
            ctx.fillText(Array.isArray(boss) ? 'THE CLERIC BEASTS' : 'CLERIC BEAST', G.W / 2, by - 6);
        }

        // ---- Controls reminder (bottom left) ----
        ctx.fillStyle = 'rgba(200,200,200,0.3)';
        ctx.font = '10px "Courier New", monospace';
        ctx.textAlign = 'left';
        ctx.fillText('WASD/Arrows: Move | J: Attack | K: Gun | L: Transform | Q: Heal | Space: Dodge', 10, G.H - 8);
    }

    /* ---- Death Screen ---- */
    renderDeath(timer) {
        const ctx = this.ctx;
        const alpha = Math.min(1, timer / 90);
        // Dark overlay
        ctx.fillStyle = `rgba(10,0,0,${alpha * 0.7})`;
        ctx.fillRect(0, 0, G.W, G.H);
        // YOU DIED text
        if (timer > 40) {
            const textAlpha = Math.min(1, (timer - 40) / 40);
            ctx.globalAlpha = textAlpha;
            ctx.fillStyle = '#cc2222';
            ctx.font = 'bold 52px "Georgia", serif';
            ctx.textAlign = 'center';
            ctx.fillText('YOU DIED', G.W / 2, G.H / 2 - 10);
            ctx.fillStyle = '#aa8866';
            ctx.font = '16px "Georgia", serif';
            ctx.fillText('Press Enter to return to the lamp', G.W / 2, G.H / 2 + 30);
            ctx.globalAlpha = 1;
        }
    }

    /* ---- Victory Screen ---- */
    renderVictory(timer, echoes) {
        const ctx = this.ctx;
        const alpha = Math.min(1, timer / 90);
        ctx.fillStyle = `rgba(0,0,5,${alpha * 0.6})`;
        ctx.fillRect(0, 0, G.W, G.H);

        if (timer > 50) {
            const textAlpha = Math.min(1, (timer - 50) / 40);
            ctx.globalAlpha = textAlpha;
            ctx.fillStyle = '#ddcc88';
            ctx.font = 'bold 42px "Georgia", serif';
            ctx.textAlign = 'center';
            ctx.fillText('PREY SLAUGHTERED', G.W / 2, G.H / 2 - 20);
            ctx.fillStyle = '#88bbff';
            ctx.font = '20px "Georgia", serif';
            ctx.fillText('Blood Echoes Gained: ' + echoes, G.W / 2, G.H / 2 + 20);
            ctx.fillStyle = '#aa8866';
            ctx.font = '16px "Georgia", serif';
            ctx.fillText('Press Enter to replay the nightmare (Boss Rush)', G.W / 2, G.H / 2 + 50);
            ctx.fillStyle = '#aaa';
            ctx.font = '14px "Georgia", serif';
            ctx.fillText('Demo Complete — Thank you, good Hunter', G.W / 2, G.H / 2 + 80);
            ctx.globalAlpha = 1;
        }
    }

    /* ---- Title Screen ---- */
    renderTitle() {
        const ctx = this.ctx;
        // Dark background with slight red tint
        ctx.fillStyle = '#0a0508';
        ctx.fillRect(0, 0, G.W, G.H);

        // Moon
        ctx.fillStyle = '#eeddcc';
        ctx.beginPath(); ctx.arc(G.W / 2, 120, 50, 0, Math.PI * 2); ctx.fill();
        const mg = ctx.createRadialGradient(G.W / 2, 120, 30, G.W / 2, 120, 200);
        mg.addColorStop(0, 'rgba(238,221,204,0.1)');
        mg.addColorStop(1, 'rgba(238,221,204,0)');
        ctx.fillStyle = mg;
        ctx.beginPath(); ctx.arc(G.W / 2, 120, 200, 0, Math.PI * 2); ctx.fill();

        // Title
        ctx.fillStyle = '#cc2222';
        ctx.font = 'bold 58px "Georgia", serif';
        ctx.textAlign = 'center';
        ctx.fillText('BLOBO', G.W / 2, G.H / 2 - 30);
        // Subtitle
        ctx.fillStyle = '#aa9977';
        ctx.font = 'italic 18px "Georgia", serif';
        ctx.fillText('A Bloodborne-Inspired Metroidvania', G.W / 2, G.H / 2 + 5);

        // Prompt
        const pulse = 0.5 + Math.sin(performance.now() * 0.003) * 0.3;
        ctx.globalAlpha = pulse;
        ctx.fillStyle = '#ddd';
        ctx.font = '16px "Courier New", monospace';
        ctx.fillText('Press ENTER or SPACE to begin the hunt', G.W / 2, G.H / 2 + 70);
        ctx.globalAlpha = 1;

        // Controls box
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(G.W / 2 - 200, G.H / 2 + 95, 400, 120);
        ctx.fillStyle = '#999';
        ctx.font = '12px "Courier New", monospace';
        const controls = [
            'WASD / Arrows — Move & Jump',
            'J / Z — Attack    K / X — Gun (Parry)',
            'L / C — Transform Weapon',
            'Q / V — Use Blood Vial',
            'Space — Dodge (i-frames)',
            'E — Interact'
        ];
        controls.forEach((line, i) => {
            ctx.fillText(line, G.W / 2, G.H / 2 + 115 + i * 17);
        });
    }

    /* ---- Boss intro fog transition ---- */
    renderBossIntro(timer) {
        const ctx = this.ctx;
        if (timer < 30) {
            // Fog fade in
            const alpha = timer / 30;
            ctx.fillStyle = `rgba(180,180,220,${alpha * 0.4})`;
            ctx.fillRect(0, 0, G.W, G.H);
        } else if (timer < 60) {
            // Fog fade out
            const alpha = 1 - (timer - 30) / 30;
            ctx.fillStyle = `rgba(180,180,220,${alpha * 0.4})`;
            ctx.fillRect(0, 0, G.W, G.H);
        }
    }
}
