/**
 * DEEP HUNT - Player Module
 * Controla o mergulhador, física aquática, animação de nado, mira 360°, arma e 6 skins cosméticas
 */

class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 24; // Raio de colisão
        this.vx = 0;
        this.vy = 0;
        this.speed = 280; // Velocidade base
        this.friction = 0.92; // Atrito da água

        // Vida e invulnerabilidade
        this.maxHealth = 3;
        this.health = 3;
        this.invulnerableTimer = 0;
        this.invulnerableDuration = 1.6;

        // Mira e orientação
        this.aimAngle = 0;
        this.flipX = false;
        this.swimCycle = 0;
        this.isMoving = false;

        // Arma e Munição (como no HUD da imagem 1: 8 / ∞)
        this.maxAmmo = 8;
        this.ammo = 8;
        this.shootCooldown = 0;
        this.fireRate = 0.16; // Tempo mínimo entre tiros
        this.reloadTimer = 0;
        this.reloadDuration = 0.75;
        this.isReloading = false;

        // Emissão de bolhas do regulador de mergulho
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
        this.health = this.maxHealth;
        this.invulnerableTimer = 0;
        this.ammo = this.maxAmmo;
        this.shootCooldown = 0;
        this.reloadTimer = 0;
        this.isReloading = false;
        this.loadEquippedSkin();
    }

    takeDamage() {
        if (this.invulnerableTimer > 0 || this.health <= 0) return false;

        this.health -= 1;
        this.invulnerableTimer = this.invulnerableDuration;

        // Som de dano
        if (typeof gameAudio !== 'undefined') {
            gameAudio.playHurt();
        }

        // Emite bolhas de desespero
        if (typeof bulletManager !== 'undefined') {
            for (let i = 0; i < 12; i++) {
                const p = new BubbleParticle(this.x + (Math.random() - 0.5) * 20, this.y + (Math.random() - 0.5) * 20);
                p.vy = -(60 + Math.random() * 80);
                p.vx = (Math.random() - 0.5) * 80;
                bulletManager.particles.push(p);
            }
        }

        return true;
    }

    heal() {
        if (this.health < this.maxHealth) {
            this.health += 1;
            if (typeof bulletManager !== 'undefined') {
                bulletManager.addFloatingText('❤️ +1 VIDA', this.x, this.y - 30, '#ff3366', 20);
            }
        }
    }

    update(dt, input, width, height) {
        // Reduz temporizador de invulnerabilidade
        if (this.invulnerableTimer > 0) {
            this.invulnerableTimer -= dt;
        }

        // Atualiza temporizadores de tiro e recarga
        if (this.shootCooldown > 0) {
            this.shootCooldown -= dt;
        }

        if (this.isReloading) {
            this.reloadTimer -= dt;
            if (this.reloadTimer <= 0) {
                this.ammo = this.maxAmmo;
                this.isReloading = false;
            }
        }

        // Movimentação (WASD / Teclado ou Joystick Touch)
        let moveX = 0;
        let moveY = 0;

        if (input.keys['KeyW'] || input.keys['ArrowUp']) moveY -= 1;
        if (input.keys['KeyS'] || input.keys['ArrowDown']) moveY += 1;
        if (input.keys['KeyA'] || input.keys['ArrowLeft']) moveX -= 1;
        if (input.keys['KeyD'] || input.keys['ArrowRight']) moveX += 1;

        // Incorpora input do joystick virtual se houver
        if (input.joystick && input.joystick.active) {
            moveX = input.joystick.x;
            moveY = input.joystick.y;
        }

        // Normaliza vetor de movimento
        const len = Math.hypot(moveX, moveY);
        if (len > 0.05) {
            this.isMoving = true;
            const normX = moveX / Math.max(1, len);
            const normY = moveY / Math.max(1, len);
            const acc = this.speed * 4 * dt;
            this.vx += normX * acc;
            this.vy += normY * acc;

            // Ciclo de pernada de nado
            this.swimCycle += dt * 9;
        } else {
            this.isMoving = false;
            this.swimCycle += dt * 2.5; // nado suave estático
        }

        // Aplica atrito suave da água
        this.vx *= this.friction;
        this.vy *= this.friction;

        // Limita velocidade máxima
        const currentSpeed = Math.hypot(this.vx, this.vy);
        if (currentSpeed > this.speed) {
            this.vx = (this.vx / currentSpeed) * this.speed;
            this.vy = (this.vy / currentSpeed) * this.speed;
        }

        // Atualiza posição
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // Mantém dentro das bordas da tela
        const margin = 35;
        this.x = Math.max(margin, Math.min(width - margin, this.x));
        this.y = Math.max(margin + 50, Math.min(height - margin - 20, this.y));

        // Atualiza ângulo de mira baseado na posição do mouse ou mira virtual
        const dx = input.mouseX - this.x;
        const dy = input.mouseY - this.y;
        this.aimAngle = Math.atan2(dy, dx);

        // Espelha o mergulhador horizontalmente quando mirando para a esquerda
        this.flipX = Math.abs(this.aimAngle) > Math.PI / 2;

        // Bolhas do cilindro de oxigênio
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
        if (this.shootCooldown > 0 || this.isReloading) return false;

        if (this.ammo <= 0) {
            // Inicia recarga rápida automática
            this.isReloading = true;
            this.reloadTimer = this.reloadDuration;
            return false;
        }

        // Disparo efetuado
        this.ammo -= 1;
        this.shootCooldown = this.fireRate;

        // Se acabou o pente, entra em recarga automática
        if (this.ammo === 0) {
            this.isReloading = true;
            this.reloadTimer = this.reloadDuration;
        }

        // Calcula ponta da arma para saída do tiro
        const gunDist = 32;
        const gunSpread = 0; // Tiro de precisão
        const gunAngle = this.aimAngle + gunSpread;
        const gunTipX = this.x + Math.cos(this.aimAngle) * gunDist;
        const gunTipY = this.y + Math.sin(this.aimAngle) * gunDist;

        // Empurrão leve de recuo na água
        this.vx -= Math.cos(this.aimAngle) * 45;
        this.vy -= Math.sin(this.aimAngle) * 45;

        // Cria o projétil
        if (typeof bulletManager !== 'undefined') {
            bulletManager.fire(gunTipX, gunTipY, gunAngle, this.skin);
        }

        // Toca som de tiro
        if (typeof gameAudio !== 'undefined') {
            gameAudio.playShoot();
        }

        return true;
    }

    draw(ctx) {
        // Efeito de piscar durante invulnerabilidade
        if (this.invulnerableTimer > 0) {
            const blink = Math.floor(this.invulnerableTimer * 12) % 2 === 0;
            if (blink) return;
        }

        ctx.save();
        ctx.translate(this.x, this.y);

        // Se estiver mirando para a esquerda, inverte verticalmente para manter a orientação correta
        if (this.flipX) {
            ctx.scale(-1, 1);
        }

        // Ângulo relativo da arma e do corpo
        let renderAngle = this.aimAngle;
        if (this.flipX) {
            renderAngle = Math.PI - renderAngle;
        }

        // Paletas de cores para as 6 skins
        const palettes = {
            classic: {
                suit: '#1a4478',
                suitDark: '#0e2644',
                suitLight: '#2c6cb5',
                tank: '#f5b700',
                tankCap: '#ffda66',
                visor: '#00f7ff',
                visorGlow: '#00b4d8',
                trim: '#3388ff'
            },
            researcher: {
                suit: '#e2e8f0',
                suitDark: '#94a3b8',
                suitLight: '#ffffff',
                tank: '#ff5500',
                tankCap: '#ff8844',
                visor: '#00e5ff',
                visorGlow: '#00ffff',
                trim: '#ff7722'
            },
            explorer: {
                suit: '#3b5240',
                suitDark: '#223326',
                suitLight: '#527359',
                tank: '#c87d32',
                tankCap: '#e2a76f',
                visor: '#ffaa00',
                visorGlow: '#ffcc00',
                trim: '#b36b20'
            },
            futuristic: {
                suit: '#0d1b2a',
                suitDark: '#070f17',
                suitLight: '#1e334d',
                tank: '#00b4d8',
                tankCap: '#90e0ef',
                visor: '#00f5d4',
                visorGlow: '#00ffff',
                trim: '#00f5d4'
            },
            hunter: {
                suit: '#18181c',
                suitDark: '#0c0c0e',
                suitLight: '#2c2c35',
                tank: '#e63946',
                tankCap: '#ff6b77',
                visor: '#ff0055',
                visorGlow: '#ff0033',
                trim: '#ff1744'
            },
            alien: {
                suit: '#003820',
                suitDark: '#002213',
                suitLight: '#005933',
                tank: '#7209b7',
                tankCap: '#b5179e',
                visor: '#39ff14',
                visorGlow: '#00ff66',
                trim: '#48ff00'
            }
        };

        const pal = palettes[this.skin] || palettes.classic;
        const kick = Math.sin(this.swimCycle) * 7;

        // 1. Pernas e Nadadeiras (Flippers)
        ctx.save();
        ctx.translate(-14, 4);

        // Perna de trás
        ctx.fillStyle = pal.suitDark;
        ctx.beginPath();
        ctx.ellipse(-8, -kick * 0.7, 10, 4, -0.2, 0, Math.PI * 2);
        ctx.fill();

        // Nadadeira de trás
        ctx.fillStyle = pal.trim;
        ctx.beginPath();
        ctx.moveTo(-14, -kick * 0.7 - 2);
        ctx.lineTo(-26, -kick * 0.7 - 7);
        ctx.lineTo(-23, -kick * 0.7 + 5);
        ctx.closePath();
        ctx.fill();

        // Perna da frente
        ctx.fillStyle = pal.suit;
        ctx.beginPath();
        ctx.ellipse(-6, kick, 10, 4.5, 0.2, 0, Math.PI * 2);
        ctx.fill();

        // Nadadeira da frente
        ctx.fillStyle = pal.trim;
        ctx.beginPath();
        ctx.moveTo(-12, kick - 2);
        ctx.lineTo(-25, kick + 6);
        ctx.lineTo(-21, kick - 6);
        ctx.closePath();
        ctx.fill();

        ctx.restore();

        // 2. Cilindro de Oxigênio (Nas costas)
        ctx.save();
        ctx.translate(-8, -12);

        // Cilindro amarelo/personalizado
        ctx.fillStyle = pal.tank;
        ctx.beginPath();
        ctx.roundRect(-6, -4, 18, 9, 4);
        ctx.fill();

        // Detalhe metálico / tampa da válvula
        ctx.fillStyle = pal.tankCap;
        ctx.beginPath();
        ctx.arc(12, 0.5, 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Mangueira de ar preta
        ctx.strokeStyle = '#111827';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(12, 0.5);
        ctx.quadraticCurveTo(14, 8, 8, 10);
        ctx.stroke();

        ctx.restore();

        // 3. Tronco do Mergulhador
        ctx.fillStyle = pal.suit;
        ctx.beginPath();
        ctx.ellipse(0, 0, 15, 10, 0.1, 0, Math.PI * 2);
        ctx.fill();

        // Faixa de destaque/cinto na roupa
        ctx.strokeStyle = pal.trim;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, 10, -0.8, 0.8);
        ctx.stroke();

        // 4. Cabeça e Capacete de Mergulho
        ctx.fillStyle = pal.suitDark;
        ctx.beginPath();
        ctx.arc(10, -6, 9.5, 0, Math.PI * 2);
        ctx.fill();

        // Viseira brilhante com neon
        ctx.shadowColor = pal.visorGlow;
        ctx.shadowBlur = 10;
        ctx.fillStyle = pal.visor;
        ctx.beginPath();
        ctx.ellipse(14, -6, 5, 6.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0; // reseta sombra

        // Reflexo branco na viseira
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.beginPath();
        ctx.arc(15, -8, 2, 0, Math.PI * 2);
        ctx.fill();

        // 5. Arma Arpão / Fuzil de Plasma (Rotaciona na direção da mira)
        ctx.save();
        ctx.translate(6, 4);
        ctx.rotate(renderAngle);

        // Braço segurando o arpão
        ctx.fillStyle = pal.suitLight;
        ctx.beginPath();
        ctx.ellipse(4, 0, 8, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Corpo da arma (fuzil subaquático de precisão)
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(8, -3, 22, 6);

        // Cano metálico
        ctx.fillStyle = '#64748b';
        ctx.fillRect(30, -2, 12, 4);

        // Ponta do arpão / câmara de energia
        ctx.fillStyle = pal.visor;
        ctx.shadowColor = pal.visorGlow;
        ctx.shadowBlur = 6;
        ctx.fillRect(20, -1.5, 8, 3);
        ctx.shadowBlur = 0;

        // Cabo e empunhadura
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(12, 3, 4, 7);

        ctx.restore();

        ctx.restore();
    }
}
