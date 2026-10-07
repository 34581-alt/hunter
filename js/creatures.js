/**
 * DEEP HUNT - Creatures, Bestiary & Enemy AI
 * ==================================================================
 * NOVA IA EM MÁQUINA DE ESTADOS:
 *
 *      IDLE -> ALERT (detecta) -> CHASE -> ATTACK -> RETREAT -> COOLDOWN -> CHASE...
 *
 * Regras principais (balanceamento justo):
 *  - Predadores são MAIS LENTOS que o mergulhador: sempre é possível fugir.
 *  - Cada ataque causa EXATAMENTE 1 hit (1 coração) e só pode ocorrer se o
 *    cooldown individual da criatura estiver zerado.
 *  - Após atacar, a criatura ENTRA EM RECUO obrigatório e cria distância.
 *  - A criatura nunca atravessa, empurra ou fica presa dentro do jogador:
 *    há separação física dura (o jogador NUNCA é empurrado).
 *  - Nada de timers soltos: o estado vive na própria criatura e é congelado
 *    quando o jogo entra em GAME OVER.
 *
 * O desenho dos sprites vive em js/creature-art.js (CreatureArt.draw).
 */

// ===================== CONFIGURAÇÃO DE IA =====================
function AI(o) {
    return Object.assign({
        aggressive: false,
        mode: 'swim',            // 'swim' | 'bottom' | 'hover' | 'static'
        detectRadius: 420,       // alcance de detecção
        loseRadius: 900,         // distância para perder o interesse
        attackRange: 74,         // distância em que inicia o ataque
        windup: 0.35,            // telegrafia antes da investida
        attackDuration: 0.55,    // duração total do estado ATTACK
        lungeSpeedMul: 1.65,     // velocidade da investida
        chaseSpeedMul: 0.92,     // velocidade de perseguição
        retreatSpeedMul: 1.3,    // velocidade de recuo (afasta rápido)
        retreatDistance: 250,    // distância mínima ao fim do recuo
        retreatDuration: 2.0,    // tempo máximo de recuo
        cooldown: 3.0,           // espera após o recuo (segundos)
        alertTime: 0.55,         // tempo de "detecção" antes de perseguir
        turnRate: 2.6,           // rad/s (gira suavemente, sem orbitar estranho)
        accel: 240,
        damage: 1,
        fleeRadius: 150,         // usados por criaturas passivas
        fleeSpeedMul: 1.9,
        animSpeedMul: 1
    }, o);
}

