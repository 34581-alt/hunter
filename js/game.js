/**
 * DEEP HUNT - Game Engine
 * Loop principal, renderização do oceano em camadas de parallax, física de colisões,
 * progressão de regiões, combos e controles (PC + Mobile).
 */

class GameEngine {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');

        // Dimensões lógicas
        this.width = 1280;
        this.height = 720;

        // Estado do jogo: 'MENU', 'PLAYING', 'PAUSED', 'GAMEOVER'
        this.state = 'MENU';

        // Entidades
        this.player = new Player(this.width / 2, this.height / 2);
        this.ambientBubbles = [];

        // Pontuação e Combos
        this.score = 0;
        this.comboKills = 0;
        this.comboMultiplier = 1;
        this.comboTimer = 0;
        this.maxComboTimer = 3.8; // Segundos para sustentar o combo
        this.maxComboReached = 1;

        // Estatísticas da partida
        this.creaturesKilled = 0;
        this.gameTimeSeconds = 0;
        this.largestCreatureName = 'Nenhuma';

        // Região atual do oceano
        this.currentZone = 'reef'; // 'reef', 'deep', 'abyss', 'unknown'

        // Screen Shake
        this.screenShakeTime = 0;
        this.screenShakeIntensity = 0;

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

        // Inicialização
        this.initResize();
        this.initInputs();
        this.initAmbientParticles();
        this.setupButtons();

        // Criaturas calmas para animação inicial de fundo no Menu
        for (let i = 0; i < 4; i++) {
            const types = ['peixe_pequeno', 'peixe_palhaco', 'agua_viva'];
            const t = types[i % types.length];
            const c = creatureManager.spawnCreature(t, this.width, this.height);
            c.x = Math.random() * this.width;
        }

