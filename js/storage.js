/**
 * DEEP HUNT - Storage Module
 * Gerenciamento de persistência local (localStorage) para Recordes, Skins, Missões e Configurações
 */

const STORAGE_KEYS = {
    HIGH_SCORES: 'deephunt_highscores',
    PLAYER_NAME: 'deephunt_player_name',
    SKINS: 'deephunt_skins',
    ACTIVE_SKIN: 'deephunt_active_skin',
    MISSIONS: 'deephunt_missions',
    SETTINGS: 'deephunt_settings',
    STATS: 'deephunt_stats'
};

// Ranking padrão inicial (arcade clássico) igual à tela de referência
const DEFAULT_HIGH_SCORES = [
    { name: 'Player123', score: 128450, date: '2026-09-20' },
    { name: 'OceanKing', score: 97820, date: '2026-09-21' },
    { name: 'Pedro', score: 86300, date: '2026-09-22' },
    { name: 'DeepDiver', score: 72100, date: '2026-09-22' },
    { name: 'SharkHunter', score: 68450, date: '2026-09-23' }
];

// Configurações padrão
const DEFAULT_SETTINGS = {
    sound: true,
    music: true,
    highGraphics: true,
    showTouchControls: 'auto' // 'auto', 'always', 'never'
};

// Missões padrão do jogo
const DEFAULT_MISSIONS = [
    { id: 'first_dive', title: 'Primeiro Mergulho', desc: 'Elimine 20 criaturas marinhas', target: 20, current: 0, completed: false, reward: '100 pts' },
    { id: 'score_1k', title: 'Caçador do Recife', desc: 'Alcance 1.000 pontos em uma partida', target: 1000, current: 0, completed: false, reward: 'Skin Pesquisador' },
    { id: 'combo_x5', title: 'Fúria Subaquática', desc: 'Atinja um Combo x5', target: 5, current: 0, completed: false, reward: 'Troféu Combo' },
    { id: 'shark_slayer', title: 'Domador de Feras', desc: 'Derrote 3 tubarões', target: 3, current: 0, completed: false, reward: '300 pts' },
    { id: 'prehistoric_hunter', title: 'Fóssil Vivo', desc: 'Derrote uma criatura pré-histórica', target: 1, current: 0, completed: false, reward: 'Skin Explorador' },
    { id: 'score_10k', title: 'Lorde do Abismo', desc: 'Alcance 10.000 pontos', target: 10000, current: 0, completed: false, reward: 'Skin Caçador' },
    { id: 'defeat_leviathan', title: 'Soberano das Profundezas', desc: 'Derrote o Abyssal Leviathan', target: 1, current: 0, completed: false, reward: 'Skin Alienígena' }
];

// Estatísticas globais
const DEFAULT_STATS = {
    gamesPlayed: 0,
    totalCreaturesKilled: 0,
    highestScore: 86300, // Score inicial de Pedro ou 0
    highestCombo: 1,
    largestCreatureKilled: 'Nenhuma',
    totalPlayTimeSeconds: 0
};

class StorageManager {
    constructor() {
        this.init();
    }

    init() {
        // Inicializa high scores se não existirem
        if (!localStorage.getItem(STORAGE_KEYS.HIGH_SCORES)) {
            localStorage.setItem(STORAGE_KEYS.HIGH_SCORES, JSON.stringify(DEFAULT_HIGH_SCORES));
        }

        // Inicializa nome do jogador
        if (!localStorage.getItem(STORAGE_KEYS.PLAYER_NAME)) {
            localStorage.setItem(STORAGE_KEYS.PLAYER_NAME, 'Pedro');
        }

        // Inicializa skins desbloqueadas (default clássica)
        if (!localStorage.getItem(STORAGE_KEYS.SKINS)) {
            localStorage.setItem(STORAGE_KEYS.SKINS, JSON.stringify(['classic']));
        }

        // Skin ativa
        if (!localStorage.getItem(STORAGE_KEYS.ACTIVE_SKIN)) {
            localStorage.setItem(STORAGE_KEYS.ACTIVE_SKIN, 'classic');
        }

        // Missões
        if (!localStorage.getItem(STORAGE_KEYS.MISSIONS)) {
            localStorage.setItem(STORAGE_KEYS.MISSIONS, JSON.stringify(DEFAULT_MISSIONS));
        }

        // Configurações
        if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
            localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
        }