// ===================== BESTIÁRIO =====================
const CREATURE_TYPES = {
    // ============ COMUNS (presas, pouca vida, muitas delas) ============
    peixe_pequeno: {
        id: 'peixe_pequeno', name: 'Peixe Pequeno', tier: 'common', points: 10, hp: 1,
        speed: 92, radius: 16, size: 'small', color: '#9fd0e8', coins: 1,
        ai: AI({ mode: 'swim', fleeRadius: 130, fleeSpeedMul: 2.1 })
    },
    peixe_palhaco: {
        id: 'peixe_palhaco', name: 'Peixe-Palhaço', tier: 'common', points: 15, hp: 1,
        speed: 98, radius: 17, size: 'small', color: '#ff7b1a', coins: 1,
        ai: AI({ mode: 'swim', fleeRadius: 150, fleeSpeedMul: 2.0 })
    },
    baiacu: {
        id: 'baiacu', name: 'Baiacu', tier: 'common', points: 25, hp: 2,
        speed: 62, radius: 15, size: 'small', color: '#f0c453', coins: 1,
        ai: AI({ mode: 'swim', fleeRadius: 170, fleeSpeedMul: 1.4 })
    },
    agua_viva: {
        id: 'agua_viva', name: 'Água-Viva', tier: 'common', points: 15, hp: 2,
        speed: 42, radius: 20, size: 'small', color: '#d99bff', glow: '#e0aaff', coins: 1,
        ai: AI({ mode: 'drift', animSpeedMul: 0.7 })
    },
    caranguejo: {
        id: 'caranguejo', name: 'Caranguejo', tier: 'common', points: 20, hp: 2,
        speed: 44, radius: 18, size: 'small', color: '#c1121f', coins: 1,
        ai: AI({ mode: 'bottom', animSpeedMul: 1.4, fleeRadius: 90 })
    },
    peixe_lanterna: {
        id: 'peixe_lanterna', name: 'Peixe-Lanterna', tier: 'common', points: 35, hp: 2,
        speed: 78, radius: 18, size: 'small', color: '#2a9d8f', glow: '#7ce6ff', coins: 1,
        ai: AI({ mode: 'swim', fleeRadius: 190, fleeSpeedMul: 1.9 })
    },
    lula_pequena: {
        id: 'lula_pequena', name: 'Lula Pequena', tier: 'common', points: 40, hp: 2,
        speed: 112, radius: 18, size: 'small', color: '#ff5c8a', coins: 1,
        ai: AI({ mode: 'swim', fleeRadius: 210, fleeSpeedMul: 2.0 })
    },
    moreia: {
        id: 'moreia', name: 'Moreia', tier: 'common', points: 50, hp: 3,
        speed: 84, radius: 22, size: 'small', color: '#7cae3a', coins: 2,
        ai: AI({ mode: 'swim', fleeRadius: 140, fleeSpeedMul: 1.5 })
    },
    cavalo_marinho: {
        id: 'cavalo_marinho', name: 'Cavalo-Marinho', tier: 'common', points: 30, hp: 1,
        speed: 34, radius: 15, size: 'small', color: '#f5b93c', coins: 1,
        ai: AI({ mode: 'hover', fleeRadius: 90, fleeSpeedMul: 1.3, animSpeedMul: 1.2 })
    },
    estrela_do_mar: {
        id: 'estrela_do_mar', name: 'Estrela-do-Mar', tier: 'common', points: 25, hp: 1,
        speed: 0, radius: 16, size: 'small', color: '#f4794f', coins: 1,
        ai: AI({ mode: 'static', animSpeedMul: 0.6 })
    },
    tartaruga_marinha: {
        id: 'tartaruga_marinha', name: 'Tartaruga Marinha', tier: 'common', points: 90, hp: 4,
        speed: 52, radius: 24, size: 'small', color: '#4b8f6a', coins: 2,
        ai: AI({ mode: 'swim', fleeRadius: 120, fleeSpeedMul: 1.5, animSpeedMul: 0.9 })
    },
    arraia_comum: {
        id: 'arraia_comum', name: 'Arraia', tier: 'common', points: 60, hp: 3,
        speed: 74, radius: 20, size: 'small', color: '#9b8a6f', coins: 2,
        ai: AI({ mode: 'swim', fleeRadius: 160, fleeSpeedMul: 1.6 })
    },

    // ============ PERIGOSAS (predadores com ataque único e recuo) ============
    tubarao: {
        id: 'tubarao', name: 'Tubarão', tier: 'dangerous', points: 100, hp: 6,
        speed: 126, radius: 40, size: 'medium', color: '#5b7f9e', coins: 3,
        ai: AI({
            aggressive: true, detectRadius: 430, loseRadius: 820, attackRange: 86,
            windup: 0.34, attackDuration: 0.5, chaseSpeedMul: 0.95, lungeSpeedMul: 1.55,
            retreatDistance: 260, retreatDuration: 1.9, cooldown: 2.8, alertTime: 0.5,
            turnRate: 2.7, accel: 300
        })
    },
    tubarao_martelo: {
        id: 'tubarao_martelo', name: 'Tubarão-Martelo', tier: 'dangerous', points: 150, hp: 7,
        speed: 132, radius: 40, size: 'medium', color: '#8d9aa6', coins: 3,
        ai: AI({
            aggressive: true, detectRadius: 470, loseRadius: 860, attackRange: 92,
            windup: 0.4, attackDuration: 0.55, chaseSpeedMul: 1.0, lungeSpeedMul: 1.5,
            retreatDistance: 250, retreatDuration: 1.9, cooldown: 2.6, alertTime: 0.45,
            turnRate: 3.1, accel: 330
        })
    },
    moreia_gigante: {
        id: 'moreia_gigante', name: 'Moreia Gigante', tier: 'dangerous', points: 220, hp: 9,
        speed: 118, radius: 44, size: 'medium', color: '#93a52a', coins: 4,
        ai: AI({
            aggressive: true, detectRadius: 390, loseRadius: 780, attackRange: 100,
            windup: 0.45, attackDuration: 0.6, chaseSpeedMul: 0.9, lungeSpeedMul: 1.6,
            retreatDistance: 230, retreatDuration: 2.0, cooldown: 3.2, alertTime: 0.6,
            turnRate: 2.4, accel: 290
        })
    },
    arraia_gigante: {
        id: 'arraia_gigante', name: 'Arraia Manta Gigante', tier: 'dangerous', points: 180, hp: 8,
        speed: 96, radius: 46, size: 'medium', color: '#556f8c', coins: 3,
        ai: AI({
            aggressive: true, detectRadius: 400, loseRadius: 800, attackRange: 96,
            windup: 0.5, attackDuration: 0.6, chaseSpeedMul: 0.88, lungeSpeedMul: 1.45,
            retreatDistance: 240, retreatDuration: 2.2, cooldown: 3.2, alertTime: 0.65,
            turnRate: 2.0, accel: 220
        })
    },
    polvo_gigante: {
        id: 'polvo_gigante', name: 'Polvo Gigante', tier: 'dangerous', points: 200, hp: 10,
        speed: 84, radius: 48, size: 'medium', color: '#8e2f9e', coins: 4,
        ai: AI({
            aggressive: true, detectRadius: 350, loseRadius: 700, attackRange: 104,
            windup: 0.5, attackDuration: 0.6, chaseSpeedMul: 0.92, lungeSpeedMul: 1.5,
            retreatDistance: 270, retreatDuration: 2.3, cooldown: 3.6, alertTime: 0.7,
            turnRate: 1.9, accel: 210
        })
    },
    lula_gigante: {
        id: 'lula_gigante', name: 'Lula Gigante', tier: 'dangerous', points: 350, hp: 14,
        speed: 138, radius: 50, size: 'medium', color: '#c0392b', coins: 5,
        ai: AI({
            aggressive: true, detectRadius: 460, loseRadius: 880, attackRange: 110,
            windup: 0.42, attackDuration: 0.55, chaseSpeedMul: 1.0, lungeSpeedMul: 1.6,
            retreatDistance: 280, retreatDuration: 2.1, cooldown: 3.4, alertTime: 0.5,
            turnRate: 2.2, accel: 260
        })
    },

    // ============ PRÉ-HISTÓRICAS (tanques lentos, ataques telegrafados) ============
    dunkleosteus: {
        id: 'dunkleosteus', name: 'Dunkleosteus', tier: 'prehistoric', points: 600, hp: 20,
        speed: 92, radius: 58, size: 'large', color: '#6d6049', coins: 6,
        ai: AI({
            aggressive: true, detectRadius: 430, loseRadius: 880, attackRange: 108,
            windup: 0.6, attackDuration: 0.7, chaseSpeedMul: 0.9, lungeSpeedMul: 1.45,
            retreatDistance: 300, retreatDuration: 2.4, cooldown: 3.8, alertTime: 0.75,
            turnRate: 1.7, accel: 190
        })
    },
    helicoprion: {
        id: 'helicoprion', name: 'Helicoprion', tier: 'prehistoric', points: 800, hp: 24,
        speed: 98, radius: 54, size: 'large', color: '#948a75', coins: 7,
        ai: AI({
            aggressive: true, detectRadius: 440, loseRadius: 860, attackRange: 100,
            windup: 0.55, attackDuration: 0.65, chaseSpeedMul: 0.95, lungeSpeedMul: 1.45,
            retreatDistance: 280, retreatDuration: 2.3, cooldown: 3.6, alertTime: 0.6,
            turnRate: 2.0, accel: 220
        })
    },
    pliosaurus: {
        id: 'pliosaurus', name: 'Pliosaurus', tier: 'prehistoric', points: 1000, hp: 28,
        speed: 100, radius: 60, size: 'large', color: '#3f6e94', coins: 8,
        ai: AI({
            aggressive: true, detectRadius: 450, loseRadius: 900, attackRange: 112,
            windup: 0.55, attackDuration: 0.68, chaseSpeedMul: 0.92, lungeSpeedMul: 1.45,
            retreatDistance: 300, retreatDuration: 2.3, cooldown: 3.6, alertTime: 0.65,
            turnRate: 1.8, accel: 200
        })
    },
    megalodon: {
        id: 'megalodon', name: 'Megalodon', tier: 'prehistoric', points: 1500, hp: 35,
        speed: 108, radius: 74, size: 'large', color: '#4f7692', coins: 10,
        ai: AI({
            aggressive: true, detectRadius: 500, loseRadius: 960, attackRange: 138,
            windup: 0.62, attackDuration: 0.75, chaseSpeedMul: 0.9, lungeSpeedMul: 1.45,
            retreatDistance: 360, retreatDuration: 2.5, cooldown: 4.0, alertTime: 0.8,
            turnRate: 1.6, accel: 190
        })
    },
    mosasaurus: {
        id: 'mosasaurus', name: 'Mosasaurus', tier: 'prehistoric', points: 2000, hp: 45,
        speed: 112, radius: 78, size: 'large', color: '#3f7d5f', coins: 12,
        ai: AI({
            aggressive: true, detectRadius: 520, loseRadius: 1000, attackRange: 142,
            windup: 0.6, attackDuration: 0.75, chaseSpeedMul: 0.92, lungeSpeedMul: 1.45,
            retreatDistance: 380, retreatDuration: 2.5, cooldown: 4.0, alertTime: 0.75,
            turnRate: 1.7, accel: 200
        })
    },
    livyatan: {
        id: 'livyatan', name: 'Livyatan', tier: 'prehistoric', points: 2500, hp: 55,
        speed: 105, radius: 82, size: 'large', color: '#7f8f9c', coins: 14,
        ai: AI({
            aggressive: true, detectRadius: 540, loseRadius: 1040, attackRange: 150,
            windup: 0.7, attackDuration: 0.8, chaseSpeedMul: 0.9, lungeSpeedMul: 1.4,
            retreatDistance: 400, retreatDuration: 2.6, cooldown: 4.2, alertTime: 0.85,
            turnRate: 1.5, accel: 185
        })
    },

    // ============ ABISSAIS / LENDÁRIAS ============
    void_walker: {
        id: 'void_walker', name: 'Void-Walker', tier: 'legendary', points: 700, hp: 16,
        speed: 104, radius: 34, size: 'medium', color: '#cfe8ee', glow: '#7ef9ff', coins: 6,
        ai: AI({
            aggressive: true, detectRadius: 380, loseRadius: 760, attackRange: 74,
            windup: 0.38, attackDuration: 0.5, chaseSpeedMul: 0.95, lungeSpeedMul: 1.5,
            retreatDistance: 220, retreatDuration: 1.8, cooldown: 3.0, alertTime: 0.4,
            turnRate: 3.0, accel: 320
        })
    },
    deep_sea_nightmare: {
        id: 'deep_sea_nightmare', name: 'Deep-Sea Nightmare', tier: 'legendary', points: 900, hp: 22,
        speed: 88, radius: 40, size: 'medium', color: '#3d1a24', glow: '#d9ff5c', coins: 7,
        ai: AI({
            aggressive: true, detectRadius: 330, loseRadius: 720, attackRange: 96,
            windup: 0.5, attackDuration: 0.6, chaseSpeedMul: 0.9, lungeSpeedMul: 1.5,
            retreatDistance: 240, retreatDuration: 2.1, cooldown: 3.4, alertTime: 0.6,
            turnRate: 2.1, accel: 230
        })
    },
    luminous_jelly_spawn: {
        id: 'luminous_jelly_spawn', name: 'Luminous Jelly-Spawn', tier: 'legendary', points: 500, hp: 12,
        speed: 46, radius: 34, size: 'medium', color: '#5aebff', glow: '#5df2ff', coins: 5,
        ai: AI({ mode: 'drift', animSpeedMul: 0.8 })
    },
    abyssal_leviathan: {
        id: 'abyssal_leviathan', name: 'Abyssal Leviathan', tier: 'legendary', points: 3000, hp: 80,
        speed: 78, radius: 100, size: 'boss', color: '#3d1a70', glow: '#22e6ff', coins: 20,
        boss: true,
        ai: AI({
            aggressive: true, detectRadius: 600, loseRadius: 1200, attackRange: 190,
            windup: 0.8, attackDuration: 0.9, chaseSpeedMul: 0.85, lungeSpeedMul: 1.3,
            retreatDistance: 460, retreatDuration: 2.8, cooldown: 5.0, alertTime: 1.0,
            turnRate: 1.3, accel: 160, damage: 1
        })
    }
};

