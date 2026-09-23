/**
 * DEEP HUNT - UI & Menu Controller Module
 * Controla os elementos do HUD (Pontuação, Vidas, Tempo, Arma, Combo), modais e telas de menu
 */

class UIManager {
    constructor() {
        // Elementos do HUD
        this.scoreDisplay = document.getElementById('hud-score');
        this.heartsDisplay = document.getElementById('hud-hearts');
        this.timeDisplay = document.getElementById('hud-timer');
        this.ammoDisplay = document.getElementById('hud-ammo');
        this.comboContainer = document.getElementById('hud-combo-container');
        this.comboText = document.getElementById('hud-combo-text');
        this.comboBar = document.getElementById('hud-combo-bar');
        this.zoneBanner = document.getElementById('zone-banner');
        this.toastContainer = document.getElementById('toast-container');

        // Modais / Telas
        this.mainMenuScreen = document.getElementById('main-menu-screen');
        this.pauseScreen = document.getElementById('pause-modal');
        this.gameOverScreen = document.getElementById('game-over-modal');

        // Sub-modais de menu
        this.skinsModal = document.getElementById('skins-modal');
        this.rankingModal = document.getElementById('ranking-modal');
        this.missionsModal = document.getElementById('missions-modal');
        this.guideModal = document.getElementById('guide-modal');
        this.settingsModal = document.getElementById('settings-modal');

        // Controles de áudio no menu
        this.soundToggleBtn = document.getElementById('menu-sound-toggle');

        this.initEventListeners();
    }