        // Inicia o loop
        requestAnimationFrame((t) => this.loop(t));
    }

    initResize() {
        const resize = () => {
            const container = document.getElementById('game-container');
            const cw = container.clientWidth;
            const ch = container.clientHeight;

            // Mantém aspecto 16:9 arcade nítido
            this.canvas.width = this.width;
            this.canvas.height = this.height;
        };

        window.addEventListener('resize', resize);
        resize();
    }

    initInputs() {
        // Teclado
        window.addEventListener('keydown', (e) => {
            this.input.keys[e.code] = true;

            // ESC para pausar/despausar
            if (e.code === 'Escape' && (this.state === 'PLAYING' || this.state === 'PAUSED')) {
                this.togglePause();
            }
        });

        window.addEventListener('keyup', (e) => {
            this.input.keys[e.code] = false;
        });

        // Mouse no Canvas
        const updateMousePos = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            this.input.mouseX = (e.clientX - rect.left) * scaleX;
            this.input.mouseY = (e.clientY - rect.top) * scaleY;
        };

        this.canvas.addEventListener('mousemove', updateMousePos);

        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // Botão esquerdo
                this.input.isMouseDown = true;
                if (this.state === 'PLAYING') {
                    this.player.tryShoot();
                }
            }
        });

        window.addEventListener('mouseup', (e) => {
            if (e.button === 0) {
                this.input.isMouseDown = false;
            }
        });

        // Controles de Toque (Mobile / Tablet)
        this.initTouchControls();
    }

    initTouchControls() {
        const touchZone = document.getElementById('touch-controls');
        const joystickBase = document.getElementById('virtual-joystick');
        const joystickStick = document.getElementById('joystick-stick');
        const shootBtn = document.getElementById('mobile-shoot-btn');

        if (!touchZone || !joystickBase || !shootBtn) return;

        // Detecta se dispositivo suporta touch
        const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        if (isTouch) {
            touchZone.classList.remove('hidden');
        }

        // Variáveis de controle do joystick virtual
        let joyTouchId = null;
        let joyCenter = { x: 0, y: 0 };
        const maxDist = 45;

        joystickBase.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.changedTouches[0];
            joyTouchId = touch.identifier;
            const rect = joystickBase.getBoundingClientRect();
            joyCenter = {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2
            };
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

        // Botão de tiro touch
        shootBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.input.isMouseDown = true;
            if (this.state === 'PLAYING') {
                this.player.tryShoot();
            }
        }, { passive: false });

        shootBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.input.isMouseDown = false;
        }, { passive: false });
    }

    setupButtons() {
        // Botão JOGAR no menu
        const btnPlay = document.getElementById('menu-play-btn');
        if (btnPlay) {
            btnPlay.addEventListener('click', () => this.startGame());
        }

        // Botões de abertura de modais no menu
        document.getElementById('menu-ranking-btn')?.addEventListener('click', () => gameUI.showModal('ranking-modal'));
        document.getElementById('menu-skins-btn')?.addEventListener('click', () => gameUI.showModal('skins-modal'));
        document.getElementById('menu-missions-btn')?.addEventListener('click', () => gameUI.showModal('missions-modal'));
        document.getElementById('menu-guide-btn')?.addEventListener('click', () => gameUI.showModal('guide-modal'));
        document.getElementById('menu-settings-btn')?.addEventListener('click', () => gameUI.showModal('settings-modal'));

        // Botão de pausa no HUD
        document.getElementById('hud-pause-btn')?.addEventListener('click', () => this.togglePause());

        // Botões do modal de pausa
        document.getElementById('pause-resume-btn')?.addEventListener('click', () => this.togglePause());
        document.getElementById('pause-restart-btn')?.addEventListener('click', () => this.startGame());
        document.getElementById('pause-menu-btn')?.addEventListener('click', () => this.returnToMenu());

        // Botões da tela de Game Over
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
        for (let i = 0; i < 35; i++) {
            const p = new BubbleParticle(Math.random() * this.width, Math.random() * this.height, true);
            this.ambientBubbles.push(p);
        }
    }

    // ================= FLUXO DA PARTIDA =================

    startGame() {
        // Inicializa o contexto de áudio na primeira interação
        gameAudio.initContext();
        gameAudio.startMusic();

        this.state = 'PLAYING';
        this.score = 0;
        this.comboKills = 0;
        this.comboMultiplier = 1;
        this.comboTimer = 0;
        this.maxComboReached = 1;
        this.creaturesKilled = 0;
        this.gameTimeSeconds = 0;
        this.largestCreatureName = 'Nenhuma';
        this.currentZone = 'reef';

        // Reseta entidades
        this.player.reset(this.width / 2, this.height / 2);
        bulletManager.reset();
        creatureManager.reset();
        creatureManager.setZone('reef');
        gameAudio.setZone('reef');

        // Atualiza telas
        gameUI.hideMainMenu();
        if (gameUI.gameOverScreen) gameUI.gameOverScreen.classList.add('hidden');
        if (gameUI.pauseScreen) gameUI.pauseScreen.classList.add('hidden');

        // Anúncio da primeira região
        gameUI.showZoneAnnouncement('Recife');
    }

    togglePause() {
        if (this.state === 'PLAYING') {
            this.state = 'PAUSED';
            if (gameUI.pauseScreen) gameUI.pauseScreen.classList.remove('hidden');
        } else if (this.state === 'PAUSED') {
            this.state = 'PLAYING';
            if (gameUI.pauseScreen) gameUI.pauseScreen.classList.add('hidden');
        }
    }

    returnToMenu() {
        this.state = 'MENU';
        gameAudio.setZone('reef');
        gameUI.showMainMenu();
    }

    triggerGameOver() {
        this.state = 'GAMEOVER';
        gameAudio.playGameOver();

        // Atualiza ranking e estatísticas no storage
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

        // Checa missões
        const m1 = gameStorage.setMissionProgress('first_dive', this.creaturesKilled);
        const m2 = gameStorage.setMissionProgress('score_1k', this.score);
        const m3 = gameStorage.setMissionProgress('score_10k', this.score);
        const m4 = gameStorage.setMissionProgress('combo_x5', this.maxComboReached);

        [m1, m2, m3, m4].forEach(m => {
            if (m) gameUI.showToast('Missão Cumprida!', m.title, '🏆');
        });

        // Mostra a tela de Game Over
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
            gameAudio.setZone(newZone);
            gameAudio.playSonar();
            gameUI.showZoneAnnouncement(zoneTitle);

            // Verifica desbloqueios de skins por pontuação
            const newSkins = gameStorage.checkSkinUnlocksByScore(this.score);
            newSkins.forEach(skinName => {
                gameUI.showToast('Nova Skin Desbloqueada!', skinName, '👨🚀');
            });
        }
    }

    registerKill(creature) {
        this.creaturesKilled += 1;

        // Incrementa combo
        this.comboKills += 1;
        this.comboTimer = this.maxComboTimer;

        // Determina novo multiplicador
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

        // Calcula pontuação com multiplicador de combo
        const earnedPoints = creature.type.points * this.comboMultiplier;
        this.score += earnedPoints;

        // Registra maior criatura derrotada
        this.largestCreatureName = creature.type.name;

        // Efeitos visuais
        bulletManager.addCreatureDefeatFX(creature.x, creature.y, creature.type.size);
        bulletManager.addFloatingText(`+${earnedPoints}`, creature.x, creature.y - 15, '#ffe600', creature.type.tier === 'common' ? 18 : 24);

        // Chance de drop de moeda
        if (Math.random() < 0.4 || creature.type.tier !== 'common') {
            bulletManager.spawnCoin(creature.x, creature.y, 50);
        }

        // Som de derrota
        gameAudio.playDefeat(creature.type.tier);

        // Atualiza missões específicas
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

        // Checa transição de região
        this.checkZoneProgression();
    }

    // ================= LOOP PRINCIPAL =================

    loop(currentTime) {
        const dt = Math.min((currentTime - this.lastTime) / 1000, 0.1);
        this.lastTime = currentTime;

        this.update(dt);
        this.render();

        requestAnimationFrame((t) => this.loop(t));
    }

    update(dt) {
        // Atualiza partículas de água ambientes
        for (const p of this.ambientBubbles) {
            p.update(dt);
            if (p.dead) {
                p.x = Math.random() * this.width;
                p.y = this.height + 15;
                p.dead = false;
                p.life = p.maxLife;
            }
        }

        // Animação de fundo no Menu Principal com criaturas passando suavemente
        if (this.state === 'MENU') {
            const dummyPlayer = { x: -9999, y: -9999, vx: 0, vy: 0, radius: 0 };
            creatureManager.update(dt, dummyPlayer, 0, this.width, this.height);
            return;
        }

        if (this.state !== 'PLAYING') return;

        this.gameTimeSeconds += dt;

        // Disparo contínuo se segurar o botão
        if (this.input.isMouseDown) {
            this.player.tryShoot();
        }

        // Atualiza combo timer
        if (this.comboTimer > 0) {
            this.comboTimer -= dt;
            if (this.comboTimer <= 0) {
                this.comboKills = 0;
                this.comboMultiplier = 1;
            }
        }

        // Atualiza Player
        this.player.update(dt, this.input, this.width, this.height);

        // Atualiza Criaturas
        creatureManager.update(dt, this.player, this.score, this.width, this.height);

        // Atualiza Tiros e Partículas
        bulletManager.update(dt, this.player, (coin) => {
            this.score += coin.value;
            gameAudio.playCoin();
            bulletManager.addFloatingText(`+${coin.value}`, coin.x, coin.y, '#ffd700', 16);
            this.checkZoneProgression();
        });

        // Detecta Colisões: Tiros vs Criaturas
        for (let bIdx = bulletManager.bullets.length - 1; bIdx >= 0; bIdx--) {
            const bullet = bulletManager.bullets[bIdx];
            for (let cIdx = creatureManager.creatures.length - 1; cIdx >= 0; cIdx--) {
                const creature = creatureManager.creatures[cIdx];
                const dist = Math.hypot(bullet.x - creature.x, bullet.y - creature.y);

                if (dist < bullet.radius + creature.radius) {
                    // Colisão confirmada
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

        // Detecta Colisões: Criaturas vs Player
        for (const creature of creatureManager.creatures) {
            const dist = Math.hypot(this.player.x - creature.x, this.player.y - creature.y);
            if (dist < this.player.radius + creature.radius * 0.75) {
                const tookDamage = this.player.takeDamage();
                if (tookDamage) {
                    this.screenShakeTime = 0.25;
                    this.screenShakeIntensity = 7;
                    if (this.player.health <= 0) {
                        this.triggerGameOver();
                        break;
                    }
                }
            }
        }

        // Atualiza Screen Shake
        if (this.screenShakeTime > 0) {
            this.screenShakeTime -= dt;
        }

        // Atualiza HUD
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
            maxComboTimer: this.maxComboTimer
        });
    }

    // ================= RENDERIZAÇÃO =================

    render() {
        this.ctx.save();

        // Aplica tremor de tela em caso de dano
        if (this.screenShakeTime > 0) {
            const ox = (Math.random() - 0.5) * this.screenShakeIntensity;
            const oy = (Math.random() - 0.5) * this.screenShakeIntensity;
            this.ctx.translate(ox, oy);
        }

        // 1. Fundo do Oceano e Gradiente de Profundidade
        this.drawOceanBackground();

        // 2. Camadas de Parallax: Ruínas subaquáticas e silhuetas
        this.drawParallaxScenery();

        // 3. Partículas de água ambientes
        for (const p of this.ambientBubbles) {
            p.draw(this.ctx);
        }

        // 4. Criaturas Marinhas
        creatureManager.draw(this.ctx);

        // 5. Moedas, Tiros e Efeitos Visuais
        bulletManager.draw(this.ctx);

        // 6. Mergulhador
        if (this.state === 'PLAYING' || this.state === 'PAUSED') {
            this.player.draw(this.ctx);
            this.drawCrosshair();
        }

        this.ctx.restore();
    }

    drawOceanBackground() {
        // Paletas de fundo por região
        const zoneGradients = {
            reef: ['#0077b6', '#023e8a', '#03045e'],
            deep: ['#023e8a', '#0b1354', '#010526'],
            abyss: ['#0b1354', '#0d1137', '#020310'],
            unknown: ['#240046', '#10002b', '#030008']
        };

        const colors = zoneGradients[this.currentZone] || zoneGradients.reef;
        const grad = this.ctx.createLinearGradient(0, 0, 0, this.height);
        grad.addColorStop(0, colors[0]);
        grad.addColorStop(0.55, colors[1]);
        grad.addColorStop(1, colors[2]);

        this.ctx.fillStyle = grad;
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Raios de sol na superfície (caustics)
        this.ctx.save();
        this.ctx.globalAlpha = 0.08;
        this.ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 7; i++) {
            const x = (i * 200 + Math.sin(this.lastTime * 0.001 + i) * 60);
            this.ctx.beginPath();
            this.ctx.moveTo(x - 50, 0);
            this.ctx.lineTo(x + 50, 0);
            this.ctx.lineTo(x + 160, this.height);
            this.ctx.lineTo(x - 10, this.height);
            this.ctx.closePath();
            this.ctx.fill();
        }
        this.ctx.restore();
    }

    drawParallaxScenery() {
        const time = this.lastTime * 0.001;

        // Camada 1: Silhuetas distantes de colunas e naufrágios
        this.ctx.fillStyle = 'rgba(2, 12, 35, 0.45)';
        // Coluna Atlante 1
        this.ctx.fillRect(180, this.height - 240, 45, 240);
        this.ctx.fillRect(165, this.height - 255, 75, 18);
        // Coluna Atlante 2
        this.ctx.fillRect(880, this.height - 300, 50, 300);
        this.ctx.fillRect(860, this.height - 315, 90, 18);
        // Naufrágio silhueta
        this.ctx.beginPath();
        this.ctx.moveTo(480, this.height - 80);
        this.ctx.lineTo(580, this.height - 180);
        this.ctx.lineTo(660, this.height - 170);
        this.ctx.lineTo(720, this.height - 80);
        this.ctx.closePath();
        this.ctx.fill();

        // Camada 2: Corais e vegetação ondulante no solo marítimo
        this.ctx.fillStyle = this.currentZone === 'unknown' ? '#3c096c' : '#041c32';
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.height);
        for (let x = 0; x <= this.width; x += 40) {
            const h = 45 + Math.sin(x * 0.015 + time) * 15;
            this.ctx.lineTo(x, this.height - h);
        }
        this.ctx.lineTo(this.width, this.height);
        this.ctx.closePath();
        this.ctx.fill();

        // Plantas marinhas e algas ondulantes
        this.ctx.strokeStyle = this.currentZone === 'unknown' ? 'rgba(157, 78, 221, 0.6)' : 'rgba(0, 180, 216, 0.5)';
        this.ctx.lineWidth = 4;
        for (let i = 60; i < this.width; i += 120) {
            this.ctx.beginPath();
            this.ctx.moveTo(i, this.height - 20);
            this.ctx.quadraticCurveTo(
                i + Math.sin(time * 2 + i) * 22,
                this.height - 80,
                i + Math.cos(time * 1.5 + i) * 15,
                this.height - 140
            );
            this.ctx.stroke();
        }
    }

    drawCrosshair() {
        const mx = this.input.mouseX;
        const my = this.input.mouseY;

        this.ctx.save();
        this.ctx.translate(mx, my);

        // Anel da mira
        this.ctx.strokeStyle = '#00f7ff';
        this.ctx.shadowColor = '#00f7ff';
        this.ctx.shadowBlur = 8;
        this.ctx.lineWidth = 1.8;

        this.ctx.beginPath();
        this.ctx.arc(0, 0, 12, 0, Math.PI * 2);
        this.ctx.stroke();

        // Traços cardeais da mira
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

        // Ponto central
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
