/**
 * DEEP HUNT - Creatures & Enemy AI Module
 * Contém o bestiário completo com 14+ criaturas categorizadas, comportamentos de IA e sistema de spawn
 */

const CREATURE_TYPES = {
    // === COMUNS (Pouca vida, rápidos) ===
    peixe_pequeno: {
        id: 'peixe_pequeno',
        name: 'Peixe Pequeno',
        tier: 'common',
        points: 10,
        hp: 1,
        speed: 150,
        radius: 14,
        size: 'small',
        color: '#ffb703',
        coins: 1
    },
    peixe_palhaco: {
        id: 'peixe_palhaco',
        name: 'Peixe-Palhaço',
        tier: 'common',
        points: 15,
        hp: 1,
        speed: 160,
        radius: 16,
        size: 'small',
        color: '#fb8500',
        coins: 1
    },
    agua_viva: {
        id: 'agua_viva',
        name: 'Água-Viva',
        tier: 'common',
        points: 15,
        hp: 2,
        speed: 75,
        radius: 20,
        size: 'small',
        color: '#b5179e',
        glow: '#e0aaff',
        coins: 1
    },
    caranguejo: {
        id: 'caranguejo',
        name: 'Caranguejo',
        tier: 'common',
        points: 20,
        hp: 2,
        speed: 95,
        radius: 18,
        size: 'small',
        color: '#d90429',
        coins: 1
    },
    peixe_lanterna: {
        id: 'peixe_lanterna',
        name: 'Peixe-Lanterna',
        tier: 'common',
        points: 35,
        hp: 2,
        speed: 130,
        radius: 18,
        size: 'small',
        color: '#2a9d8f',
        glow: '#e9c46a',
        coins: 1
    },
    lula_pequena: {
        id: 'lula_pequena',
        name: 'Lula Pequena',
        tier: 'common',
        points: 40,
        hp: 2,
        speed: 180,
        radius: 18,
        size: 'small',
        color: '#f72585',
        coins: 1
    },
    moreia: {
        id: 'moreia',
        name: 'Moreia',
        tier: 'common',
        points: 50,
        hp: 3,
        speed: 140,
        radius: 20,
        size: 'small',
        color: '#38b000',
        coins: 2
    },

    // === PERIGOSAS (Vida média, perseguem ou arremetem) ===
    tubarao: {
        id: 'tubarao',
        name: 'Tubarão',
        tier: 'dangerous',
        points: 100,
        hp: 6,
        speed: 175,
        radius: 36,
        size: 'medium',
        color: '#3a86ff',
        coins: 3
    },
    tubarao_martelo: {
        id: 'tubarao_martelo',
        name: 'Tubarão-Martelo',
        tier: 'dangerous',
        points: 150,
        hp: 7,
        speed: 165,
        radius: 38,
        size: 'medium',
        color: '#4361ee',
        coins: 3
    },
    arraia_gigante: {
        id: 'arraia_gigante',
        name: 'Arraia Gigante',
        tier: 'dangerous',
        points: 180,
        hp: 8,
        speed: 110,
        radius: 42,
        size: 'medium',
        color: '#4cc9f0',
        coins: 3
    },
    polvo_gigante: {
        id: 'polvo_gigante',
        name: 'Polvo Gigante',
        tier: 'dangerous',
        points: 200,
        hp: 10,
        speed: 115,
        radius: 45,
        size: 'medium',
        color: '#d00000',
        coins: 4
    },
    lula_gigante: {
        id: 'lula_gigante',
        name: 'Lula Gigante',
        tier: 'dangerous',
        points: 350,
        hp: 14,
        speed: 190,
        radius: 48,
        size: 'medium',
        color: '#9d0208',
        coins: 5
    },

    // === PRÉ-HISTÓRICAS (Muito resistentes, lentas, enorme pontuação) ===
    dunkleosteus: {
        id: 'dunkleosteus',
        name: 'Dunkleosteus',
        tier: 'prehistoric',
        points: 600,
        hp: 20,
        speed: 120,
        radius: 54,
        size: 'large',
        color: '#5c677d',
        coins: 6
    },
    megalodon: {
        id: 'megalodon',
        name: 'Megalodon',
        tier: 'prehistoric',
        points: 1500,
        hp: 35,
        speed: 140,
        radius: 70,
        size: 'large',
        color: '#003049',
        coins: 10
    },
    mosasaurus: {
        id: 'mosasaurus',
        name: 'Mosasaurus',
        tier: 'prehistoric',
        points: 2000,
        hp: 45,
        speed: 150,
        radius: 75,
        size: 'large',
        color: '#1d3557',
        coins: 12
    },

    // === FICTÍCIA / MINI-CHEFE (Extremamente raro, gigantesco) ===
    abyssal_leviathan: {
        id: 'abyssal_leviathan',
        name: 'Abyssal Leviathan',
        tier: 'legendary',
        points: 3000,
        hp: 80,
        speed: 95,
        radius: 95,
        size: 'boss',
        color: '#480ca8',
        glow: '#7209b7',
        coins: 20
    }
};

