/**
 * DEEP HUNT - Audio Engine (Web Audio API)
 * Sintetizador nativo para efeitos sonoros (SFX) e música ambiente aquática sem dependências externas.
 */

class AudioManager {
    constructor() {
        this.ctx = null;
        this.soundEnabled = true;
        this.musicEnabled = true;
        this.masterVolume = 0.7;
        this.musicGain = null;
        this.sfxGain = null;

        // Controle da música ambiente sintetizada
        this.musicInterval = null;
        this.currentZone = 'reef';
        this.isPlayingMusic = false;

        // Carrega preferências salvas
        this.loadSettings();
    }

    loadSettings() {
        if (typeof gameStorage !== 'undefined') {
            const settings = gameStorage.getSettings();
            this.soundEnabled = settings.sound !== undefined ? settings.sound : true;
            this.musicEnabled = settings.music !== undefined ? settings.music : true;
        }
    }

    initContext() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.ctx = new AudioContext();

                // Master Gains
                this.sfxGain = this.ctx.createGain();
                this.sfxGain.gain.setValueAtTime(this.soundEnabled ? 0.7 : 0, this.ctx.currentTime);
                this.sfxGain.connect(this.ctx.destination);

                this.musicGain = this.ctx.createGain();
                this.musicGain.gain.setValueAtTime(this.musicEnabled ? 0.25 : 0, this.ctx.currentTime);
                this.musicGain.connect(this.ctx.destination);
            }
        } else if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleSound(enable = null) {
        this.soundEnabled = enable !== null ? enable : !this.soundEnabled;
        if (this.sfxGain && this.ctx) {
            this.sfxGain.gain.setValueAtTime(this.soundEnabled ? 0.7 : 0, this.ctx.currentTime);
        }
        if (typeof gameStorage !== 'undefined') {
            gameStorage.saveSettings({ sound: this.soundEnabled });
        }
        return this.soundEnabled;
    }

    toggleMusic(enable = null) {
        this.musicEnabled = enable !== null ? enable : !this.musicEnabled;
        if (this.musicGain && this.ctx) {
            this.musicGain.gain.setValueAtTime(this.musicEnabled ? 0.25 : 0, this.ctx.currentTime);
        }
        if (this.musicEnabled && !this.isPlayingMusic) {
            this.startMusic();
        } else if (!this.musicEnabled && this.isPlayingMusic) {
            this.stopMusic();
        }
        if (typeof gameStorage !== 'undefined') {
            gameStorage.saveSettings({ music: this.musicEnabled });
        }
        return this.musicEnabled;
    }

    // ================= SFX =================

    /** Disparo do arpão / laser de plasma */
    playShoot() {
        if (!this.soundEnabled) return;
        this.initContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sine';
        // Queda rápida de frequência típica de disparo laser subaquático
        osc.frequency.setValueAtTime(680, now);
        osc.frequency.exponentialRampToValueAtTime(140, now + 0.12);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1800, now);

        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.13);
    }

    /** Impacto do tiro na criatura */
    playHit() {
        if (!this.soundEnabled) return;
        this.initContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.09);
    }

    /** Derrota de criatura (som de bolhas estourando e pontuação) */
    playDefeat(tier = 'common') {
        if (!this.soundEnabled) return;
        this.initContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;

        // Som de 'pop' de bolha
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        let baseFreq = 400;
        let endFreq = 950;
        let duration = 0.12;

        if (tier === 'dangerous') {
            baseFreq = 260;
            endFreq = 600;
            duration = 0.2;
        } else if (tier === 'prehistoric' || tier === 'legendary') {
            baseFreq = 180;
            endFreq = 480;
            duration = 0.35;
        }

        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration * 0.7);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.5, now + duration);

        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + duration + 0.01);
    }

    /** Coleta de moeda / pérola de pontuação */
    playCoin() {
        if (!this.soundEnabled) return;
        this.initContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.type = 'sine';
        osc2.type = 'triangle';

        osc1.frequency.setValueAtTime(987.77, now); // B5
        osc1.frequency.setValueAtTime(1318.51, now + 0.08); // E6

        osc2.frequency.setValueAtTime(1318.51, now);
        osc2.frequency.setValueAtTime(1760.00, now + 0.08); // A6

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.sfxGain);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.23);
        osc2.stop(now + 0.23);
    }

    /** Mergulhador sofre dano */
    playHurt() {
        if (!this.soundEnabled) return;
        this.initContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(55, now + 0.25);

        gain.gain.setValueAtTime(0.45, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.26);
    }

    /** Fanfarra de combo crescente */
    playCombo(multiplier) {
        if (!this.soundEnabled) return;
        this.initContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const baseFreq = 440 + (multiplier * 75);

        [0, 0.07, 0.14].forEach((delay, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(baseFreq * (1 + i * 0.25), now + delay);

            gain.gain.setValueAtTime(0.25, now + delay);
            gain.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.15);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(now + delay);
            osc.stop(now + delay + 0.16);
        });
    }

    /** Alerta de sonar (mudança de região ou criatura rara/Megalodon) */
    playSonar() {
        if (!this.soundEnabled) return;
        this.initContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(780, now + 0.6);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.95);
    }

    /** Rugido / Som abissal do Abyssal Leviathan ou Megalodon */
    playBossRoar() {
        if (!this.soundEnabled) return;
        this.initContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;

        // Sub-baixo com modulação de frequência (LFO)
        const osc = this.ctx.createOscillator();
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(85, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 1.2);

        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(14, now);
        lfoGain.gain.setValueAtTime(25, now);
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(350, now);
        filter.frequency.exponentialRampToValueAtTime(120, now + 1.2);

        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 1.2);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        lfo.start(now);
        osc.stop(now + 1.25);
        lfo.stop(now + 1.25);
    }

    /** Game Over som melancólico */
    playGameOver() {
        if (!this.soundEnabled) return;
        this.initContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const notes = [330, 311.13, 293.66, 261.63, 220]; // E, Eb, D, C, A

        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const start = now + idx * 0.18;

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, start);

            gain.gain.setValueAtTime(0.3, start);
            gain.gain.exponentialRampToValueAtTime(0.01, start + 0.35);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(start);
            osc.stop(start + 0.36);
        });
    }

    // ================= MÚSICA AMBIENTE AQUÁTICA =================

    setZone(zone) {
        this.currentZone = zone;
    }

    startMusic() {
        if (!this.musicEnabled || this.isPlayingMusic) return;
        this.initContext();
        if (!this.ctx) return;

        this.isPlayingMusic = true;

        // Escalas pentatônicas atmosféricas por região
        const scales = {
            reef: [261.63, 293.66, 329.63, 392.00, 440.00, 523.25], // C Maior (calmo e vivo)
            deep: [220.00, 261.63, 293.66, 329.63, 392.00],        // A Menor (profundo e misterioso)
            abyss: [196.00, 233.08, 261.63, 293.66, 349.23],       // G Frígio (antigo, pré-histórico)
            unknown: [164.81, 196.00, 220.00, 246.94, 293.66]      // E Misterioso (abismo alienígena)
        };

        let noteIdx = 0;

        const playAmbientNote = () => {
            if (!this.isPlayingMusic || !this.musicEnabled || !this.ctx) return;

            const scale = scales[this.currentZone] || scales.reef;
            const freq = scale[Math.floor(Math.random() * scale.length)];
            const now = this.ctx.currentTime;

            const osc = this.ctx.createOscillator();
            const filter = this.ctx.createBiquadFilter();
            const gain = this.ctx.createGain();

            osc.type = Math.random() > 0.4 ? 'sine' : 'triangle';
            osc.frequency.setValueAtTime(freq, now);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(650, now);

            // Ataque e decaimento suaves e fluidos como ondas
            gain.gain.setValueAtTime(0.001, now);
            gain.gain.linearRampToValueAtTime(0.12, now + 0.4);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 2.2);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.musicGain);

            osc.start(now);
            osc.stop(now + 2.3);

            // Intervalo relaxante entre notas
            const nextTime = 400 + Math.random() * 800;
            this.musicInterval = setTimeout(playAmbientNote, nextTime);
        };

        playAmbientNote();
    }

    stopMusic() {
        this.isPlayingMusic = false;
        if (this.musicInterval) {
            clearTimeout(this.musicInterval);
            this.musicInterval = null;
        }
    }
}

// Instância global de áudio
const gameAudio = new AudioManager();
