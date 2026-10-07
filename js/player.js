/**
 * DEEP HUNT - Player Module
 * ==================================================================
 * CONTROLE DO MERGULHADOR
 *  - 5 CORAÇÕES de vida (antes eram 3)
 *  - Só perde vida quando REALMENTE recebe um ataque (1 hit por ataque)
 *  - Invulnerabilidade curta após cada dano (evita hits em sequência)
 *  - Estado de MORTE: controles desativados, animação de afundar e
 *    NENHUMA colisão de dano é processada depois disso.
 *  - Mira 360°, arma com recarga, skins cosméticas e bolhas de oxigênio
 *    (todas as funcionalidades anteriores mantidas).
 */

class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 24; // Raio de colisão
        this.vx = 0;
        this.vy = 0;
        this.speed = 285; // Velocidade base (maior que qualquer predador: sempre dá pra fugir)
        this.friction = 0.92;

        // Vida e invulnerabilidade
        this.maxHealth = 5;          // <<< 5 CORAÇÕES
        this.health = 5;
        this.invulnerableTimer = 0;
        this.invulnerableDuration = 1.5; // janela de perdão entre ataques
        this.hurtFlashTimer = 0;

        // Estado de vida/morte
        this.dead = false;
        this.deathTime = 0;
        this.deathRot = 0;

        // Mira e orientação
        this.aimAngle = 0;
        this.flipX = false;
        this.swimCycle = 0;
        this.isMoving = false;

        // Arma e Munição
        this.maxAmmo = 8;
        this.ammo = 8;
        this.shootCooldown = 0;
        this.fireRate = 0.16;
        this.reloadTimer = 0;
        this.reloadDuration = 0.75;
        this.isReloading = false;

        // Emissão de bolhas
        this.bubbleTimer = 0;

        // Skin ativa
        this.skin = 'classic';
        this.loadEquippedSkin();
    }

    loadEquippedSkin() {
        if (typeof gameStorage !== 'undefined') {
            this.skin = gameStorage.getActiveSkin();
        }
    }

    setSkin(skinId) {
        this.skin = skinId;
    }

    reset(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.health = this.maxHealth;   // volta com os 5 corações
        this.invulnerableTimer = 0;
        this.hurtFlashTimer = 0;
        this.dead = false;
        this.deathTime = 0;
        this.deathRot = 0;
        this.ammo = this.maxAmmo;
        this.shootCooldown = 0;
        this.reloadTimer = 0;
        this.isReloading = false;
        this.isMoving = false;
        this.swimCycle = 0;
        this.loadEquippedSkin();
    }

    /**
     * Aplica dano. Retorna TRUE apenas quando o dano foi realmente aplicado.
     * Guardas: não está morto, não está invulnerável e a vida ainda é > 0.
     */
    takeDamage(sourceX, sourceY) {
        if (this.dead || this.invulnerableTimer > 0 || this.health <= 0) return false;

        this.health -= 1;
        this.invulnerableTimer = this.invulnerableDuration;
        this.hurtFlashTimer = 0.45;

        // Empurrão leve para longe do atacante (ajuda a descolar, sem "grudar")
        if (typeof sourceX === 'number' && typeof sourceY === 'number') {
            const dx = this.x - sourceX;
            const dy = this.y - sourceY;
            const d = Math.max(1, Math.hypot(dx, dy));
            this.vx += (dx / d) * 165;
            this.vy += (dy / d) * 165;
        }

        if (typeof gameAudio !== 'undefined') {
            gameAudio.playHurt();
        }

        // Bolhas de desespero
        if (typeof bulletManager !== 'undefined') {
            for (let i = 0; i < 12; i++) {
                const p = new BubbleParticle(this.x + (Math.random() - 0.5) * 20, this.y + (Math.random() - 0.5) * 20);
                p.vy = -(60 + Math.random() * 80);
                p.vx = (Math.random() - 0.5) * 80;
                bulletManager.particles.push(p);
            }
        }

        // Morte: marca o jogador como morto (o game.js cuida do fluxo de estado)
        if (this.health <= 0) {
            this.health = 0;
            this.dead = true;
            this.deathTime = 0;
            this.vx *= 0.25;
            this.vy *= 0.25;
            this.isReloading = false;
        }

        return true;
    }

    heal() {
        if (this.health < this.maxHealth && !this.dead) {
            this.health += 1;
            if (typeof bulletManager !== 'undefined') {
                bulletManager.addFloatingText('❤️ +1 VIDA', this.x, this.y - 30, '#ff3366', 20);
            }
        }
    }

    update(dt, input, width, height, controlsEnabled = true) {
        // Temporizadores
        if (this.invulnerableTimer > 0) this.invulnerableTimer -= dt;
        if (this.hurtFlashTimer > 0) this.hurtFlashTimer -= dt;
        if (this.shootCooldown > 0) this.shootCooldown -= dt;

        if (this.isReloading) {
            this.reloadTimer -= dt;
            if (this.reloadTimer <= 0) {
                this.ammo = this.maxAmmo;
                this.isReloading = false;
            }
        }

        // ================= MORTE: controles desativados =================
        if (this.dead) {
            this.deathTime += dt;
            // afunda lentamente girando de lado
            const t = Math.min(1, this.deathTime / 2.2);
            this.vx += (-14 - this.vx) * Math.min(1, dt * 1.2);
            this.vy += (46 - this.vy) * Math.min(1, dt * 1.4);
            this.x += this.vx * dt;
            this.y += this.vy * dt;
            this.deathRot = t * 0.95;
            this.isMoving = false;

            // Gotas de bolhas enquanto afunda
            this.bubbleTimer += dt;
            if (this.bubbleTimer > 0.18) {
                this.bubbleTimer = 0;
                if (typeof bulletManager !== 'undefined') {
                    bulletManager.addBubbleTrail(this.x + (Math.random() - 0.5) * 16, this.y - 10, '#b4e6ff');
                }
            }
            return;
        }

        if (!controlsEnabled) {
            // Sem input (pausa/transição): apenas desacelera na água
            this.vx *= this.friction;
            this.vy *= this.friction;
            this.x += this.vx * dt;
            this.y += this.vy * dt;
            return;
        }

        // ================= MOVIMENTAÇÃO =================
        let moveX = 0;
        let moveY = 0;

        if (input.keys['KeyW'] || input.keys['ArrowUp']) moveY -= 1;
        if (input.keys['KeyS'] || input.keys['ArrowDown']) moveY += 1;
        if (input.keys['KeyA'] || input.keys['ArrowLeft']) moveX -= 1;
        if (input.keys['KeyD'] || input.keys['ArrowRight']) moveX += 1;

        if (input.joystick && input.joystick.active) {
            moveX = input.joystick.x;
            moveY = input.joystick.y;
        }

        const len = Math.hypot(moveX, moveY);
        if (len > 0.05) {
            this.isMoving = true;
            const normX = moveX / Math.max(1, len);
            const normY = moveY / Math.max(1, len);
            const acc = this.speed * 4 * dt;
            this.vx += normX * acc;
            this.vy += normY * acc;
            this.swimCycle += dt * 9;
        } else {
            this.isMoving = false;
            this.swimCycle += dt * 2.5;
        }

        // Atrito da água
        this.vx *= this.friction;
        this.vy *= this.friction;

        // Limite de velocidade
        const currentSpeed = Math.hypot(this.vx, this.vy);
        if (currentSpeed > this.speed) {
            this.vx = (this.vx / currentSpeed) * this.speed;
            this.vy = (this.vy / currentSpeed) * this.speed;
        }

        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // Bordas
        const margin = 35;
        this.x = Math.max(margin, Math.min(width - margin, this.x));
        this.y = Math.max(margin + 50, Math.min(height - margin - 20, this.y));

        // Mira
        const dx = input.mouseX - this.x;
        const dy = input.mouseY - this.y;
        this.aimAngle = Math.atan2(dy, dx);
        this.flipX = Math.abs(this.aimAngle) > Math.PI / 2;

        // Bolhas do regulador
        this.bubbleTimer += dt;
        if (this.bubbleTimer > (this.isMoving ? 0.35 : 1.2)) {
            this.bubbleTimer = 0;
            if (typeof bulletManager !== 'undefined') {
                const bubbleX = this.flipX ? this.x + 12 : this.x - 12;
                const bubbleY = this.y - 8;
                bulletManager.addBubbleTrail(bubbleX, bubbleY, '#b4e6ff');
            }
        }
    }

    tryShoot() {
        if (this.dead) return false;
        if (this.shootCooldown > 0 || this.isReloading) return false;

        if (this.ammo <= 0) {
            this.isReloading = true;
            this.reloadTimer = this.reloadDuration;
            return false;
        }

        this.ammo -= 1;
        this.shootCooldown = this.fireRate;

        if (this.ammo === 0) {
            this.isReloading = true;
            this.reloadTimer = this.reloadDuration;
        }

        const gunDist = 32;
        const gunAngle = this.aimAngle;
        const gunTipX = this.x + Math.cos(this.aimAngle) * gunDist;
        const gunTipY = this.y + Math.sin(this.aimAngle) * gunDist;

        // Recuo leve
        this.vx -= Math.cos(this.aimAngle) * 45;
        this.vy -= Math.sin(this.aimAngle) * 45;

        if (typeof bulletManager !== 'undefined') {
            bulletManager.fire(gunTipX, gunTipY, gunAngle, this.skin);
        }
        if (typeof gameAudio !== 'undefined') {
            gameAudio.playShoot();
        }

        return true;
    }

    draw(ctx) {
        // Piscar durante invulnerabilidade (não pisca depois de morto)
        if (!this.dead && this.invulnerableTimer > 0) {
            const blink = Math.floor(this.invulnerableTimer * 12) % 2 === 0;
            if (blink) return;
        }

        ctx.save();
        ctx.translate(this.x, this.y);

        // Rotação de morte (afundando de lado)
        if (this.dead) {
            ctx.rotate(this.deathRot);
        }

        if (this.flipX) {
            ctx.scale(-1, 1);
        }

        let renderAngle = this.aimAngle;
        if (this.flipX) {
            renderAngle = Math.PI - renderAngle;
        }
        if (this.dead) {
            renderAngle = this.flipX ? 0.9 : -0.9;
        }

        // Paletas de cores para as 6 skins (inalteradas)
        const palettes = {
            classic: {
                suit: '#1a4478', suitDark: '#0e2644', suitLight: '#2c6cb5',
                tank: '#f5b700', tankCap: '#ffda66', visor: '#00f7ff', visorGlow: '#00b4d8', trim: '#3388ff'
            },
            researcher: {
                suit: '#e2e8f0', suitDark: '#94a3b8', suitLight: '#ffffff',
                tank: '#ff5500', tankCap: '#ff8844', visor: '#00e5ff', visorGlow: '#00ffff', trim: '#ff7722'
            },
            explorer: {
                suit: '#3b5240', suitDark: '#223326', suitLight: '#527359',
                tank: '#c87d32', tankCap: '#e2a76f', visor: '#ffaa00', visorGlow: '#ffcc00', trim: '#b36b20'
            },
            futuristic: {
                suit: '#0d1b2a', suitDark: '#070f17', suitLight: '#1e334d',
                tank: '#00b4d8', tankCap: '#90e0ef', visor: '#00f5d4', visorGlow: '#00ffff', trim: '#00f5d4'
            },
            hunter: {
                suit: '#18181c', suitDark: '#0c0c0e', suitLight: '#2c2c35',
                tank: '#e63946', tankCap: '#ff6b77', visor: '#ff0055', visorGlow: '#ff0033', trim: '#ff1744'
            },
            alien: {
                suit: '#003820', suitDark: '#002213', suitLight: '#005933',
                tank: '#7209b7', tankCap: '#b5179e', visor: '#39ff14', visorGlow: '#00ff66', trim: '#48ff00'
            }
        };

        const pal = palettes[this.skin] || palettes.classic;
        const kick = Math.sin(this.swimCycle) * 7;

        // 1. Pernas e nadadeiras
        ctx.save();
        ctx.translate(-14, 4);

        ctx.fillStyle = pal.suitDark;
        ctx.beginPath();
        ctx.ellipse(-8, -kick * 0.7, 10, 4, -0.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = pal.trim;
        ctx.beginPath();
        ctx.moveTo(-14, -kick * 0.7 - 2);
        ctx.lineTo(-26, -kick * 0.7 - 7);
        ctx.lineTo(-23, -kick * 0.7 + 5);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = pal.suit;
        ctx.beginPath();
        ctx.ellipse(-6, kick, 10, 4.5, 0.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = pal.trim;
        ctx.beginPath();
        ctx.moveTo(-12, kick - 2);
        ctx.lineTo(-25, kick + 6);
        ctx.lineTo(-21, kick - 6);
        ctx.closePath();
        ctx.fill();

        ctx.restore();

        // 2. Cilindro de oxigênio
        ctx.save();
        ctx.translate(-8, -12);

        ctx.fillStyle = pal.tank;
        ctx.beginPath();
        // roundRect seguro (fallback para navegadores antigos)
        this.roundRectPath(ctx, -6, -4, 18, 9, 4);
        ctx.fill();

        ctx.fillStyle = pal.tankCap;
        ctx.beginPath();
        ctx.arc(12, 0.5, 3.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#111827';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(12, 0.5);
        ctx.quadraticCurveTo(14, 8, 8, 10);
        ctx.stroke();

        ctx.restore();

        // 3. Tronco
        ctx.fillStyle = pal.suit;
        ctx.beginPath();
        ctx.ellipse(0, 0, 15, 10, 0.1, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = pal.trim;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, 10, -0.8, 0.8);
        ctx.stroke();

        // 4. Cabeça e capacete
        ctx.fillStyle = pal.suitDark;
        ctx.beginPath();
        ctx.arc(10, -6, 9.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowColor = pal.visorGlow;
        ctx.shadowBlur = 10;
        ctx.fillStyle = pal.visor;
        ctx.beginPath();
        ctx.ellipse(14, -6, 5, 6.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.beginPath();
        ctx.arc(15, -8, 2, 0, Math.PI * 2);
        ctx.fill();

        // 5. Arma
        ctx.save();
        ctx.translate(6, 4);
        ctx.rotate(renderAngle);

        ctx.fillStyle = pal.suitLight;
        ctx.beginPath();
        ctx.ellipse(4, 0, 8, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#1e293b';
        ctx.fillRect(8, -3, 22, 6);

        ctx.fillStyle = '#64748b';
        ctx.fillRect(30, -2, 12, 4);

        ctx.fillStyle = pal.visor;
        ctx.shadowColor = pal.visorGlow;
        ctx.shadowBlur = 6;
        ctx.fillRect(20, -1.5, 8, 3);
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#0f172a';
        ctx.fillRect(12, 3, 4, 7);

        ctx.restore();

        ctx.restore();
    }

    /** Helper: roundRect compatível com navegadores sem ctx.roundRect */
    roundRectPath(ctx, x, y, w, h, r) {
        if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(x, y, w, h, r);
            return;
        }
        const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
        ctx.moveTo(x + rr, y);
        ctx.arcTo(x + w, y, x + w, y + h, rr);
        ctx.arcTo(x + w, y + h, x, y + h, rr);
        ctx.arcTo(x, y + h, x, y, rr);
        ctx.arcTo(x, y, x + w, y, rr);
        ctx.closePath();
    }
}