// ===================== CRIATURA =====================
class Creature {
    constructor(typeId, x, y, dir = 1) {
        this.type = CREATURE_TYPES[typeId] || CREATURE_TYPES.peixe_pequeno;
        this.typeId = this.type.id;
        this.x = x;
        this.y = y;
        this.dir = dir;
        this.radius = this.type.radius;

        this.baseSpeed = this.type.speed;
        this.speed = this.baseSpeed * (0.92 + Math.random() * 0.16);

        // Movimento
        this.vx = dir * this.speed * 0.6;
        this.vy = 0;
        this.heading = dir > 0 ? 0 : Math.PI;

        // Combate
        this.hp = this.type.hp;
        this.maxHp = this.type.hp;
        this.ai = this.type.ai || AI({});
        this.aiState = 'IDLE';
        this.stateTimer = 0;
        this.attackCooldown = 0;
        this.hasHitThisAttack = false;
        this.attackDirX = 0;
        this.attackDirY = 0;
        this.loseTimer = 0;
        this.flinchTimer = 0;

        // Patrulha / território
        this.homeX = x;
        this.homeY = y;
        this.wanderTimer = Math.random() * 2;
        this.wanderAngle = this.heading;
        this.pauseTimer = 0;
        this.orbitSign = Math.random() > 0.5 ? 1 : -1;

        // Animação
        this.animTime = Math.random() * Math.PI * 2;
        this.pulsePhase = Math.random() * Math.PI * 2;
        this.wig = 0;
        this.wigFast = 0;
        this.mouthOpen = 0;
        this.glowPulse = 0.7;
        this.puffed = 0;
        this.hitFlashTimer = 0;
        this.dead = false;

        this.standoff = this.ai.attackRange * 1.12;
        this.minSeparate = 0;
    }