    initEventListeners() {
        // Toggle de som no menu inicial
        if (this.soundToggleBtn) {
            this.soundToggleBtn.addEventListener('click', () => {
                const isEnabled = gameAudio.toggleSound();
                this.updateSoundToggleUI(isEnabled);
            });
            this.updateSoundToggleUI(gameAudio.soundEnabled);
        }

        // Delegação de fechamento de modais com botão [X] ou data-close
        document.querySelectorAll('[data-close-modal]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modalId = btn.getAttribute('data-close-modal');
                this.closeModal(modalId);
            });
        });

        // Fecha modais ao clicar no fundo escuro
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.classList.add('hidden');
                }
            });
        });
    }

    updateSoundToggleUI(enabled) {
        if (!this.soundToggleBtn) return;
        this.soundToggleBtn.classList.toggle('active', enabled);
        this.soundToggleBtn.innerHTML = enabled ? '🔊 SOM: LIGADO' : '🔈 SOM: DESLIGADO';
    }

    showMainMenu() {
        if (this.mainMenuScreen) this.mainMenuScreen.classList.remove('hidden');
        if (this.gameOverScreen) this.gameOverScreen.classList.add('hidden');
        if (this.pauseScreen) this.pauseScreen.classList.add('hidden');
    }

    hideMainMenu() {
        if (this.mainMenuScreen) this.mainMenuScreen.classList.add('hidden');
    }

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
            if (modalId === 'skins-modal') this.renderSkinsGrid();
            if (modalId === 'ranking-modal') this.renderRankingList();
            if (modalId === 'missions-modal') this.renderMissionsList();
            if (modalId === 'settings-modal') this.renderSettings();
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.add('hidden');
    }

    // ================= HUD UPDATES =================

    updateHUD({ score, health, maxHealth, timeSeconds, ammo, maxAmmo, isReloading, combo, comboTimer, maxComboTimer }) {
        // Pontuação formatada com separador de milhar (ex: 2.450)
        if (this.scoreDisplay) {
            this.scoreDisplay.textContent = score.toLocaleString('pt-BR');
        }

        // Vidas ❤️ ❤️ ❤️
        if (this.heartsDisplay) {
            let heartsStr = '';
            for (let i = 0; i < maxHealth; i++) {
                heartsStr += i < health ? '❤️ ' : '🖤 ';
            }
            this.heartsDisplay.innerHTML = heartsStr.trim();
        }

        // Cronômetro (03:12)
        if (this.timeDisplay) {
            const mins = Math.floor(timeSeconds / 60).toString().padStart(2, '0');
            const secs = Math.floor(timeSeconds % 60).toString().padStart(2, '0');
            this.timeDisplay.textContent = `${mins}:${secs}`;
        }

        // Munição da Arma (8/∞ ou RECARREGANDO...)
        if (this.ammoDisplay) {
            if (isReloading) {
                this.ammoDisplay.textContent = 'REC...';
                this.ammoDisplay.style.color = '#ff9e00';
            } else {
                this.ammoDisplay.textContent = `${ammo}/∞`;
                this.ammoDisplay.style.color = '#00f7ff';
            }
        }

        // Combo
        if (this.comboContainer) {
            if (combo > 1) {
                this.comboContainer.classList.remove('hidden');
                if (this.comboText) this.comboText.textContent = `COMBO x${combo}`;
                if (this.comboBar) {
                    const pct = Math.max(0, Math.min(100, (comboTimer / maxComboTimer) * 100));
                    this.comboBar.style.width = `${pct}%`;
                }
            } else {
                this.comboContainer.classList.add('hidden');
            }
        }
    }

    // Banner de transição de região
    showZoneAnnouncement(zoneName) {
        if (!this.zoneBanner) return;
        this.zoneBanner.textContent = `ENTRANDO EM: ${zoneName.toUpperCase()}`;
        this.zoneBanner.classList.remove('hidden');
        this.zoneBanner.classList.add('animate-banner');

        setTimeout(() => {
            this.zoneBanner.classList.remove('animate-banner');
            this.zoneBanner.classList.add('hidden');
        }, 3000);
    }

    // Notificação Toast de Missão / Skin
    showToast(title, message, icon = '🎯') {
        if (!this.toastContainer) return;
        const toast = document.createElement('div');
        toast.className = 'toast-item';
        toast.innerHTML = `
            <div class="toast-icon">${icon}</div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-desc">${message}</div>
            </div>
        `;
        this.toastContainer.appendChild(toast);

        // Som de conquista
        if (typeof gameAudio !== 'undefined') {
            gameAudio.playCombo(3);
        }

        setTimeout(() => {
            toast.classList.add('toast-fadeout');
            setTimeout(() => toast.remove(), 400);
        }, 3500);
    }

    // ================= TELA DE GAME OVER =================

    showGameOver({ score, highScore, isNewRecord, creaturesKilled, maxCombo }) {
        if (!this.gameOverScreen) return;
        this.gameOverScreen.classList.remove('hidden');

        document.getElementById('go-final-score').textContent = score.toLocaleString('pt-BR');
        document.getElementById('go-high-score').textContent = highScore.toLocaleString('pt-BR');
        document.getElementById('go-creatures').textContent = creaturesKilled;
        document.getElementById('go-max-combo').textContent = `x${maxCombo}`;

        const recordBadge = document.getElementById('go-new-record-badge');
        if (recordBadge) {
            recordBadge.classList.toggle('hidden', !isNewRecord);
        }

        // Preenche nome do jogador
        const nameInput = document.getElementById('go-player-name');
        if (nameInput) {
            nameInput.value = gameStorage.getPlayerName();
        }
    }

    // ================= MODAL DE SKINS =================

    renderSkinsGrid() {
        const grid = document.getElementById('skins-grid');
        if (!grid) return;

        const unlockedSkins = gameStorage.getUnlockedSkins();
        const activeSkin = gameStorage.getActiveSkin();

        const skinsData = [
            { id: 'classic', name: 'Padrão', reqScore: 0, desc: 'Traje de mergulho tradicional.' },
            { id: 'researcher', name: 'Pesquisador', reqScore: 1000, desc: 'Equipamento científico leve.' },
            { id: 'explorer', name: 'Explorador', reqScore: 5000, desc: 'Armadura reforçada para abismos.' },
            { id: 'futuristic', name: 'Futurista', reqScore: 10000, desc: 'Traje cibernético com LEDs neon.' },
            { id: 'hunter', name: 'Caçador das Profundezas', reqScore: 15000, desc: 'Furtividade tática e miras térmicas.' },
            { id: 'alien', name: 'Alienígena', reqScore: 20000, desc: 'Bioluminescência extraterrestre.' }
        ];

        grid.innerHTML = '';
        skinsData.forEach(skin => {
            const isUnlocked = unlockedSkins.includes(skin.id);
            const isEquipped = activeSkin === skin.id;

            const card = document.createElement('div');
            card.className = `skin-card ${isEquipped ? 'equipped' : ''} ${!isUnlocked ? 'locked' : ''}`;

            card.innerHTML = `
                <div class="skin-preview-canvas-wrap">
                    <canvas class="skin-canvas" width="80" height="80" data-skin="${skin.id}"></canvas>
                </div>
                <div class="skin-title">${skin.name}</div>
                <div class="skin-desc">${skin.desc}</div>
                <div class="skin-status">
                    ${isEquipped ? '✔ EQUIPADO' : (isUnlocked ? 'SELECIONAR' : `🔒 ${skin.reqScore.toLocaleString('pt-BR')} pts`)}
                </div>
            `;

            if (isUnlocked && !isEquipped) {
                card.style.cursor = 'pointer';
                card.addEventListener('click', () => {
                    gameStorage.setActiveSkin(skin.id);
                    if (window.game && window.game.player) {
                        window.game.player.setSkin(skin.id);
                    }
                    this.renderSkinsGrid();
                    this.showToast('Skin Equipada', `Você equipou a skin ${skin.name}!`, '👨🚀');
                });
            }

            grid.appendChild(card);

            // Renderiza o mini-mergulhador no preview da skin
            const canvas = card.querySelector('.skin-canvas');
            if (canvas) {
                this.drawSkinPreview(canvas, skin.id);
            }
        });
    }

    drawSkinPreview(canvas, skinId) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Cria uma instância temporária do mergulhador centrada no canvas
        const p = new Player(canvas.width / 2 - 2, canvas.height / 2 + 2);
        p.setSkin(skinId);
        p.aimAngle = 0;
        p.flipX = false;
        p.draw(ctx);
    }

    // ================= MODAL DE RANKING =================

    renderRankingList() {
        const container = document.getElementById('ranking-list');
        if (!container) return;

        const scores = gameStorage.getHighScores();
        const bestScore = gameStorage.getBestScore();
        const playerName = gameStorage.getPlayerName();

        document.getElementById('ranking-personal-best').textContent = bestScore.toLocaleString('pt-BR');

        let html = '';
        scores.slice(0, 8).forEach((item, index) => {
            let rankBadge = `${index + 1}º`;
            let medalClass = '';
            if (index === 0) { rankBadge = '🥇'; medalClass = 'gold'; }
            else if (index === 1) { rankBadge = '🥈'; medalClass = 'silver'; }
            else if (index === 2) { rankBadge = '🥉'; medalClass = 'bronze'; }

            const isCurrentPlayer = item.name.toLowerCase() === playerName.toLowerCase();

            html += `
                <div class="ranking-row ${medalClass} ${isCurrentPlayer ? 'highlight-player' : ''}">
                    <div class="rank-pos">${rankBadge}</div>
                    <div class="rank-name">${item.name}</div>
                    <div class="rank-score">${item.score.toLocaleString('pt-BR')}</div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    // ================= MODAL DE MISSÕES =================

    renderMissionsList() {
        const container = document.getElementById('missions-list');
        if (!container) return;

        const missions = gameStorage.getMissions();
        let html = '';

        missions.forEach(m => {
            const pct = Math.min(100, Math.floor(((m.current || 0) / m.target) * 100));
            html += `
                <div class="mission-card ${m.completed ? 'completed' : ''}">
                    <div class="mission-header">
                        <div class="mission-title">${m.completed ? '✅ ' : '🎯 '}${m.title}</div>
                        <div class="mission-reward">Recompensa: ${m.reward}</div>
                    </div>
                    <div class="mission-desc">${m.desc}</div>
                    <div class="mission-progress-bar-wrap">
                        <div class="mission-progress-bar" style="width: ${pct}%"></div>
                    </div>
                    <div class="mission-progress-text">${(m.current || 0).toLocaleString('pt-BR')} / ${m.target.toLocaleString('pt-BR')} (${pct}%)</div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    // ================= MODAL DE CONFIGURAÇÕES =================

    renderSettings() {
        const settings = gameStorage.getSettings();

        const soundCheck = document.getElementById('setting-sound');
        const musicCheck = document.getElementById('setting-music');
        const particlesCheck = document.getElementById('setting-particles');
        const nameInput = document.getElementById('setting-player-name');

        if (soundCheck) {
            soundCheck.checked = settings.sound;
            soundCheck.onchange = () => gameAudio.toggleSound(soundCheck.checked);
        }
        if (musicCheck) {
            musicCheck.checked = settings.music;
            musicCheck.onchange = () => gameAudio.toggleMusic(musicCheck.checked);
        }
        if (particlesCheck) {
            particlesCheck.checked = settings.highGraphics;
            particlesCheck.onchange = () => gameStorage.saveSettings({ highGraphics: particlesCheck.checked });
        }
        if (nameInput) {
            nameInput.value = gameStorage.getPlayerName();
            nameInput.onchange = () => gameStorage.setPlayerName(nameInput.value);
        }
    }
}

// Instância global
const gameUI = new UIManager();
