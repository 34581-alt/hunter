/**
 * DEEP HUNT - Game Engine
 * ==================================================================
 * Loop principal, cenário submarino em camadas (EnvironmentRenderer),
 * colisões, progressão de regiões, combos e controles (PC + Mobile).
 *
 * FLUXO DE ESTADOS (corrigido):
 *
 *   MENU -> PLAYING <-> PAUSED
 *              |
 *              v  (vida chega a 0)
 *            DYING  -> (congela IA, desliga dano, controles off)
 *              |
 *              v
 *           GAMEOVER -> (tela aparece SEMPRE, jogo nunca trava)
 *              |
 *              v
 *           startGame() = reset completo (5 corações, IA, spawns)
 */
class GameEngine {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');

        // Dimensões lógicas
        this.width = 1280;
        this.height = 720;

        // Estado do jogo: 'MENU', 'PLAYING', 'PAUSED', 'DYING', 'GAMEOVER'
        this.state = 'MENU';

        // Entidades
        this.player = new Player(this.width / 2, this.height / 2);
        this.ambientBubbles = [];

        // Cenário submarino em camadas (novo)
        this.environment = new EnvironmentRenderer(this.width, this.height);

        // Pontuação e Combos
        this.score = 0;
        this.comboKills = 0;
        this.comboMultiplier = 1;
        this.comboTimer = 0;
        this.maxComboTimer = 3.8;
        this.maxComboReached = 1;

        // Estatísticas da partida
        this.creaturesKilled = 0;
        this.gameTimeSeconds = 0;
        this.largestCreatureName = 'Nenhuma';
        this.largestCreaturePoints = -1;

        // Região atual do oceano
        this.currentZone = 'reef';

        // Screen Shake
        this.screenShakeTime = 0;
        this.screenShakeIntensity = 0;

        // Morte / Game Over
        this.deathTimer = 0;
        this.deathDuration = 1.2;
        this.deathFade = 0;
        this.gameOverPending = false;
        this.errorCount = 0;

        // Controles e Inputs
        this.input = {
            keys: {},
            mouseX: this.width / 2,
            mouseY: this.height / 2,
            isMouseDown: false,
            joystick: { active: false, x: 0, y: 0 }
        };

        // Timestamp para delta time
        this.lastTime = performance.now();
        this.lastDt = 0.016;

        // Inicialização
        this.initResize();
        this.initInputs();
        this.initAmbientParticles();
        this.setupButtons();
        this.initVisibilityHandling();

        // Criaturas calmas para animação de fundo no Menu
        for (let i = 0; i < 4; i++) {
            const types = ['peixe_pequeno', 'peixe_palhaco', 'agua_viva', 'tartaruga_marinha'];
            const t = types[i % types.length];
            const c = creatureManager.spawnCreature(t, this.width, this.height);
            c.x = Math.random() * this.width;
        }