    // ------------------------------------------------------------
    takeDamage(amount = 1) {
        this.hp -= amount;
        this.hitFlashTimer = (typeof ctxSupportsFilter === 'undefined' || ctxSupportsFilter) ? 0.12 : 0;
        this.flinchTimer = 0.35;

        if (typeof gameAudio !== 'undefined') {
            gameAudio.playHit();
        }

        if (this.hp <= 0) {
            this.hp = 0;
            this.dead = true;
            return true;
        }
        return false;
    }

    // ------------------------------------------------------------
    update(dt, player, width, height, onPlayerDamage) {
        // Temporizadores
        if (this.hitFlashTimer > 0) this.hitFlashTimer -= dt;
        if (this.flinchTimer > 0) this.flinchTimer -= dt;
        if (this.attackCooldown > 0) this.attackCooldown -= dt;

        const px = player ? player.x : -99999;
        const py = player ? player.y : -99999;
        const dx = px - this.x;
        const dy = py - this.y;
        const dist = Math.max(0.001, Math.hypot(dx, dy));
        const angToPlayer = Math.atan2(dy, dx);
        const playerAlive = !!player && !player.dead && player.health > 0;

        const env = { player, dx, dy, dist, angToPlayer, playerAlive, width, height, dt, onPlayerDamage };

        if (this.ai.aggressive) {
            this.updatePredator(dt, env);
        } else {
            this.updatePassive(dt, env);
        }

        this.applyPhysics(dt, env);
        this.separateFromOthers(dt);
        this.updateAnimation(dt);
    }

