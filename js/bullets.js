/**
 * DEEP HUNT - Bullets, Projectiles & Visual FX
 * Gerencia tiros de arpão/plasma, partículas de bolhas, fagulhas e moedas colecionáveis
 */

class Bullet {
    constructor(x, y, angle, skin = 'classic') {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = 850; // pixels por segundo
        this.vx = Math.cos(angle) * this.speed;
        this.vy = Math.sin(angle) * this.speed;
        this.radius = 4;
        this.damage = 1;
        this.distanceTraveled = 0;
        this.maxDistance = 1400;
        this.skin = skin;
        this.trailTimer = 0;
        this.dead = false;

        // Cor do projétil de acordo com a skin
        this.color = '#00f7ff';
        this.glow = '#00aaff';
        if (skin === 'researcher') {
            this.color = '#ffaa00';
            this.glow = '#ff6600';
        } else if (skin === 'explorer') {
            this.color = '#ffe066';
            this.glow = '#cc8800';
        } else if (skin === 'futuristic') {
            this.color = '#00ffff';
            this.glow = '#0088ff';
        } else if (skin === 'hunter') {
            this.color = '#ff3355';
            this.glow = '#ff0033';
        } else if (skin === 'alien') {
            this.color = '#55ff77';
            this.glow = '#00cc44';
        }
    }