        // Estatísticas
        if (!localStorage.getItem(STORAGE_KEYS.STATS)) {
            localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(DEFAULT_STATS));
        }
    }

    // High Scores
    getHighScores() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEYS.HIGH_SCORES)) || DEFAULT_HIGH_SCORES;
        } catch (e) {
            return DEFAULT_HIGH_SCORES;
        }
    }

    saveScore(score, playerName = null) {
        const name = playerName || this.getPlayerName() || 'Diver';
        const scores = this.getHighScores();
        scores.push({
            name: name,
            score: score,
            date: new Date().toISOString().split('T')[0]
        });

        // Ordena por pontuação decrescente
        scores.sort((a, b) => b.score - a.score);

        // Mantém top 10
        const topScores = scores.slice(0, 10);
        localStorage.setItem(STORAGE_KEYS.HIGH_SCORES, JSON.stringify(topScores));

        // Atualiza estatísticas de melhor pontuação
        const stats = this.getStats();
        if (score > stats.highestScore) {
            stats.highestScore = score;
            this.saveStats(stats);
        }

        return topScores;
    }

    isHighScore(score) {
        const scores = this.getHighScores();
        if (scores.length < 5) return true;
        return score > scores[scores.length - 1].score;
    }

    getBestScore() {
        const scores = this.getHighScores();
        const playerName = this.getPlayerName();
        const playerScores = scores.filter(s => s.name.toLowerCase() === playerName.toLowerCase());
        if (playerScores.length > 0) {
            return playerScores[0].score;
        }
        return this.getStats().highestScore || 0;
    }

    // Nome do Jogador
    getPlayerName() {
        return localStorage.getItem(STORAGE_KEYS.PLAYER_NAME) || 'Pedro';
    }

    setPlayerName(name) {
        if (!name || name.trim() === '') name = 'Mergulhador';
        localStorage.setItem(STORAGE_KEYS.PLAYER_NAME, name.trim().slice(0, 15));
    }

    // Skins
    getUnlockedSkins() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEYS.SKINS)) || ['classic'];
        } catch (e) {
            return ['classic'];
        }
    }

    unlockSkin(skinId) {
        const skins = this.getUnlockedSkins();
        if (!skins.includes(skinId)) {
            skins.push(skinId);
            localStorage.setItem(STORAGE_KEYS.SKINS, JSON.stringify(skins));
            return true;
        }
        return false;
    }

    getActiveSkin() {
        return localStorage.getItem(STORAGE_KEYS.ACTIVE_SKIN) || 'classic';
    }

    setActiveSkin(skinId) {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_SKIN, skinId);
    }

    // Checa desbloqueio de skins por pontuação
    checkSkinUnlocksByScore(score) {
        const newUnlocks = [];
        if (score >= 1000 && this.unlockSkin('researcher')) newUnlocks.push('Pesquisador');
        if (score >= 5000 && this.unlockSkin('explorer')) newUnlocks.push('Explorador');
        if (score >= 10000 && this.unlockSkin('futuristic')) newUnlocks.push('Futurista');
        if (score >= 15000 && this.unlockSkin('hunter')) newUnlocks.push('Caçador das Profundezas');
        if (score >= 20000 && this.unlockSkin('alien')) newUnlocks.push('Alienígena');
        return newUnlocks;
    }

    // Missões
    getMissions() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEYS.MISSIONS)) || DEFAULT_MISSIONS;
        } catch (e) {
            return DEFAULT_MISSIONS;
        }
    }

    updateMissionProgress(missionId, amount = 1) {
        const missions = this.getMissions();
        const mission = missions.find(m => m.id === missionId);
        if (mission && !mission.completed) {
            mission.current = Math.min(mission.target, (mission.current || 0) + amount);
            if (mission.current >= mission.target) {
                mission.completed = true;
                localStorage.setItem(STORAGE_KEYS.MISSIONS, JSON.stringify(missions));
                return mission; // Retorna a missão completada para notificação
            }
            localStorage.setItem(STORAGE_KEYS.MISSIONS, JSON.stringify(missions));
        }
        return null;
    }

    setMissionProgress(missionId, value) {
        const missions = this.getMissions();
        const mission = missions.find(m => m.id === missionId);
        if (mission && !mission.completed) {
            mission.current = Math.max(mission.current || 0, value);
            if (mission.current >= mission.target) {
                mission.completed = true;
                localStorage.setItem(STORAGE_KEYS.MISSIONS, JSON.stringify(missions));
                return mission;
            }
            localStorage.setItem(STORAGE_KEYS.MISSIONS, JSON.stringify(missions));
        }
        return null;
    }

    // Configurações
    getSettings() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS)) || DEFAULT_SETTINGS;
        } catch (e) {
            return DEFAULT_SETTINGS;
        }
    }

    saveSettings(newSettings) {
        const settings = { ...this.getSettings(), ...newSettings };
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
        return settings;
    }

    // Estatísticas
    getStats() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEYS.STATS)) || DEFAULT_STATS;
        } catch (e) {
            return DEFAULT_STATS;
        }
    }

    saveStats(newStats) {
        localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(newStats));
    }

    recordGameFinished({ score, creaturesKilled, maxCombo, largestCreature, timeSeconds }) {
        const stats = this.getStats();
        stats.gamesPlayed += 1;
        stats.totalCreaturesKilled += creaturesKilled;
        stats.totalPlayTimeSeconds += timeSeconds;
        if (score > stats.highestScore) stats.highestScore = score;
        if (maxCombo > stats.highestCombo) stats.highestCombo = maxCombo;
        if (largestCreature) stats.largestCreatureKilled = largestCreature;
        this.saveStats(stats);
    }
}

// Instância global
const gameStorage = new StorageManager();