    // ============================================================
    // IA DE PREDADOR: IDLE -> ALERT -> CHASE -> ATTACK -> RETREAT -> COOLDOWN
    // ============================================================
    updatePredator(dt, env) {
        const ai = this.ai;
        const { dist, angToPlayer, playerAlive } = env;

        switch (this.aiState) {
            // ---------------- IDLE ----------------
            case 'IDLE': {
                this.patrol(dt, env, 0.5);
                if (playerAlive && dist < ai.detectRadius) {
                    this.aiState = 'ALERT';
                    this.stateTimer = ai.alertTime;
                    if (typeof gameAudio !== 'undefined' && this.type.tier !== 'common') {
                        gameAudio.playSonar();
                    }
                }
                break;
            }

            // ---------------- DETECT PLAYER ----------------
            case 'ALERT': {
                // Vira para o jogador e freia (telegrafia clara)
                this.steerTowards(angToPlayer, this.baseSpeed * 0.25, dt);
                this.stateTimer -= dt;
                if (!playerAlive || dist > ai.detectRadius * 1.35) {
                    this.aiState = 'IDLE';
                } else if (this.stateTimer <= 0) {
                    this.aiState = 'CHASE';
                    this.loseTimer = 0;
                }
                break;
            }

            // ---------------- CHASE ----------------
            case 'CHASE': {
                if (!playerAlive || dist > ai.loseRadius) {
                    this.loseTimer += dt;
                    if (this.loseTimer > 1.2) {
                        this.aiState = 'IDLE';
                        this.loseTimer = 0;
                    }
                } else {
                    this.loseTimer = 0;
                }

                if (this.attackCooldown <= 0 && dist <= ai.attackRange) {
                    // Inicia ataque (investida em linha reta: dá para desviar)
                    this.aiState = 'ATTACK';
                    this.stateTimer = ai.attackDuration;
                    this.windupTimer = ai.windup;
                    this.hasHitThisAttack = false;
                    this.attackDirX = env.dx / dist;
                    this.attackDirY = env.dy / dist;
                    break;
                }

                // Mantém distância de segurança: nunca cola no jogador
                if (dist > this.standoff) {
                    this.steerTowards(angToPlayer, this.baseSpeed * ai.chaseSpeedMul, dt);
                } else {
                    // orbita mantendo distância (não fica "grudado")
                    const orbit = angToPlayer + this.orbitSign * Math.PI * 0.42;
                    this.steerTowards(orbit, this.baseSpeed * ai.chaseSpeedMul * 0.75, dt);
                    if (Math.random() < dt * 0.6) this.orbitSign *= -1;
                }
                break;
            }

            // ---------------- ATTACK (UM ÚNICO HIT) ----------------
            case 'ATTACK': {
                this.stateTimer -= dt;

                if (this.windupTimer > 0) {
                    // Telegrafia: recua levemente e abre a boca
                    this.windupTimer -= dt;
                    this.steerTowards(angToPlayer, this.baseSpeed * 0.22, dt);
                } else {
                    // Investida em linha reta (sem perseguição grudada)
                    this.steerTowardsRaw(
                        Math.atan2(this.attackDirY, this.attackDirX),
                        this.baseSpeed * ai.lungeSpeedMul,
                        dt,
                        4.5
                    );

                    // Teste de acerto: apenas UM hit por ataque
                    if (!this.hasHitThisAttack && env.playerAlive) {
                        const hitDist = this.radius * 0.86 + env.player.radius + 10;
                        if (dist <= hitDist) {
                            this.hasHitThisAttack = true;
                            const applied = typeof env.onPlayerDamage === 'function'
                                ? env.onPlayerDamage(this, ai.damage || 1)
                                : false;
                            if (applied) {
                                this.onAttackLand();
                            }
                        }
                    }
                }

                // Fim do ataque -> recuo obrigatório
                if (this.stateTimer <= 0) {
                    this.enterRetreat();
                }
                break;
            }

            // ---------------- RETREAT (prioridade máxima perto do jogador) ----------------
            case 'RETREAT': {
                this.stateTimer -= dt;
                // afasta-se rapidamente do jogador
                this.steerTowards(angToPlayer + Math.PI, this.baseSpeed * ai.retreatSpeedMul, dt);

                const farEnough = dist >= ai.retreatDistance;
                if (farEnough || this.stateTimer <= 0) {
                    this.aiState = 'COOLDOWN';
                    this.stateTimer = ai.cooldown;
                    this.attackCooldown = ai.cooldown;
                }
                break;
            }

            // ---------------- COOLDOWN (não causa dano) ----------------
            case 'COOLDOWN': {
                this.stateTimer -= dt;

                if (dist < this.standoff * 1.25) {
                    // Continua criando distância, sem atacar
                    this.steerTowards(angToPlayer + Math.PI, this.baseSpeed * 0.85, dt);
                } else {
                    // Circula devagar observando o jogador
                    const orbit = angToPlayer + this.orbitSign * Math.PI * 0.5;
                    this.steerTowards(orbit, this.baseSpeed * 0.5, dt);
                }

                if (this.stateTimer <= 0) {
                    if (playerAlive && dist < ai.loseRadius) {
                        this.aiState = 'CHASE';
                        this.loseTimer = 0;
                    } else {
                        this.aiState = 'IDLE';
                    }
                }
                break;
            }

            default:
                this.aiState = 'IDLE';
                break;
        }

        // Se, por qualquer motivo, ficar perto demais fora do ataque/recuo -> recua
        if (this.aiState !== 'ATTACK' && this.aiState !== 'RETREAT' && this.aiState !== 'COOLDOWN') {
            if (dist < this.minSafeDistance(env.player)) {
                this.enterRetreat();
            }
        }
    }

    onAttackLand() {
        // Rugido/impacto para criaturas grandes
        if (typeof gameAudio !== 'undefined' && this.type.tier !== 'dangerous') {
            gameAudio.playBossRoar();
        }
        if (typeof bulletManager !== 'undefined') {
            bulletManager.addHitImpact(this.x, this.y, this.type.glow || '#ff3366');
        }
    }

    minSafeDistance(player) {
        const pr = player ? player.radius : 24;
        return pr + this.radius * 0.8;
    }

    enterRetreat() {
        this.aiState = 'RETREAT';
        this.stateTimer = this.ai.retreatDuration;
        this.hasHitThisAttack = true;
    }

    // ============================================================
    // IA PASSIVA (peixes, tartarugas, águas-vivas, caranguejos...)
    // ============================================================
    updatePassive(dt, env) {
        const ai = this.ai;
        const { dist, angToPlayer, playerAlive, width, height } = env;

        if (ai.mode === 'static') {
            this.vx = 0;
            this.vy = 0;
            this.heading = this.dir > 0 ? 0 : Math.PI;
            return;
        }

        if (ai.mode === 'bottom') {
            this.wanderTimer -= dt;
            if (this.wanderTimer <= 0) {
                this.wanderTimer = 2 + Math.random() * 3;
                this.dir = Math.random() > 0.5 ? 1 : -1;
                this.pauseTimer = Math.random() < 0.35 ? 0.8 + Math.random() : 0;
            }
            const moving = this.pauseTimer <= 0;
            if (moving) this.pauseTimer -= dt;
            const target = moving ? (this.dir > 0 ? 0 : Math.PI) : 0;
            this.steerTowards(target, moving ? this.baseSpeed : 0, dt, 3);
            this.y = Math.min(height - 34, Math.max(height - 120, this.y + (height - 44 - this.y) * dt * 1.2));
            return;
        }

        if (ai.mode === 'drift') {
            // Água-viva: pulsos verticais suaves
            this.pulsePhase += dt * 2.2;
            const pulse = Math.sin(this.pulsePhase);
            const desiredX = Math.cos(this.animTime * 0.5) * this.baseSpeed * 0.6;
            const desiredY = pulse > 0 ? -this.baseSpeed * 1.2 : this.baseSpeed * 0.45;
            this.vx += (desiredX - this.vx) * Math.min(1, dt * 1.2);
            this.vy += (desiredY - this.vy) * Math.min(1, dt * 2.2);
            this.heading = -Math.PI / 2 + Math.sin(this.animTime * 0.6) * 0.35;
            return;
        }

        if (ai.mode === 'hover') {
            // Cavalo-marinho: flutua quase parado, sobe/desce
            this.vx += ((Math.cos(this.animTime * 0.4) * this.baseSpeed * 0.5) - this.vx) * Math.min(1, dt * 1.5);
            this.vy += ((Math.sin(this.animTime * 0.9) * this.baseSpeed * 0.9 - 6) - this.vy) * Math.min(1, dt * 1.8);
            this.heading = this.vx > 0 ? 0 : Math.PI;
            return;
        }

        // --- Nado livre: foge do jogador quando ele se aproxima ---
        let fleeing = this.aiState === 'FLEE';
        if (playerAlive) {
            if (!fleeing && dist < ai.fleeRadius) fleeing = true;
            else if (fleeing && dist > ai.fleeRadius * 1.8) fleeing = false;
        } else {
            fleeing = false;
        }
        this.aiState = fleeing ? 'FLEE' : 'IDLE';

        if (fleeing) {
            // foge mantendo a velocidade abaixo da do mergulhador (sempre escapável)
            this.steerTowards(angToPlayer + Math.PI + Math.sin(this.animTime) * 0.22,
                this.baseSpeed * ai.fleeSpeedMul, dt, 4);
            return;
        }

        this.patrol(dt, env, 0.85);
    }