    update(dt, bulletManager) {
        const moveDist = this.speed * dt;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.distanceTraveled += moveDist;

        if (this.distanceTraveled >= this.maxDistance) {
            this.dead = true;
        }

        // Emite bolhas de rastro luminoso
        this.trailTimer += dt;
        if (this.trailTimer > 0.02) {
            this.trailTimer = 0;
            bulletManager.addBubbleTrail(this.x, this.y, this.color);
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // Brilho neon externo
        ctx.shadowColor = this.glow;
        ctx.shadowBlur = 12;

        // Projétil em formato de dardo/plasma energético
        const grad = ctx.createLinearGradient(-16, 0, 8, 0);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
        grad.addColorStop(0.5, this.glow);
        grad.addColorStop(1, '#ffffff');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(8, 0);
        ctx.lineTo(-14, -3);
        ctx.lineTo(-8, 0);
        ctx.lineTo(-14, 3);
        ctx.closePath();
        ctx.fill();

        // Núcleo branco intenso
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(3, 0, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

class BubbleParticle {
    constructor(x, y, isWaterCurrent = false) {
        this.x = x;
        this.y = y;
        this.isWaterCurrent = isWaterCurrent;
        this.radius = isWaterCurrent ? 1.5 + Math.random() * 4 : 1 + Math.random() * 3;
        this.vy = -(30 + Math.random() * 70); // sobe em direção à superfície
        this.vx = (Math.random() - 0.5) * 20;
        this.wobbleSpeed = 2 + Math.random() * 4;
        this.wobbleAmp = 10 + Math.random() * 15;
        this.time = Math.random() * Math.PI * 2;
        this.alpha = isWaterCurrent ? 0.2 + Math.random() * 0.4 : 0.7;
        this.life = isWaterCurrent ? 12 : 0.8 + Math.random() * 1.5;
        this.maxLife = this.life;
        this.dead = false;
    }

    update(dt) {
        this.time += dt * this.wobbleSpeed;
        this.x += (this.vx + Math.sin(this.time) * this.wobbleAmp) * dt;
        this.y += this.vy * dt;
        this.life -= dt;

        if (this.life <= 0 || this.y < -20) {
            this.dead = true;
        }
    }

    draw(ctx) {
        const fade = Math.min(1, this.life / (this.maxLife * 0.3));
        const currentAlpha = this.alpha * fade;
        if (currentAlpha <= 0) return;

        ctx.save();
        ctx.strokeStyle = `rgba(180, 230, 255, ${currentAlpha})`;
        ctx.fillStyle = `rgba(220, 245, 255, ${currentAlpha * 0.3})`;
        ctx.lineWidth = 1;

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Ponto de brilho especular na bolha
        ctx.fillStyle = `rgba(255, 255, 255, ${currentAlpha * 0.8})`;
        ctx.beginPath();
        ctx.arc(this.x - this.radius * 0.35, this.y - this.radius * 0.35, Math.max(0.5, this.radius * 0.3), 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

class SparkParticle {
    constructor(x, y, color = '#00e5ff') {
        this.x = x;
        this.y = y;
        this.color = color;
        const angle = Math.random() * Math.PI * 2;
        const speed = 60 + Math.random() * 160;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.life = 0.3 + Math.random() * 0.3;
        this.maxLife = this.life;
        this.size = 2 + Math.random() * 3;
        this.dead = false;
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.vx *= 0.92;
        this.vy *= 0.92;
        this.life -= dt;
        if (this.life <= 0) this.dead = true;
    }

    draw(ctx) {
        const progress = this.life / this.maxLife;
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 6;
        ctx.globalAlpha = Math.max(0, progress);
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * progress, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class FloatingText {
    constructor(text, x, y, color = '#ffe600', fontSize = 18) {
        this.text = text;
        this.x = x;
        this.y = y;
        this.color = color;
        this.fontSize = fontSize;
        this.vy = -45;
        this.life = 0.9;
        this.maxLife = 0.9;
        this.dead = false;
    }

    update(dt) {
        this.y += this.vy * dt;
        this.life -= dt;
        if (this.life <= 0) this.dead = true;
    }

    draw(ctx) {
        const progress = Math.max(0, this.life / this.maxLife);
        ctx.save();
        ctx.globalAlpha = progress;
        ctx.font = `bold ${this.fontSize}px 'Outfit', sans-serif, system-ui`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Sombra / contorno escuro para contraste no fundo marinho
        ctx.strokeStyle = '#020b17';
        ctx.lineWidth = 3.5;
        ctx.strokeText(this.text, this.x, this.y);

        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 8;
        ctx.fillText(this.text, this.x, this.y);

        ctx.restore();
    }
}

class CollectibleCoin {
    constructor(x, y, value = 50) {
        this.x = x;
        this.y = y;
        this.value = value;
        this.vy = -12; // Flutua lentamente para cima
        this.bobTime = Math.random() * Math.PI * 2;
        this.radius = 12;
        this.life = 12; // Expira se não coletada em 12s
        this.dead = false;
    }

    update(dt, player, onCollect) {
        this.bobTime += dt * 3;
        this.y += this.vy * dt;
        this.life -= dt;

        // Checa atração magnética quando o mergulhador está próximo
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.hypot(dx, dy);

        if (dist < 110) {
            // Puxa para o mergulhador
            const pullSpeed = (110 - dist) * 4;
            this.x += (dx / dist) * pullSpeed * dt;
            this.y += (dy / dist) * pullSpeed * dt;
        }

        // Coleta
        if (dist < player.radius + this.radius) {
            this.dead = true;
            onCollect(this);
        }

        if (this.life <= 0 || this.y < -20) {
            this.dead = true;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y + Math.sin(this.bobTime) * 3);

        // Brilho dourado
        ctx.shadowColor = '#ffe600';
        ctx.shadowBlur = 10;

        // Moeda redonda
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Borda e detalhe interno
        ctx.strokeStyle = '#fff275';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#e6a800';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.65, 0, Math.PI * 2);
        ctx.fill();

        // Ícone de estrela / cifrão no centro
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('★', 0, 0);

        ctx.restore();
    }
}

class BulletManager {
    constructor() {
        this.bullets = [];
        this.particles = [];
        this.floatingTexts = [];
        this.coins = [];
    }

    reset() {
        this.bullets = [];
        this.particles = [];
        this.floatingTexts = [];
        this.coins = [];
    }

    fire(x, y, angle, skin = 'classic') {
        const bullet = new Bullet(x, y, angle, skin);
        this.bullets.push(bullet);

        // Bolhas no cano no momento do disparo
        for (let i = 0; i < 4; i++) {
            const p = new BubbleParticle(x + (Math.random() - 0.5) * 8, y + (Math.random() - 0.5) * 8);
            p.vx = Math.cos(angle + (Math.random() - 0.5) * 0.8) * 40;
            p.vy = Math.sin(angle + (Math.random() - 0.5) * 0.8) * 40;
            this.particles.push(p);
        }
        return bullet;
    }

    addBubbleTrail(x, y, color) {
        const p = new BubbleParticle(x, y);
        p.radius = 1.2 + Math.random() * 2;
        p.life = 0.35 + Math.random() * 0.2;
        this.particles.push(p);
    }

    addHitImpact(x, y, color = '#00ffff') {
        // Fagulhas de energia
        for (let i = 0; i < 7; i++) {
            this.particles.push(new SparkParticle(x, y, color));
        }
        // Bolhas de impacto
        for (let i = 0; i < 5; i++) {
            const p = new BubbleParticle(x, y);
            p.vy = -(40 + Math.random() * 60);
            p.vx = (Math.random() - 0.5) * 70;
            this.particles.push(p);
        }
    }

    addCreatureDefeatFX(x, y, size = 'small') {
        const count = size === 'boss' ? 35 : (size === 'large' ? 20 : 10);
        for (let i = 0; i < count; i++) {
            const p = new BubbleParticle(x + (Math.random() - 0.5) * 30, y + (Math.random() - 0.5) * 30);
            p.radius = 2 + Math.random() * 4;
            p.vy = -(50 + Math.random() * 90);
            p.vx = (Math.random() - 0.5) * 100;
            p.life = 0.8 + Math.random() * 0.8;
            this.particles.push(p);
        }

        // Fagulhas brilhantes
        for (let i = 0; i < count * 0.7; i++) {
            this.particles.push(new SparkParticle(x, y, '#ffe600'));
        }
    }

    addFloatingText(text, x, y, color = '#ffe600', fontSize = 18) {
        this.floatingTexts.push(new FloatingText(text, x, y, color, fontSize));
    }

    spawnCoin(x, y, value = 50) {
        this.coins.push(new CollectibleCoin(x, y, value));
    }

    update(dt, player, onCoinCollect) {
        // Atualiza tiros
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            b.update(dt, this);
            if (b.dead) {
                this.bullets.splice(i, 1);
            }
        }

        // Atualiza partículas
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.update(dt);
            if (p.dead) {
                this.particles.splice(i, 1);
            }
        }

        // Atualiza textos flutuantes
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const t = this.floatingTexts[i];
            t.update(dt);
            if (t.dead) {
                this.floatingTexts.splice(i, 1);
            }
        }

        // Atualiza moedas
        for (let i = this.coins.length - 1; i >= 0; i--) {
            const c = this.coins[i];
            c.update(dt, player, onCoinCollect);
            if (c.dead) {
                this.coins.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        // Moedas
        for (const c of this.coins) {
            c.draw(ctx);
        }

        // Tiros
        for (const b of this.bullets) {
            b.draw(ctx);
        }

        // Partículas
        for (const p of this.particles) {
            p.draw(ctx);
        }

        // Textos flutuantes
        for (const t of this.floatingTexts) {
            t.draw(ctx);
        }
    }
}

// Instância global
const bulletManager = new BulletManager();