class Creature {
    constructor(typeId, x, y, dir = 1) {
        this.type = CREATURE_TYPES[typeId] || CREATURE_TYPES.peixe_pequeno;
        this.typeId = typeId;
        this.x = x;
        this.y = y;
        this.dir = dir; // 1 = nadando para a direita, -1 = nadando para a esquerda
        this.hp = this.type.hp;
        this.maxHp = this.type.hp;
        this.radius = this.type.radius;
        this.speed = this.type.speed * (0.9 + Math.random() * 0.2);

        this.vx = this.dir * this.speed;
        this.vy = 0;
        this.angle = this.dir > 0 ? 0 : Math.PI;

        // Animação e temporizadores
        this.animTime = Math.random() * Math.PI * 2;
        this.hitFlashTimer = 0;
        this.dead = false;

        // Variáveis de comportamento específicas
        this.behaviorTimer = 0;
        this.pulsePhase = Math.random() * Math.PI * 2;
        this.chargeTimer = 0;
        this.isCharging = false;
        this.specialAttackTimer = 0;
    }

    takeDamage(amount = 1) {
        this.hp -= amount;
        this.hitFlashTimer = 0.12;

        if (typeof gameAudio !== 'undefined') {
            gameAudio.playHit();
        }

        if (this.hp <= 0) {
            this.dead = true;
            return true; // morreu
        }
        return false;
    }