    /** Vagueia pelo cenário (usado por criaturas em IDLE) */
    patrol(dt, env, speedMul) {
        const { width, height } = env;
        this.wanderTimer -= dt;
        if (this.wanderTimer <= 0) {
            this.wanderTimer = 1.6 + Math.random() * 2.6;
            // mantém tendência horizontal de nado + leve variação
            const baseDir = Math.cos(this.heading) >= 0 ? 0 : Math.PI;
            this.wanderAngle = baseDir + (Math.random() - 0.5) * 0.9;
        }

        let target = this.wanderAngle;

        // Retorna para casa se ficou muito longe (território)
        const dxHome = this.homeX - this.x;
        const dyHome = this.homeY - this.y;
        const distHome = Math.hypot(dxHome, dyHome);
        if (distHome > 420) {
            target = Math.atan2(dyHome, dxHome);
        }

        // Desvia das bordas
        const margin = 90;
        if (this.x < margin) target = Math.min(target, 0.6) < target ? target : 0.35;
        if (this.x > width - margin) target = Math.PI - 0.35;
        if (this.y < margin + 30) target = 0.9;
        if (this.y > height - 110) target = -0.9;

        this.steerTowards(target, this.baseSpeed * speedMul, dt, 2.2);
    }

    // ============================================================
    // FÍSICA / MOVIMENTO
    // ============================================================

    /** Gira suavemente a direção e acelera até a velocidade desejada */
    steerTowards(targetAngle, desiredSpeed, dt, turnBoost = 1) {
        this.steerTowardsRaw(targetAngle, desiredSpeed, dt, this.ai.turnRate * turnBoost);
    }

    steerTowardsRaw(targetAngle, desiredSpeed, dt, turnRate) {
        // rotação suave (evita giros instantâneos / órbitas estranhas)
        let delta = targetAngle - this.heading;
        while (delta > Math.PI) delta -= Math.PI * 2;
        while (delta < -Math.PI) delta += Math.PI * 2;
        const maxTurn = turnRate * dt;
        if (delta > maxTurn) delta = maxTurn;
        else if (delta < -maxTurn) delta = -maxTurn;
        this.heading += delta;

        // aceleração
        const targetVx = Math.cos(this.heading) * desiredSpeed;
        const targetVy = Math.sin(this.heading) * desiredSpeed;
        const accel = this.ai.accel * (this.flinchTimer > 0 ? 0.4 : 1) * dt;
        const dvx = targetVx - this.vx;
        const dvy = targetVy - this.vy;
        const dLen = Math.hypot(dvx, dvy);
        if (dLen > accel && dLen > 0.001) {
            this.vx += (dvx / dLen) * accel;
            this.vy += (dvy / dLen) * accel;
        } else {
            this.vx = targetVx;
            this.vy = targetVy;
        }
    }

    applyPhysics(dt, env) {
        const { width, height } = env;

        // Limita a velocidade máxima (nunca supera o dobro da velocidade base)
        const maxSpeed = this.baseSpeed * 2.0;
        const sp = Math.hypot(this.vx, this.vy);
        if (sp > maxSpeed) {
            this.vx = (this.vx / sp) * maxSpeed;
            this.vy = (this.vy / sp) * maxSpeed;
        }

        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // Direção visual do sprite acompanha o movimento
        if (sp > 6) {
            this.heading = Math.atan2(this.vy, this.vx);
        }
        this.dir = Math.cos(this.heading) >= 0 ? 1 : -1;

        // Separação DURA do jogador: a criatura nunca fica dentro dele e
        // NUNCA empurra o mergulhador (apenas ela mesma é reposicionada).
        const player = env.player;
        if (player && player.radius !== undefined) {
            const sep = this.minSafeDistance(player) * (this.aiState === 'ATTACK' ? 0.72 : 1);
            const dx = this.x - player.x;
            const dy = this.y - player.y;
            const d = Math.hypot(dx, dy);
            if (d < sep && d > 0.0001) {
                const push = (sep - d);
                this.x += (dx / d) * push;
                this.y += (dy / d) * push;
            } else if (d <= 0.0001) {
                this.x += sep;
            }
        }

        // Limites da tela
        const inCombat = this.ai.aggressive &&
            (this.aiState === 'CHASE' || this.aiState === 'ATTACK' || this.aiState === 'ALERT');
        const m = inCombat ? 46 : 120;
        if (this.x < -m) this.x = -m;
        if (this.x > width + m) this.x = width + m;
        if (this.y < 54) { this.y = 54; this.vy = Math.abs(this.vy) * 0.4; }
        if (this.y > height - 70) { this.y = height - 70; this.vy = -Math.abs(this.vy) * 0.4; }

        // Remove criaturas que saíram de cena (fora de combate)
        const off = 260;
        if (!inCombat) {
            if (this.x < -off || this.x > width + off || this.y < -off || this.y > height + off) {
                this.dead = true;
            }
        }
    }