        // Inicia o loop (agendado dentro do próprio loop, sempre primeiro)
        this.loopId = requestAnimationFrame((t) => this.loop(t));
    }

    initResize() {
        const resize = () => {
            this.canvas.width = this.width;
            this.canvas.height = this.height;
        };
        window.addEventListener('resize', resize);
        resize();
    }

    initVisibilityHandling() {
        // Evita "saltos" de delta time e mortes injustas quando a aba perde foco
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.lastTime = performance.now();
                if (this.state === 'PLAYING') this.togglePause(true);
            }
        });
        window.addEventListener('blur', () => {
            this.lastTime = performance.now();
        });
    }

    initInputs() {
        window.addEventListener('keydown', (e) => {
            this.input.keys[e.code] = true;

            if (e.code === 'Escape' && (this.state === 'PLAYING' || this.state === 'PAUSED')) {
                this.togglePause();
            }
        });

        window.addEventListener('keyup', (e) => {
            this.input.keys[e.code] = false;
        });

        const updateMousePos = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            this.input.mouseX = (e.clientX - rect.left) * scaleX;
            this.input.mouseY = (e.clientY - rect.top) * scaleY;
        };

        this.canvas.addEventListener('mousemove', updateMousePos);

        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) {
                this.input.isMouseDown = true;
                if (this.state === 'PLAYING') {
                    this.player.tryShoot();
                }
            }
        });

        window.addEventListener('mouseup', (e) => {
            if (e.button === 0) this.input.isMouseDown = false;
        });

        this.initTouchControls();
    }

    initTouchControls() {
        const touchZone = document.getElementById('touch-controls');
        const joystickBase = document.getElementById('virtual-joystick');
        const joystickStick = document.getElementById('joystick-stick');
        const shootBtn = document.getElementById('mobile-shoot-btn');

        if (!touchZone || !joystickBase || !shootBtn) return;

        const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        if (isTouch) touchZone.classList.remove('hidden');

        let joyTouchId = null;
        let joyCenter = { x: 0, y: 0 };
        const maxDist = 45;

        joystickBase.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.changedTouches[0];
            joyTouchId = touch.identifier;
            const rect = joystickBase.getBoundingClientRect();
            joyCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
            this.input.joystick.active = true;
        }, { passive: false });

        window.addEventListener('touchmove', (e) => {
            if (joyTouchId === null) return;
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                if (touch.identifier === joyTouchId) {
                    const dx = touch.clientX - joyCenter.x;
                    const dy = touch.clientY - joyCenter.y;
                    const dist = Math.hypot(dx, dy);
                    const clampedDist = Math.min(dist, maxDist);
                    const angle = Math.atan2(dy, dx);
                    const stickX = Math.cos(angle) * clampedDist;
                    const stickY = Math.sin(angle) * clampedDist;
                    joystickStick.style.transform = `translate(${stickX}px, ${stickY}px)`;
                    this.input.joystick.x = (dx / maxDist);
                    this.input.joystick.y = (dy / maxDist);
                    break;
                }
            }
        }, { passive: false });

        const endJoystick = (e) => {
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === joyTouchId) {
                    joyTouchId = null;
                    this.input.joystick.active = false;
                    this.input.joystick.x = 0;
                    this.input.joystick.y = 0;
                    joystickStick.style.transform = 'translate(0px, 0px)';
                    break;
                }
            }
        };

        window.addEventListener('touchend', endJoystick);
        window.addEventListener('touchcancel', endJoystick);

        shootBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.input.isMouseDown = true;
            if (this.state === 'PLAYING') this.player.tryShoot();
        }, { passive: false });

        shootBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.input.isMouseDown = false;
        }, { passive: false });
    }

    setupButtons() {
        document.getElementById('menu-play-btn')?.addEventListener('click', () => this.startGame());

        document.getElementById('menu-ranking-btn')?.addEventListener('click', () => gameUI.showModal('ranking-modal'));
        document.getElementById('menu-skins-btn')?.addEventListener('click', () => gameUI.showModal('skins-modal'));
        document.getElementById('menu-missions-btn')?.addEventListener('click', () => gameUI.showModal('missions-modal'));
        document.getElementById('menu-guide-btn')?.addEventListener('click', () => gameUI.showModal('guide-modal'));
        document.getElementById('menu-settings-btn')?.addEventListener('click', () => gameUI.showModal('settings-modal'));

        document.getElementById('hud-pause-btn')?.addEventListener('click', () => this.togglePause());

        document.getElementById('pause-resume-btn')?.addEventListener('click', () => this.togglePause());
        document.getElementById('pause-restart-btn')?.addEventListener('click', () => this.startGame());
        document.getElementById('pause-menu-btn')?.addEventListener('click', () => this.returnToMenu());

        // Reinício a partir da tela de Game Over (funciona sempre)
        document.getElementById('go-restart-btn')?.addEventListener('click', () => {
            this.saveCurrentPlayerName();
            this.startGame();
        });
        document.getElementById('go-menu-btn')?.addEventListener('click', () => {
            this.saveCurrentPlayerName();
            this.returnToMenu();
        });
    }

    saveCurrentPlayerName() {
        const nameInput = document.getElementById('go-player-name');
        if (nameInput && nameInput.value.trim() !== '') {
            gameStorage.setPlayerName(nameInput.value.trim());
        }
    }

    initAmbientParticles() {
        this.ambientBubbles = [];
        for (let i = 0; i < 30; i++) {
            const p = new BubbleParticle(Math.random() * this.width, Math.random() * this.height, true);
            this.ambientBubbles.push(p);
        }
    }

    // ================= FLUXO DA PARTIDA =================

    startGame() {
        gameAudio.initContext();
        gameAudio.startMusic();

        // ---- Reset TOTAL de estado (nada de sobras da partida anterior) ----
        this.state = 'PLAYING';
        this.score = 0;
        this.comboKills = 0;
        this.comboMultiplier = 1;
        this.comboTimer = 0;
        this.maxComboReached = 1;
        this.creaturesKilled = 0;
        this.gameTimeSeconds = 0;
        this.largestCreatureName = 'Nenhuma';
        this.largestCreaturePoints = -1;
        this.currentZone = 'reef';
        this.screenShakeTime = 0;
        this.screenShakeIntensity = 0;
        this.deathTimer = 0;
        this.deathFade = 0;
        this.gameOverPending = false;
        this.errorCount = 0;
        this.lastTime = performance.now();

        // Entidades
        this.player.reset(this.width / 2, this.height / 2);
        bulletManager.reset();
        creatureManager.reset();          // <- também descongela a IA
        creatureManager.setZone('reef');
        gameAudio.setZone('reef');
        this.environment.setZone('reef');

        // Timers de UI herdados de outras telas
        if (typeof gameUI.clearPendingTimers === 'function') gameUI.clearPendingTimers();

        // Telas
        gameUI.hideMainMenu();
        gameUI.setGameOverVisible(false);
        gameUI.setPauseVisible(false);
        gameUI.updateHUD({
            score: 0,
            health: this.player.health,
            maxHealth: this.player.maxHealth,
            timeSeconds: 0,
            ammo: this.player.ammo,
            maxAmmo: this.player.maxAmmo,
            isReloading: false,
            combo: 1,
            comboTimer: 0,
            maxComboTimer: this.maxComboTimer
        });

        gameUI.showZoneAnnouncement('Recife');
        this.input.isMouseDown = false;
        this.input.joystick.active = false;
    }

    /** Alterna pausa. forcePause=true garante pausar (usado ao perder o foco da aba). */
    togglePause(forcePause = false) {
        if (this.state === 'PLAYING') {
            this.state = 'PAUSED';
            this.input.isMouseDown = false;
            gameUI.setPauseVisible(true);
        } else if (this.state === 'PAUSED' && !forcePause) {
            this.state = 'PLAYING';
            this.lastTime = performance.now();   // evita salto de delta time
            gameUI.setPauseVisible(false);
        }
    }

    returnToMenu() {
        this.state = 'MENU';
        creatureManager.reset();
        bulletManager.reset();
        this.player.reset(this.width / 2, this.height / 2);
        this.environment.setZone('reef');
        gameAudio.setZone('reef');
        if (typeof gameUI.clearPendingTimers === 'function') gameUI.clearPendingTimers();
        gameUI.setGameOverVisible(false);
        gameUI.setPauseVisible(false);
        gameUI.showMainMenu();

        // Repovoando o cenário do menu com criaturas calmas
        for (let i = 0; i < 5; i++) {
            const types = ['peixe_pequeno', 'peixe_palhaco', 'agua_viva', 'tartaruga_marinha', 'peixe_lanterna'];
            const c = creatureManager.spawnCreature(types[i % types.length], this.width, this.height);
            c.x = Math.random() * this.width;
        }
    }

    // ================= MORTE E GAME OVER =================

    /**
     * Aplica dano ao jogador vindo de um ataque de criatura.
     * Só funciona durante o estado PLAYING (colisões de dano desativadas
     * automaticamente em DYING/GAMEOVER/PAUSED/MENU).
     */
    applyPlayerDamage(creature, amount = 1) {
        if (this.state !== 'PLAYING') return false;
        if (!this.player || this.player.dead || this.player.health <= 0) return false;

        const applied = this.player.takeDamage(creature ? creature.x : undefined,
            creature ? creature.y : undefined);

        if (applied) {
            this.screenShakeTime = 0.28;
            this.screenShakeIntensity = 8;

            if (this.player.health <= 0) {
                this.beginPlayerDeath();
            } else {
                // Atualiza o HUD imediatamente (coração perdido aparece na hora)
                this.pushHUD();
            }
        }
        return applied;
    }

    /** Entra no estado DYING: congela tudo e prepara a tela de Game Over */
    beginPlayerDeath() {
        if (this.state === 'DYING' || this.state === 'GAMEOVER') return;

        this.state = 'DYING';
        this.deathTimer = this.deathDuration;
        this.deathFade = 0;
        this.gameOverPending = true;

        // 1) controles desativados
        this.input.isMouseDown = false;
        this.input.joystick.active = false;

        // 2) IA das criaturas interrompida/congelada
        creatureManager.freezeAll();

        // 3) colisões de dano desativadas (state != PLAYING + guardas)
        // 4) nenhum novo dano pode ser aplicado
        this.screenShakeTime = 0.45;
        this.screenShakeIntensity = 11;

        gameAudio.stopMusic();
        gameAudio.playGameOver();

        this.pushHUD();
    }

    /** Fim da transição: mostra a tela de Game Over (executado UMA única vez) */
    finishGameOver() {
        if (this.state === 'GAMEOVER') return;
        this.state = 'GAMEOVER';
        this.gameOverPending = false;

        // Estatísticas / ranking / missões
        const isHighScore = gameStorage.isHighScore(this.score);
        const playerName = gameStorage.getPlayerName();
        gameStorage.saveScore(this.score, playerName);

        gameStorage.recordGameFinished({
            score: this.score,
            creaturesKilled: this.creaturesKilled,
            maxCombo: this.maxComboReached,
            largestCreature: this.largestCreatureName,
            timeSeconds: Math.floor(this.gameTimeSeconds)
        });

        const m1 = gameStorage.setMissionProgress('first_dive', this.creaturesKilled);
        const m2 = gameStorage.setMissionProgress('score_1k', this.score);
        const m3 = gameStorage.setMissionProgress('score_10k', this.score);
        const m4 = gameStorage.setMissionProgress('combo_x5', this.maxComboReached);

        [m1, m2, m3, m4].forEach(m => {
            if (m) gameUI.showToast('Missão Cumprida!', m.title, '🏆');
        });

        // Tela de Game Over (sempre exibida, com botão de reiniciar operante)
        gameUI.setPauseVisible(false);
        gameUI.showGameOver({
            score: this.score,
            highScore: gameStorage.getBestScore(),
            isNewRecord: isHighScore,
            creaturesKilled: this.creaturesKilled,
            maxCombo: this.maxComboReached
        });
    }

    // ================= PROGRESSÃO E COMBOS =================

    checkZoneProgression() {
        let newZone = 'reef';
        let zoneTitle = 'Recife';

        if (this.score >= 10000) {
            newZone = 'unknown';
            zoneTitle = 'Zona Desconhecida';
        } else if (this.score >= 5000) {
            newZone = 'abyss';
            zoneTitle = 'Abismo Pré-Histórico';
        } else if (this.score >= 1000) {
            newZone = 'deep';
            zoneTitle = 'Águas Profundas';
        }

        if (newZone !== this.currentZone) {
            this.currentZone = newZone;
            creatureManager.setZone(newZone);
            this.environment.setZone(newZone);   // <- novo cenário da região
            gameAudio.setZone(newZone);
            gameAudio.playSonar();
            gameUI.showZoneAnnouncement(zoneTitle);

            const newSkins = gameStorage.checkSkinUnlocksByScore(this.score);
            newSkins.forEach(skinName => {
                gameUI.showToast('Nova Skin Desbloqueada!', skinName, '👨🚀');
            });
        }
    }

    registerKill(creature) {
        this.creaturesKilled += 1;

        this.comboKills += 1;
        this.comboTimer = this.maxComboTimer;

        let newMultiplier = 1;
        if (this.comboKills >= 50) newMultiplier = 5;
        else if (this.comboKills >= 30) newMultiplier = 4;
        else if (this.comboKills >= 15) newMultiplier = 3;
        else if (this.comboKills >= 5) newMultiplier = 2;

        if (newMultiplier > this.comboMultiplier) {
            gameAudio.playCombo(newMultiplier);
        }
        this.comboMultiplier = newMultiplier;
        if (this.comboMultiplier > this.maxComboReached) {
            this.maxComboReached = this.comboMultiplier;
        }

        const earnedPoints = creature.type.points * this.comboMultiplier;
        this.score += earnedPoints;

        if (creature.type.points > this.largestCreaturePoints) {
            this.largestCreaturePoints = creature.type.points;
            this.largestCreatureName = creature.type.name;
        }

        bulletManager.addCreatureDefeatFX(creature.x, creature.y, creature.type.size);
        bulletManager.addFloatingText(`+${earnedPoints}`, creature.x, creature.y - 15, '#ffe600',
            creature.type.tier === 'common' ? 18 : 24);

        if (Math.random() < 0.4 || creature.type.tier !== 'common') {
            bulletManager.spawnCoin(creature.x, creature.y, 50);
        }

        gameAudio.playDefeat(creature.type.tier);

        if (creature.typeId === 'tubarao' || creature.typeId === 'tubarao_martelo') {
            const m = gameStorage.updateMissionProgress('shark_slayer', 1);
            if (m) gameUI.showToast('Missão Cumprida!', m.title, '🦈');
        }
        if (creature.type.tier === 'prehistoric') {
            const m = gameStorage.updateMissionProgress('prehistoric_hunter', 1);
            if (m) gameUI.showToast('Missão Cumprida!', m.title, '🦴');
        }
        if (creature.typeId === 'abyssal_leviathan') {
            const m = gameStorage.updateMissionProgress('defeat_leviathan', 1);
            if (m) gameUI.showToast('Missão Cumprida!', m.title, '👾');
        }

        this.checkZoneProgression();
    }

    // ================= LOOP PRINCIPAL =================

    loop(currentTime) {
        // O próximo frame é SEMPRE agendado antes de qualquer cálculo:
        // assim nenhum erro pontual consegue "matar" o loop do jogo.
        this.loopId = requestAnimationFrame((t) => this.loop(t));

        let dt = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;
        if (!isFinite(dt) || dt < 0) dt = 0.016;
        dt = Math.min(dt, 0.05);              // proteção contra saltos (trocas de aba)
        this.lastDt = dt;

        try {
            this.update(dt);
        } catch (err) {
            this.handleRuntimeError(err, 'update');
        }

        try {
            this.render();
        } catch (err) {
            this.handleRuntimeError(err, 'render');
        }
    }

    /** Rede de segurança: um erro de frame não pode travar o jogo */
    handleRuntimeError(err, phase) {
        if (window.console) console.error(`[DEEP HUNT] erro em ${phase}:`, err);
        this.errorCount++;
        if (this.errorCount > 90 && this.state !== 'GAMEOVER' && this.state !== 'MENU') {
            // Estado seguro: permite ao jogador reiniciar em vez de travar
            this.state = 'GAMEOVER';
            try { gameUI.showGameOver({
                score: this.score,
                highScore: gameStorage.getBestScore(),
                isNewRecord: false,
                creaturesKilled: this.creaturesKilled,
                maxCombo: this.maxComboReached
            }); } catch (e) { /* silencioso */ }
        }
    }

    update(dt) {
        // Partículas de água ambientes (sempre animadas, em qualquer tela)
        for (const p of this.ambientBubbles) {
            p.update(dt);
            if (p.dead) {
                p.x = Math.random() * this.width;
                p.y = this.height + 15;
                p.dead = false;
                p.life = p.maxLife;
            }
        }

        // ---------- MENU ----------
        if (this.state === 'MENU') {
            const dummyPlayer = { x: -9999, y: -9999, vx: 0, vy: 0, radius: 0, dead: true, health: 0 };
            creatureManager.update(dt, dummyPlayer, 0, this.width, this.height, null);
            return;
        }

        // ---------- PAUSA ----------
        if (this.state === 'PAUSED') return;

        // ---------- MORTE (transição para o Game Over) ----------
        if (this.state === 'DYING') {
            this.deathTimer -= dt;
            this.deathFade = Math.min(1, this.deathFade + dt * 1.1);

            // Jogador afunda, sem controles, sem dano
            this.player.update(dt, this.input, this.width, this.height, false);
            // Criaturas congeladas (nenhuma IA, nenhum ataque)
            creatureManager.update(dt, this.player, this.score, this.width, this.height, null);
            bulletManager.updateVisualsOnly(dt);

            if (this.screenShakeTime > 0) this.screenShakeTime -= dt;

            if (this.deathTimer <= 0) {
                this.finishGameOver();
            }
            return;
        }

        // ---------- GAME OVER (cena congelada + efeitos) ----------
        if (this.state === 'GAMEOVER') {
            bulletManager.updateVisualsOnly(dt);
            if (this.screenShakeTime > 0) this.screenShakeTime -= dt;
            return;
        }

        if (this.state !== 'PLAYING') return;

        // ===================== GAMEPLAY =====================
        this.gameTimeSeconds += dt;

        if (this.input.isMouseDown) {
            this.player.tryShoot();
        }

        // Combo
        if (this.comboTimer > 0) {
            this.comboTimer -= dt;
            if (this.comboTimer <= 0) {
                this.comboKills = 0;
                this.comboMultiplier = 1;
            }
        }

        // Jogador
        this.player.update(dt, this.input, this.width, this.height, true);

        // Criaturas (IA + ataques -> dano ao jogador com hit único)
        creatureManager.update(dt, this.player, this.score, this.width, this.height,
            (creature, amount) => this.applyPlayerDamage(creature, amount));

        // Se o jogador morreu durante a IA, o update termina aqui
        if (this.state !== 'PLAYING') return;

        // Tiros, partículas e moedas
        bulletManager.update(dt, this.player, (coin) => {
            this.score += coin.value;
            gameAudio.playCoin();
            bulletManager.addFloatingText(`+${coin.value}`, coin.x, coin.y, '#ffd700', 16);
            this.checkZoneProgression();
        });

        // Colisões: Tiros vs Criaturas
        for (let bIdx = bulletManager.bullets.length - 1; bIdx >= 0; bIdx--) {
            const bullet = bulletManager.bullets[bIdx];
            for (let cIdx = creatureManager.creatures.length - 1; cIdx >= 0; cIdx--) {
                const creature = creatureManager.creatures[cIdx];
                const dist = Math.hypot(bullet.x - creature.x, bullet.y - creature.y);

                if (dist < bullet.radius + creature.radius * 0.9) {
                    bullet.dead = true;
                    bulletManager.addHitImpact(bullet.x, bullet.y, bullet.color);

                    const died = creature.takeDamage(bullet.damage);
                    if (died) {
                        this.registerKill(creature);
                    }
                    break;
                }
            }
        }

        // Colisões de CONTATO: apenas águas-vivas ferroam (com cooldown individual).
        // Predadores causam dano exclusivamente pelo estado ATTACK (1 hit por ataque).
        for (const creature of creatureManager.creatures) {
            if (!creature || creature.dead) continue;
            const mode = creature.ai ? creature.ai.mode : 'swim';
            if (mode !== 'drift') continue;
            if (creature.attackCooldown > 0) continue;

            const dist = Math.hypot(this.player.x - creature.x, this.player.y - creature.y);
            if (dist < this.player.radius + creature.radius * 0.7) {
                const applied = this.applyPlayerDamage(creature, 1);
                if (applied) {
                    creature.attackCooldown = 2.6;   // cooldown individual do ferrão
                }
                if (this.state !== 'PLAYING') return;
            }
        }

        if (this.screenShakeTime > 0) this.screenShakeTime -= dt;

        this.pushHUD();
    }

    pushHUD() {
        gameUI.updateHUD({
            score: this.score,
            health: this.player.health,
            maxHealth: this.player.maxHealth,
            timeSeconds: this.gameTimeSeconds,
            ammo: this.player.ammo,
            maxAmmo: this.player.maxAmmo,
            isReloading: this.player.isReloading,
            combo: this.comboMultiplier,
            comboTimer: this.comboTimer,
            maxComboTimer: this.maxComboTimer,
            zone: this.currentZone
        });
    }

    // ================= RENDERIZAÇÃO =================

    render() {
        const ctx = this.ctx;
        ctx.save();

        // Tremor de tela
        if (this.screenShakeTime > 0) {
            const ox = (Math.random() - 0.5) * this.screenShakeIntensity;
            const oy = (Math.random() - 0.5) * this.screenShakeIntensity;
            ctx.translate(ox, oy);
        }

        const playerAlive = this.state === 'PLAYING' || this.state === 'PAUSED' ||
            this.state === 'DYING' || this.state === 'GAMEOVER';

        // 1) CENÁRIO: água, navio naufragado, rochas, areia, corais,
        //    algas balançando, neve marinha e raios de luz
        this.environment.drawBack(ctx, this.lastDt, playerAlive ? this.player : null);

        // 2) Partículas de água ambientes
        for (const p of this.ambientBubbles) {
            p.draw(ctx);
        }

        // 3) Criaturas marinhas
        creatureManager.draw(ctx);

        // 4) Moedas, tiros e efeitos
        bulletManager.draw(ctx);

        // 5) Mergulhador + mira
        if (playerAlive) {
            this.player.draw(ctx);
            if (this.state === 'PLAYING') this.drawCrosshair();
        }

        // 6) Primeiro plano: faixa inferior, vinheta de profundidade
        this.environment.drawFront(ctx);

        // 7) Overlays de dano/morte
        if (this.player.hurtFlashTimer > 0) {
            this.environment.drawDamageOverlay(ctx, Math.min(1, this.player.hurtFlashTimer / 0.45));
        }
        if (this.state === 'DYING' || this.state === 'GAMEOVER') {
            this.environment.drawDeathOverlay(ctx, this.deathFade);
        }

        ctx.restore();
    }

    drawCrosshair() {
        const mx = this.input.mouseX;
        const my = this.input.mouseY;

        this.ctx.save();
        this.ctx.translate(mx, my);

        this.ctx.strokeStyle = '#00f7ff';
        this.ctx.shadowColor = '#00f7ff';
        this.ctx.shadowBlur = 8;
        this.ctx.lineWidth = 1.8;

        this.ctx.beginPath();
        this.ctx.arc(0, 0, 12, 0, Math.PI * 2);
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.moveTo(-18, 0);
        this.ctx.lineTo(-7, 0);
        this.ctx.moveTo(7, 0);
        this.ctx.lineTo(18, 0);
        this.ctx.moveTo(0, -18);
        this.ctx.lineTo(0, -7);
        this.ctx.moveTo(0, 7);
        this.ctx.lineTo(0, 18);
        this.ctx.stroke();

        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 2, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.restore();
    }
}

// Inicializa o jogo ao carregar a janela
window.addEventListener('DOMContentLoaded', () => {
    window.game = new GameEngine();
});