    update(dt, player, width, height, creatureManager) {
        this.animTime += dt * 4;
        if (this.hitFlashTimer > 0) {
            this.hitFlashTimer -= dt;
        }

        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distToPlayer = Math.hypot(dx, dy);

        // --- COMPORTAMENTOS DISTINTOS POR CRIATURA ---
        switch (this.typeId) {
            case 'peixe_pequeno':
            case 'peixe_palhaco': {
                // Nado em linha com suave onda senoidal
                this.x += this.vx * dt;
                this.y += Math.sin(this.animTime * 2) * 40 * dt;
                this.angle = this.vx > 0 ? Math.sin(this.animTime * 2) * 0.2 : Math.PI - Math.sin(this.animTime * 2) * 0.2;
                break;
            }

            case 'agua_viva': {
                // Movimento pulsante vertical (sobe com impulso, desce suave)
                this.pulsePhase += dt * 2.5;
                const pulse = Math.sin(this.pulsePhase);
                this.vy = pulse > 0 ? -this.speed * 1.4 : this.speed * 0.3;
                this.vx = Math.cos(this.animTime * 0.8) * 20;

                this.x += this.vx * dt;
                this.y += this.vy * dt;
                this.angle = -Math.PI / 2; // Virada para cima
                break;
            }

            case 'caranguejo': {
                // Anda pelo fundo
                this.x += this.vx * dt;
                this.y = Math.min(height - 40, this.y + 30 * dt);
                this.angle = 0;
                break;
            }

            case 'peixe_lanterna': {
                // Nado furtivo ondulado, atrai-se lentamente para o mergulhador
                if (distToPlayer < 400) {
                    this.vx += (dx / distToPlayer) * 70 * dt;
                    this.vy += (dy / distToPlayer) * 70 * dt;
                } else {
                    this.x += this.vx * dt;
                }
                this.x += this.vx * dt;
                this.y += this.vy * dt;
                this.angle = Math.atan2(this.vy, this.vx);
                break;
            }

            case 'lula_pequena':
            case 'lula_gigante': {
                // Propulsão a jato: acelera forte, depois desacelera suavemente
                this.behaviorTimer += dt * 2.5;
                const jetCycle = Math.sin(this.behaviorTimer);
                if (jetCycle > 0.6) {
                    // Impulso na direção do jogador ou de fuga
                    const targetAngle = Math.atan2(dy, dx);
                    this.vx = Math.cos(targetAngle) * this.speed * 1.8;
                    this.vy = Math.sin(targetAngle) * this.speed * 1.8;
                } else {
                    this.vx *= 0.94;
                    this.vy *= 0.94;
                }
                this.x += this.vx * dt;
                this.y += this.vy * dt;
                this.angle = Math.atan2(this.vy, this.vx);
                break;
            }

            case 'tubarao':
            case 'tubarao_martelo': {
                // Patrulha e persegue agressivamente quando o jogador está à vista
                if (distToPlayer < 450) {
                    const targetAngle = Math.atan2(dy, dx);
                    // Suaviza a rotação do tubarão em direção ao jogador
                    this.vx = Math.cos(targetAngle) * this.speed * 1.25;
                    this.vy = Math.sin(targetAngle) * this.speed * 1.25;
                    this.angle = targetAngle;
                } else {
                    this.x += this.vx * dt;
                    this.y += Math.sin(this.animTime) * 30 * dt;
                    this.angle = this.vx > 0 ? 0 : Math.PI;
                }
                this.x += this.vx * dt;
                this.y += this.vy * dt;
                break;
            }

            case 'arraia_gigante': {
                // Movimento amplo e gracioso com curvas suaves
                this.x += this.vx * dt;
                this.y += Math.sin(this.animTime * 1.5) * 60 * dt;
                this.angle = Math.atan2(Math.sin(this.animTime * 1.5) * 60, this.vx);
                break;
            }

            case 'polvo_gigante': {
                // Flutua e se reposiciona com tentáculos ativos
                this.behaviorTimer += dt;
                if (this.behaviorTimer > 3) {
                    this.behaviorTimer = 0;
                    this.vx = (Math.random() - 0.5) * this.speed;
                    this.vy = (Math.random() - 0.5) * this.speed;
                }
                if (distToPlayer < 350) {
                    this.vx += (dx / distToPlayer) * 80 * dt;
                    this.vy += (dy / distToPlayer) * 80 * dt;
                }
                this.x += this.vx * dt;
                this.y += this.vy * dt;
                this.angle = Math.atan2(this.vy, this.vx);
                break;
            }

            case 'megalodon':
            case 'mosasaurus':
            case 'dunkleosteus': {
                // Predadores colossais pré-históricos: investidas pesadas e perseguição implacável
                this.chargeTimer += dt;
                if (this.chargeTimer > 4 && distToPlayer < 500) {
                    // Arremetida veloz
                    this.chargeTimer = 0;
                    this.isCharging = true;
                    const rushAngle = Math.atan2(dy, dx);
                    this.vx = Math.cos(rushAngle) * this.speed * 2.2;
                    this.vy = Math.sin(rushAngle) * this.speed * 2.2;
                    this.angle = rushAngle;

                    // Som de rugido / fúria submarina
                    if (typeof gameAudio !== 'undefined') {
                        gameAudio.playBossRoar();
                    }
                } else if (!this.isCharging) {
                    const targetAngle = Math.atan2(dy, dx);
                    this.vx = Math.cos(targetAngle) * this.speed * 0.9;
                    this.vy = Math.sin(targetAngle) * this.speed * 0.9;
                    this.angle = targetAngle;
                } else {
                    // Desacelera a arremetida
                    this.vx *= 0.97;
                    this.vy *= 0.97;
                    if (Math.hypot(this.vx, this.vy) < this.speed) {
                        this.isCharging = false;
                    }
                }
                this.x += this.vx * dt;
                this.y += this.vy * dt;
                break;
            }

            case 'abyssal_leviathan': {
                // MINI-CHEFE LENDÁRIO: Flutuação majestosa, rugido com ondas de choque e summons
                this.specialAttackTimer += dt;
                const targetAngle = Math.atan2(dy, dx);
                this.vx = Math.cos(targetAngle) * this.speed * 0.85;
                this.vy = Math.sin(targetAngle) * this.speed * 0.85;
                this.angle = targetAngle;

                this.x += this.vx * dt;
                this.y += this.vy * dt;

                // Ataque especial periódico (onda de choque de água / bolhas)
                if (this.specialAttackTimer > 5.5) {
                    this.specialAttackTimer = 0;
                    if (typeof gameAudio !== 'undefined') {
                        gameAudio.playBossRoar();
                    }
                    if (typeof bulletManager !== 'undefined') {
                        bulletManager.addCreatureDefeatFX(this.x, this.y, 'boss');
                        bulletManager.addFloatingText('⚡ RUGIDO DO LEVIATHAN!', this.x, this.y - 70, '#d000ff', 22);
                    }
                    // Empurra o jogador levemente para trás
                    player.vx += Math.cos(targetAngle) * 200;
                    player.vy += Math.sin(targetAngle) * 200;
                }
                break;
            }

            default: {
                this.x += this.vx * dt;
                this.y += this.vy * dt;
                break;
            }
        }

        // Verifica se saiu completamente da área com margem larga
        const offMargin = 250;
        if (
            (this.dir > 0 && this.x > width + offMargin) ||
            (this.dir < 0 && this.x < -offMargin) ||
            this.y < -offMargin ||
            this.y > height + offMargin
        ) {
            // Se saiu da tela sem ser boss/pré-histórico, pode ser reciclado
            if (this.type.tier !== 'legendary' && this.type.tier !== 'prehistoric') {
                this.dead = true;
            }
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        // Se estiver nadando para a esquerda, inverte verticalmente se necessário
        const flip = Math.abs(this.angle) > Math.PI / 2;
        if (flip) {
            ctx.scale(-1, 1);
            ctx.rotate(Math.PI - this.angle);
        } else {
            ctx.rotate(this.angle);
        }

        // Flash de dano em branco
        if (this.hitFlashTimer > 0) {
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#ffffff';
            ctx.shadowBlur = 15;
        }

        // Renderização customizada para cada espécie marinha
        this.renderBody(ctx);

        ctx.restore();

        // Barra de vida para criaturas Perigosas, Pré-históricas ou Chefes
        if (this.type.tier !== 'common' && this.hp < this.maxHp) {
            this.drawHealthBar(ctx);
        }
    }

    drawHealthBar(ctx) {
        const barWidth = Math.max(36, this.radius * 1.3);
        const barHeight = 5;
        const barX = this.x - barWidth / 2;
        const barY = this.y - this.radius - 12;

        ctx.save();
        // Fundo escuro com contorno
        ctx.fillStyle = 'rgba(2, 11, 23, 0.85)';
        ctx.strokeStyle = '#00e5ff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(barX - 1, barY - 1, barWidth + 2, barHeight + 2, 2);
        ctx.fill();
        ctx.stroke();

        // Barra de progresso vermelha vibrante
        const pct = Math.max(0, this.hp / this.maxHp);
        ctx.fillStyle = pct > 0.5 ? '#ff3366' : '#ff0033';
        ctx.shadowColor = '#ff3366';
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.roundRect(barX, barY, barWidth * pct, barHeight, 2);
        ctx.fill();
        ctx.restore();
    }

    renderBody(ctx) {
        const t = this.typeId;
        const wig = Math.sin(this.animTime) * 5;

        switch (t) {
            case 'peixe_pequeno':
            case 'peixe_palhaco': {
                // Corpo oval
                ctx.fillStyle = this.type.color;
                ctx.beginPath();
                ctx.ellipse(0, 0, 14, 9, 0, 0, Math.PI * 2);
                ctx.fill();

                // Listras brancas se for peixe-palhaço
                if (t === 'peixe_palhaco') {
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(-2, -8, 4, 16);
                }

                // Cauda com ondulação
                ctx.fillStyle = this.type.color;
                ctx.beginPath();
                ctx.moveTo(-10, 0);
                ctx.lineTo(-20, -7 + wig);
                ctx.lineTo(-20, 7 + wig);
                ctx.closePath();
                ctx.fill();

                // Olho brilhante
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(6, -2, 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#000000';
                ctx.beginPath();
                ctx.arc(7, -2, 1.5, 0, Math.PI * 2);
                ctx.fill();
                break;
            }

            case 'agua_viva': {
                // Cúpula / chapéu translúcido pulsante
                const pulse = Math.sin(this.pulsePhase) * 3;
                ctx.fillStyle = 'rgba(224, 170, 255, 0.7)';
                ctx.shadowColor = '#b5179e';
                ctx.shadowBlur = 12;

                ctx.beginPath();
                ctx.arc(0, -2, 16 + pulse, Math.PI, 0, false);
                ctx.closePath();
                ctx.fill();

                // Tentáculos ondulantes
                ctx.strokeStyle = '#e0aaff';
                ctx.lineWidth = 2;
                for (let i = -10; i <= 10; i += 5) {
                    ctx.beginPath();
                    ctx.moveTo(i, 0);
                    ctx.quadraticCurveTo(i + Math.sin(this.animTime + i) * 6, 12, i + Math.cos(this.animTime + i) * 4, 24);
                    ctx.stroke();
                }
                break;
            }

            case 'caranguejo': {
                // Carapaça
                ctx.fillStyle = '#d90429';
                ctx.beginPath();
                ctx.ellipse(0, 0, 16, 10, 0, 0, Math.PI * 2);
                ctx.fill();

                // Garras / Pinças
                ctx.fillStyle = '#ef233c';
                // Garra direita
                ctx.beginPath();
                ctx.arc(14, -8, 6, 0, Math.PI * 2);
                ctx.fill();
                // Garra esquerda
                ctx.beginPath();
                ctx.arc(14, 8, 6, 0, Math.PI * 2);
                ctx.fill();

                // Olhos espetados
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(5, -6, 2.5, 0, Math.PI * 2);
                ctx.arc(5, 6, 2.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#000000';
                ctx.beginPath();
                ctx.arc(6, -6, 1.2, 0, Math.PI * 2);
                ctx.arc(6, 6, 1.2, 0, Math.PI * 2);
                ctx.fill();
                break;
            }

            case 'peixe_lanterna': {
                // Corpo oval escuro abissal
                ctx.fillStyle = '#1b3a4b';
                ctx.beginPath();
                ctx.ellipse(0, 0, 17, 12, 0, 0, Math.PI * 2);
                ctx.fill();

                // Cauda
                ctx.fillStyle = '#212d40';
                ctx.beginPath();
                ctx.moveTo(-14, 0);
                ctx.lineTo(-24, -9);
                ctx.lineTo(-24, 9);
                ctx.closePath();
                ctx.fill();

                // Antena com lanterna bioluminescente brilhante
                ctx.strokeStyle = '#61a5c2';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(6, -8);
                ctx.quadraticCurveTo(14, -18, 16, -14);
                ctx.stroke();

                // Lâmpada incandescente
                ctx.fillStyle = '#ffea00';
                ctx.shadowColor = '#ffea00';
                ctx.shadowBlur = 15;
                ctx.beginPath();
                ctx.arc(16, -14, 4.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;

                // Dentes afiados
                ctx.fillStyle = '#ffffff';
                for (let x = 6; x < 15; x += 3) {
                    ctx.fillRect(x, 2, 1.5, 4);
                }
                break;
            }

            case 'tubarao':
            case 'tubarao_martelo': {
                // Corpo do tubarão aerodinâmico
                ctx.fillStyle = t === 'tubarao_martelo' ? '#3a506b' : '#3a86ff';
                ctx.beginPath();
                ctx.ellipse(0, 0, 34, 15, 0, 0, Math.PI * 2);
                ctx.fill();

                // Barriga mais clara
                ctx.fillStyle = '#e0f2fe';
                ctx.beginPath();
                ctx.ellipse(2, 6, 26, 7, 0, 0, Math.PI);
                ctx.fill();

                // Barbatana dorsal clássica de tubarão
                ctx.fillStyle = t === 'tubarao_martelo' ? '#1c2541' : '#1d4ed8';
                ctx.beginPath();
                ctx.moveTo(-4, -14);
                ctx.lineTo(-14, -30);
                ctx.lineTo(8, -14);
                ctx.closePath();
                ctx.fill();

                // Cauda
                ctx.beginPath();
                ctx.moveTo(-28, 0);
                ctx.lineTo(-44, -18 + wig);
                ctx.lineTo(-38, 0);
                ctx.lineTo(-44, 18 + wig);
                ctx.closePath();
                ctx.fill();

                if (t === 'tubarao_martelo') {
                    // Cabeça em T característica do tubarão-martelo
                    ctx.fillStyle = '#3a506b';
                    ctx.fillRect(26, -18, 10, 36);
                    // Olhos nas pontas do martelo
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.arc(31, -16, 3, 0, Math.PI * 2);
                    ctx.arc(31, 16, 3, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = '#ff0000';
                    ctx.beginPath();
                    ctx.arc(32, -16, 1.5, 0, Math.PI * 2);
                    ctx.arc(32, 16, 1.5, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    // Focinho afiado e olho ameaçador
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.arc(18, -4, 4, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = '#ef233c'; // Olho vermelho predador
                    ctx.beginPath();
                    ctx.arc(20, -4, 2, 0, Math.PI * 2);
                    ctx.fill();

                    // Dentes cerrados
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.moveTo(16, 6);
                    ctx.lineTo(24, 6);
                    ctx.lineTo(20, 10);
                    ctx.closePath();
                    ctx.fill();
                }
                break;
            }

            case 'polvo_gigante': {
                // Cabeça / Manto
                ctx.fillStyle = '#c1121f';
                ctx.beginPath();
                ctx.arc(-4, 0, 22, 0, Math.PI * 2);
                ctx.fill();

                // 8 Tentáculos animados em espiral
                ctx.strokeStyle = '#780000';
                ctx.lineWidth = 4;
                for (let i = 0; i < 8; i++) {
                    const ang = (i / 8) * Math.PI * 2;
                    ctx.beginPath();
                    ctx.moveTo(Math.cos(ang) * 16, Math.sin(ang) * 16);
                    ctx.quadraticCurveTo(
                        Math.cos(ang) * 36 + Math.sin(this.animTime + i) * 12,
                        Math.sin(ang) * 36 + Math.cos(this.animTime + i) * 12,
                        Math.cos(ang) * 48,
                        Math.sin(ang) * 48
                    );
                    ctx.stroke();
                }

                // Olho grande e expressivo
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(6, -6, 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#000000';
                ctx.beginPath();
                ctx.arc(8, -6, 2.5, 0, Math.PI * 2);
                ctx.fill();
                break;
            }

            case 'megalodon': {
                // Predador supremo colossal com cicatrizes
                ctx.fillStyle = '#001e3d';
                ctx.beginPath();
                ctx.ellipse(0, 0, 62, 28, 0, 0, Math.PI * 2);
                ctx.fill();

                // Cicatrizes de batalha
                ctx.strokeStyle = '#ff3366';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(10, -18);
                ctx.lineTo(22, -10);
                ctx.stroke();

                // Barbatana dorsal imensa
                ctx.fillStyle = '#001220';
                ctx.beginPath();
                ctx.moveTo(-10, -25);
                ctx.lineTo(-24, -55);
                ctx.lineTo(16, -25);
                ctx.closePath();
                ctx.fill();

                // Cauda potente
                ctx.beginPath();
                ctx.moveTo(-52, 0);
                ctx.lineTo(-78, -32 + wig * 1.5);
                ctx.lineTo(-65, 0);
                ctx.lineTo(-78, 32 + wig * 1.5);
                ctx.closePath();
                ctx.fill();

                // Mandíbula aberta aterrorizante com dentes triangulares gigantes
                ctx.fillStyle = '#780000';
                ctx.beginPath();
                ctx.arc(36, 6, 14, 0, Math.PI);
                ctx.fill();

                ctx.fillStyle = '#ffffff';
                for (let d = 26; d <= 48; d += 6) {
                    ctx.beginPath();
                    ctx.moveTo(d, 6);
                    ctx.lineTo(d + 3, 14);
                    ctx.lineTo(d + 6, 6);
                    ctx.closePath();
                    ctx.fill();
                }

                // Olho preto vazio assustador com contorno vermelho
                ctx.fillStyle = '#ff0033';
                ctx.beginPath();
                ctx.arc(32, -10, 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#000000';
                ctx.beginPath();
                ctx.arc(33, -10, 3, 0, Math.PI * 2);
                ctx.fill();
                break;
            }

            case 'mosasaurus': {
                // Serpente/Réptil ancestral gigante com nadadeiras
                ctx.fillStyle = '#1d3557';
                ctx.beginPath();
                ctx.ellipse(0, 0, 68, 22, 0, 0, Math.PI * 2);
                ctx.fill();

                // Focinho estilo crocodilo
                ctx.fillStyle = '#14253d';
                ctx.beginPath();
                ctx.moveTo(40, -12);
                ctx.lineTo(76, 2);
                ctx.lineTo(40, 14);
                ctx.closePath();
                ctx.fill();

                // Dentes de réptil afiados
                ctx.fillStyle = '#ffffff';
                for (let t = 42; t <= 70; t += 5) {
                    ctx.fillRect(t, 0, 2, 4);
                }

                // Nadadeiras de remo
                ctx.fillStyle = '#457b9d';
                ctx.beginPath();
                ctx.ellipse(0, 24, 20, 8, 0.4, 0, Math.PI * 2);
                ctx.fill();

                // Cauda de mosassauro ondulante
                ctx.beginPath();
                ctx.moveTo(-58, 0);
                ctx.lineTo(-88, -26 + wig * 2);
                ctx.lineTo(-88, 26 + wig * 2);
                ctx.closePath();
                ctx.fill();
                break;
            }

            case 'abyssal_leviathan': {
                // CHEFÃO SUPREMO LENDÁRIO
                ctx.shadowColor = '#d000ff';
                ctx.shadowBlur = 24;

                // Corpo titânico segmentado
                ctx.fillStyle = '#240046';
                ctx.beginPath();
                ctx.ellipse(0, 0, 88, 38, 0, 0, Math.PI * 2);
                ctx.fill();

                // Cristas bioluminescentes no dorso
                ctx.fillStyle = '#9d4edd';
                for (let c = -60; c <= 40; c += 20) {
                    ctx.beginPath();
                    ctx.moveTo(c, -34);
                    ctx.lineTo(c + 8, -58 + Math.sin(this.animTime + c * 0.1) * 6);
                    ctx.lineTo(c + 18, -34);
                    ctx.closePath();
                    ctx.fill();
                }

                // Olhos múltiplos bioluminescentes
                ctx.fillStyle = '#ff007f';
                [-14, -6, 2].forEach((offsetY, i) => {
                    ctx.beginPath();
                    ctx.arc(52 + i * 8, offsetY, 4, 0, Math.PI * 2);
                    ctx.fill();
                });

                // Mandíbula abissal alienígena
                ctx.fillStyle = '#5a189a';
                ctx.beginPath();
                ctx.moveTo(60, -18);
                ctx.lineTo(105, 0);
                ctx.lineTo(60, 22);
                ctx.closePath();
                ctx.fill();

                // Dentes de cristal luminescentes
                ctx.fillStyle = '#00f7ff';
                for (let j = 62; j < 98; j += 6) {
                    ctx.fillRect(j, -3, 2.5, 6);
                }

                // Cauda com barbatana fóton
                ctx.fillStyle = '#7b2cbf';
                ctx.beginPath();
                ctx.moveTo(-78, 0);
                ctx.lineTo(-115, -45 + wig * 2);
                ctx.lineTo(-115, 45 + wig * 2);
                ctx.closePath();
                ctx.fill();

                ctx.shadowBlur = 0;
                break;
            }

            default: {
                // Renderizador padrão genérico
                ctx.fillStyle = this.type.color;
                ctx.beginPath();
                ctx.ellipse(0, 0, this.radius, this.radius * 0.65, 0, 0, Math.PI * 2);
                ctx.fill();
                break;
            }
        }
    }
}

class CreatureManager {
    constructor() {
        this.creatures = [];
        this.spawnTimer = 0;
        this.spawnInterval = 1.3; // Segundos entre checagens de spawn
        this.bossActive = false;
        this.currentZone = 'reef';
    }

    reset() {
        this.creatures = [];
        this.spawnTimer = 0;
        this.bossActive = false;
        this.currentZone = 'reef';
    }

    setZone(zone) {
        this.currentZone = zone;
    }

    update(dt, player, score, width, height) {
        this.spawnTimer += dt;
        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnTimer = 0;
            this.checkAndSpawn(score, width, height);
        }

        // Atualiza todas as criaturas
        for (let i = this.creatures.length - 1; i >= 0; i--) {
            const c = this.creatures[i];
            c.update(dt, player, width, height, this);

            if (c.dead) {
                if (c.typeId === 'abyssal_leviathan') {
                    this.bossActive = false;
                }
                this.creatures.splice(i, 1);
            }
        }
    }

    checkAndSpawn(score, width, height) {
        // Limite máximo de criaturas na tela para manter fluidez
        const maxCreatures = 14;
        if (this.creatures.length >= maxCreatures) return;

        // Determina pool de criaturas elegíveis com base na pontuação e região
        const pool = [];

        // REEF (0 - 1.000 pts)
        pool.push('peixe_pequeno', 'peixe_palhaco', 'agua_viva', 'caranguejo');
        if (score >= 400) pool.push('peixe_lanterna', 'moreia');

        // DEEP WATERS (1.000 - 5.000 pts)
        if (score >= 1000) {
            pool.push('lula_pequena', 'tubarao', 'tubarao_martelo');
        }
        if (score >= 2500) {
            pool.push('arraia_gigante', 'polvo_gigante', 'lula_gigante');
        }

        // PREHISTORIC ABYSS (5.000 - 10.000 pts)
        if (score >= 5000) {
            pool.push('dunkleosteus', 'megalodon');
        }
        if (score >= 7500) {
            pool.push('mosasaurus');
        }

        // UNKNOWN ZONE (10.000+ pts) - Spawn do Leviathan
        if (score >= 10000 && !this.bossActive && Math.random() < 0.25) {
            this.spawnLeviathan(width, height);
            return;
        }

        // Escolhe criatura aleatória do pool ponderado
        const chosenId = pool[Math.floor(Math.random() * pool.length)];
        this.spawnCreature(chosenId, width, height);
    }

    spawnCreature(typeId, width, height) {
        // Lado de entrada (esquerda ou direita)
        const spawnFromLeft = Math.random() > 0.5;
        const dir = spawnFromLeft ? 1 : -1;
        const x = spawnFromLeft ? -70 : width + 70;

        // Posição Y aleatória dentro da coluna de água
        let y = 80 + Math.random() * (height - 180);

        // Se for caranguejo, aparece no fundo
        if (typeId === 'caranguejo') {
            y = height - 45;
        }

        const creature = new Creature(typeId, x, y, dir);
        this.creatures.push(creature);
        return creature;
    }

    spawnLeviathan(width, height) {
        this.bossActive = true;
        const spawnFromLeft = Math.random() > 0.5;
        const dir = spawnFromLeft ? 1 : -1;
        const x = spawnFromLeft ? -150 : width + 150;
        const y = height * 0.45;

        const boss = new Creature('abyssal_leviathan', x, y, dir);
        this.creatures.push(boss);

        // Alerta sonoro e visual
        if (typeof gameAudio !== 'undefined') {
            gameAudio.playBossRoar();
        }
        if (typeof bulletManager !== 'undefined') {
            bulletManager.addFloatingText('⚠️ ALERTA: ABYSSAL LEVIATHAN DETECTADO!', width / 2, height * 0.25, '#d000ff', 26);
        }
    }

    draw(ctx) {
        for (const c of this.creatures) {
            c.draw(ctx);
        }
    }
}

// Instância global
const creatureManager = new CreatureManager();