    /** Repulsão leve entre criaturas: evita empilhamento/colagem em grupo */
    separateFromOthers(dt) {
        if (typeof creatureManager === 'undefined' || !creatureManager.creatures) return;
        const list = creatureManager.creatures;
        for (let i = 0; i < list.length; i++) {
            const o = list[i];
            if (o === this) continue;
            const dx = this.x - o.x;
            const dy = this.y - o.y;
            const minD = (this.radius + o.radius) * 0.82;
            const d2 = dx * dx + dy * dy;
            if (d2 < minD * minD && d2 > 0.01) {
                const d = Math.sqrt(d2);
                const push = (minD - d) * 0.5;
                this.x += (dx / d) * push;
                this.y += (dy / d) * push;
            }
        }
    }

    updateAnimation(dt) {
        const speedNow = Math.hypot(this.vx, this.vy);
        const factor = Math.max(0.35, Math.min(2.2, speedNow / Math.max(30, this.baseSpeed)));
        this.animTime += dt * (2.6 + 3.4 * factor) * (this.ai.animSpeedMul || 1);

        this.wig = Math.sin(this.animTime) * (3.5 + 3 * factor);
        this.wigFast = Math.sin(this.animTime * 2.2);

        // Boca: abre ao atacar/perseguir
        let target = 0.06;
        if (this.aiState === 'ATTACK') target = 1;
        else if (this.aiState === 'CHASE') target = this.type.tier === 'common' ? 0.1 : 0.42;
        else if (this.aiState === 'ALERT') target = 0.3;
        this.mouthOpen += (target - this.mouthOpen) * Math.min(1, dt * 6);

        this.glowPulse = 0.6 + 0.4 * Math.sin(this.animTime * 1.6);

        // Baiacu infla quando o jogador se aproxima
        if (this.typeId === 'baiacu') {
            const near = this.aiState === 'FLEE' ? 1 : 0;
            this.puffed += (near - this.puffed) * Math.min(1, dt * 2.4);
        }
    }

    // ============================================================
    // RENDER
    // ============================================================
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        // Espelhamento + rotação conforme a direção do nado
        const a = this.heading;
        const flip = Math.abs(a) > Math.PI / 2;
        if (flip) {
            ctx.scale(1, -1);
            ctx.rotate(-(Math.PI - a));
        } else {
            ctx.rotate(a);
        }

        // Flash branco de dano (quando suportado)
        if (this.hitFlashTimer > 0 && ctxSupportsFilter) {
            ctx.filter = 'brightness(2.4) saturate(0.6)';
        }

        if (typeof CreatureArt !== 'undefined') {
            CreatureArt.draw(ctx, this);
        } else {
            this.renderBodyFallback(ctx);
        }

        if (this.hitFlashTimer > 0 && ctxSupportsFilter) {
            ctx.filter = 'none';
        }
        ctx.restore();

        // Barra de vida para criaturas maiores (apenas quando feridas)
        if (this.type.tier !== 'common' && this.hp < this.maxHp) {
            this.drawHealthBar(ctx);
        }

        // Indicador de estado (apenas em criaturas agressivas, sutil)
        if (this.ai.aggressive && (this.aiState === 'ALERT' || this.aiState === 'COOLDOWN')) {
            this.drawStatePip(ctx);
        }
    }

    drawHealthBar(ctx) {
        const barWidth = Math.max(36, this.radius * 1.3);
        const barHeight = 5;
        const barX = this.x - barWidth / 2;
        const barY = this.y - this.radius - 14;

        ctx.save();
        ctx.fillStyle = 'rgba(2, 11, 23, 0.85)';
        ctx.fillRect(barX - 1, barY - 1, barWidth + 2, barHeight + 2);
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.8)';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX - 1, barY - 1, barWidth + 2, barHeight + 2);

        const pct = Math.max(0, this.hp / this.maxHp);
        ctx.fillStyle = pct > 0.5 ? '#ff3366' : '#ff0033';
        ctx.fillRect(barX, barY, barWidth * pct, barHeight);
        ctx.restore();
    }

    /** Pequeno sinal visual: "!" ao detectar / relógio durante o cooldown */
    drawStatePip(ctx) {
        ctx.save();
        ctx.font = 'bold 13px Outfit, sans-serif, system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const y = this.y - this.radius - 26;
        if (this.aiState === 'ALERT') {
            ctx.globalAlpha = 0.75 + Math.sin(this.animTime * 8) * 0.25;
            ctx.fillStyle = '#ffd700';
            ctx.strokeStyle = 'rgba(2,11,23,0.9)';
            ctx.lineWidth = 3;
            ctx.strokeText('!', this.x, y);
            ctx.fillText('!', this.x, y);
        }
        ctx.restore();
    }

    renderBodyFallback(ctx) {
        const c = this.type.color || '#7fd4ef';
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.ellipse(0, 0, this.radius, this.radius * 0.65, 0, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ===================== GERENCIADOR =====================
class CreatureManager {
    constructor() {
        this.creatures = [];
        this.spawnTimer = 0;
        this.spawnInterval = 1.35;
        this.bossActive = false;
        this.currentZone = 'reef';
        this.frozen = false;
        this.playerX = -9999;
        this.playerY = -9999;
    }

    reset() {
        this.creatures = [];
        this.spawnTimer = 0;
        this.bossActive = false;
        this.frozen = false;
        this.currentZone = 'reef';
    }

    setZone(zone) {
        this.currentZone = zone;
    }

    /** Congela toda a IA (usado em GAME OVER / morte do jogador) */
    freezeAll() {
        this.frozen = true;
        for (const c of this.creatures) {
            c.vx = 0;
            c.vy = 0;
            if (c.aiState === 'CHASE' || c.aiState === 'ATTACK' || c.aiState === 'ALERT') {
                c.aiState = 'COOLDOWN';
                c.stateTimer = 999;
            }
        }
    }

    getAggressiveCount() {
        let n = 0;
        for (const c of this.creatures) if (c.ai.aggressive) n++;
        return n;
    }

    update(dt, player, score, width, height, onPlayerDamage) {
        this.playerX = player ? player.x : -9999;
        this.playerY = player ? player.y : -9999;

        if (!this.frozen) {
            this.spawnTimer += dt;
            if (this.spawnTimer >= this.spawnInterval) {
                this.spawnTimer = 0;
                this.checkAndSpawn(score, width, height);
            }
        }

        // Atualiza todas as criaturas
        for (let i = this.creatures.length - 1; i >= 0; i--) {
            const c = this.creatures[i];

            if (!this.frozen) {
                c.update(dt, player, width, height, onPlayerDamage);
            } else {
                // Congelado: apenas animação residual zero, nada de IA/colisão
                c.vx = 0;
                c.vy = 0;
            }

            if (c.dead) {
                if (c.typeId === 'abyssal_leviathan') this.bossActive = false;
                this.creatures.splice(i, 1);
            }
        }
    }

    checkAndSpawn(score, width, height) {
        const maxCreatures = 14;
        if (this.creatures.length >= maxCreatures) return;

        // ---- pool por progressão ----
        const pool = [];
        pool.push('peixe_pequeno', 'peixe_palhaco', 'agua_viva', 'caranguejo');
        if (score >= 250) pool.push('baiacu', 'estrela_do_mar');
        if (score >= 400) pool.push('peixe_lanterna', 'moreia');
        if (score >= 600) pool.push('cavalo_marinho', 'tartaruga_marinha');
        if (score >= 800) pool.push('arraia_comum');
        if (score >= 1000) pool.push('lula_pequena', 'tubarao', 'tubarao_martelo');
        if (score >= 1800) pool.push('moreia_gigante');
        if (score >= 2500) pool.push('arraia_gigante', 'polvo_gigante', 'lula_gigante');
        if (score >= 4000) pool.push('pliosaurus');
        if (score >= 5000) pool.push('dunkleosteus', 'megalodon');
        if (score >= 6500) pool.push('helicoprion');
        if (score >= 7500) pool.push('mosasaurus');
        if (score >= 9000) pool.push('livyatan');

        // Zona desconhecida: criaturas abissais + chefe
        if (score >= 10000) {
            pool.push('void_walker', 'deep_sea_nightmare', 'luminous_jelly_spawn');
            if (!this.bossActive && Math.random() < 0.22) {
                this.spawnLeviathan(width, height);
                return;
            }
        }

        // Dá mais peso a criaturas perigosas conforme a pontuação sobe,
        // mas mantém presas comuns no cardápio.
        if (score >= 1000) pool.push('tubarao', 'tubarao_martelo');
        if (score >= 2500) pool.push('lula_gigante', 'polvo_gigante');
        if (score >= 5000) pool.push('megalodon');
        if (score >= 7500) pool.push('mosasaurus', 'pliosaurus');

        const chosenId = pool[Math.floor(Math.random() * pool.length)];
        const type = CREATURE_TYPES[chosenId];
        if (!type) return;

        // Limite de predadores simultâneos (evita "massacre" injusto)
        if (type.ai && type.ai.aggressive) {
            const maxAggressive = Math.min(5, 2 + Math.floor(score / 3000));
            if (this.getAggressiveCount() >= maxAggressive) {
                // troca por uma criatura comum
                this.spawnCreature('peixe_pequeno', width, height);
                return;
            }
            // Não spawna predador já colado no jogador
            if (this.playerX > 0) {
                const spawnRight = this.playerX < width * 0.5;
                if (Math.abs(this.playerX - (spawnRight ? width : 0)) < 260) return;
            }
        }

        this.spawnCreature(chosenId, width, height);
    }

    spawnCreature(typeId, width, height) {
        const type = CREATURE_TYPES[typeId] || CREATURE_TYPES.peixe_pequeno;
        const spawnFromLeft = Math.random() > 0.5;
        const dir = spawnFromLeft ? 1 : -1;
        const x = spawnFromLeft ? -70 : width + 70;

        let y = 100 + Math.random() * (height - 240);
        if (type.ai && type.ai.mode === 'bottom') y = height - 46;
        if (type.ai && type.ai.mode === 'static') y = height - 26;
        if (typeId === 'abyssal_leviathan') y = height * 0.45;

        const creature = new Creature(typeId, x, y, dir);
        creature.homeX = x < width / 2 ? 60 + Math.random() * width * 0.35 : width - 60 - Math.random() * width * 0.35;
        creature.homeY = y;
        this.creatures.push(creature);
        return creature;
    }

    spawnLeviathan(width, height) {
        this.bossActive = true;
        const spawnFromLeft = Math.random() > 0.5;
        const dir = spawnFromLeft ? 1 : -1;
        const x = spawnFromLeft ? -180 : width + 180;
        const y = height * 0.45;

        const boss = new Creature('abyssal_leviathan', x, y, dir);
        this.creatures.push(boss);

        if (typeof gameAudio !== 'undefined') gameAudio.playBossRoar();
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

// Detecção de suporte a ctx.filter (usado no flash de dano)
let ctxSupportsFilter = (function () {
    try {
        const cv = document.createElement('canvas');
        const cx = cv.getContext('2d');
        cx.filter = 'brightness(2)';
        return cx.filter === 'brightness(2)';
    } catch (e) {
        return false;
    }
})();

// Instância global
const creatureManager = new CreatureManager();
