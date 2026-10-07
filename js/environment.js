/**
 * DEEP HUNT - Environment Renderer (Cenário submarino em camadas)
 * ---------------------------------------------------------------
 * Novo fundo do mar inspirado na arte de referência:
 *  - água em gradiente de profundidade com raios de luz
 *  - navio naufragado em silhueta no fundo
 *  - formações rochosas com cavernas nas laterais
 *  - areia no centro, corais, anêmonas, algas e vegetação marinha
 *  - camadas de parallax (fundo / meio / detalhe / primeiro plano)
 *
 * PERFORMANCE: cada camada estática é pré-renderizada UMA única vez por zona
 * em canvases offscreen. No loop do jogo apenas blitamos (drawImage) + poucos
 * elementos animados. Nada de loops pesados por frame.
 */
(function (global) {
    'use strict';

    function mulberry32(seed) {
        let a = seed >>> 0;
        return function () {
            a |= 0; a = (a + 0x6D2B79F5) | 0;
            let t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    // ============================================================
    // PALETAS POR REGIÃO
    // ============================================================
    const PALETTES = {
        reef: {
            waterTop: '#1d8cba', waterMid: '#0b5a83', waterDeep: '#06304f',
            haze: 'rgba(40, 150, 200, 0.30)',
            farRock: '#0c4b6c', midRock: '#0a3c59', rockShade: '#062538', rockLight: '#1c6b93',
            sand: '#cbb488', sandLight: '#ecd9ab', sandDark: '#a28c62',
            shipBody: '#0a3550', shipDark: '#052334', shipLight: '#14587a',
            plantA: '#2f8a52', plantB: '#1d5f3d', plantC: '#66b06a',
            coral: ['#ea6f9c', '#a75ed6', '#e5803c', '#5ec27a', '#41a9a2', '#f0c04a'],
            lightShaft: 0.10, vignette: 0.34, glowMotes: 0, bones: false, biolum: false
        },
        deep: {
            waterTop: '#0f6d94', waterMid: '#08496b', waterDeep: '#042339',
            haze: 'rgba(20, 110, 160, 0.28)',
            farRock: '#093c58', midRock: '#073149', rockShade: '#041c2c', rockLight: '#135a7d',
            sand: '#b7a077', sandLight: '#d6c299', sandDark: '#8d7a55',
            shipBody: '#072c44', shipDark: '#031b2b', shipLight: '#0e4a68',
            plantA: '#276f4a', plantB: '#164a33', plantC: '#4f9a63',
            coral: ['#cf5f8b', '#8f4fbd', '#cc6f36', '#4fa96c', '#369292', '#d8ad45'],
            lightShaft: 0.06, vignette: 0.44, glowMotes: 0, bones: false, biolum: false
        },
        abyss: {
            waterTop: '#0c5361', waterMid: '#06333f', waterDeep: '#021821',
            haze: 'rgba(60, 140, 150, 0.22)',
            farRock: '#06303c', midRock: '#052832', rockShade: '#03161d', rockLight: '#0d4855',
            sand: '#a2916d', sandLight: '#c2b189', sandDark: '#7d6e50',
            shipBody: '#052733', shipDark: '#021820', shipLight: '#0a4652',
            plantA: '#2b6b52', plantB: '#164035', plantC: '#55927a',
            coral: ['#b85a7d', '#7d4aa8', '#b3653a', '#489a72', '#39918c', '#c9a24f'],
            lightShaft: 0.035, vignette: 0.56, glowMotes: 0, bones: true, biolum: false
        },
        unknown: {
            waterTop: '#3a2470', waterMid: '#1c0f42', waterDeep: '#080419',
            haze: 'rgba(140, 80, 220, 0.24)',
            farRock: '#1b1040', midRock: '#150c34', rockShade: '#0a0520', rockLight: '#33207a',
            sand: '#6f6480', sandLight: '#9488a8', sandDark: '#514969',
            shipBody: '#150b32', shipDark: '#0a0520', shipLight: '#2d1a63',
            plantA: '#4a3a8f', plantB: '#2b2260', plantC: '#7b62c9',
            coral: ['#e05fb0', '#a15ee0', '#e07a5f', '#4fd1a5', '#5ee0d6', '#e0c85f'],
            lightShaft: 0.02, vignette: 0.62, glowMotes: 26, bones: true, biolum: true
        }
    };

    class EnvironmentRenderer {
        constructor(width, height) {
            this.width = width;
            this.height = height;
            this.margin = 90;              // margem extra para o parallax
            this.zone = null;
            this.layers = { far: null, mid: null, near: null, fg: null };
            this.pal = PALETTES.reef;
            this.time = 0;

            // Partículas animadas (neve marinha)
            this.snow = [];
            this.motes = [];
            this.glowSprite = null;
            this.initParticles();
            this.buildGlowSprite();

            this.setZone('reef');
        }

        // ------------------------------------------------------------
        // PARTÍCULAS E SPRITES
        // ------------------------------------------------------------
        initParticles() {
            const rng = mulberry32(2026);
            this.snow = [];
            for (let i = 0; i < 70; i++) {
                this.snow.push({
                    x: rng() * this.width,
                    y: rng() * this.height,
                    r: 0.6 + rng() * 1.9,
                    vy: 6 + rng() * 16,
                    sway: 4 + rng() * 10,
                    phase: rng() * Math.PI * 2,
                    a: 0.12 + rng() * 0.35
                });
            }
            this.motes = [];
            for (let i = 0; i < 26; i++) {
                this.motes.push({
                    x: rng() * this.width,
                    y: rng() * this.height,
                    r: 8 + rng() * 22,
                    vy: -4 - rng() * 10,
                    phase: rng() * Math.PI * 2,
                    a: 0.35 + rng() * 0.5
                });
            }
        }

        buildGlowSprite() {
            const c = document.createElement('canvas');
            c.width = c.height = 64;
            const g = c.getContext('2d');
            const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
            grad.addColorStop(0, 'rgba(180, 250, 255, 0.95)');
            grad.addColorStop(0.35, 'rgba(90, 220, 255, 0.45)');
            grad.addColorStop(1, 'rgba(60, 180, 255, 0)');
            g.fillStyle = grad;
            g.fillRect(0, 0, 64, 64);
            this.glowSprite = c;
        }

        // ------------------------------------------------------------
        // CONSTRUÇÃO DAS CAMADAS
        // ------------------------------------------------------------
        setZone(zone) {
            if (this.zone === zone && this.layers.far) return;
            this.zone = zone;
            this.pal = PALETTES[zone] || PALETTES.reef;
            const seedBase = { reef: 1337, deep: 2401, abyss: 3557, unknown: 4801 }[zone] || 1337;
            this.build(seedBase);
        }

        makeLayer() {
            const c = document.createElement('canvas');
            c.width = this.width + this.margin * 2;
            c.height = this.height;
            const g = c.getContext('2d');
            g.translate(this.margin, 0);
            return { canvas: c, ctx: g };
        }

        build(seed) {
            const layers = {
                far: this.makeLayer(),
                mid: this.makeLayer(),
                near: this.makeLayer(),
                fg: this.makeLayer()
            };
            this.layers = layers;

            this.buildFar(layers.far.ctx, mulberry32(seed));
            this.buildMid(layers.mid.ctx, mulberry32(seed + 991));
            this.buildNear(layers.near.ctx, mulberry32(seed + 1973));
            this.buildForeground(layers.fg.ctx, mulberry32(seed + 4441));
        }

        // ---------------- CAMADA 1: ÁGUA, LUZ, NAVIO, SILHUETAS ----------------
        buildFar(ctx, rng) {
            const W = this.width, H = this.height, p = this.pal;

            // Gradiente de profundidade
            const grad = ctx.createLinearGradient(0, 0, 0, H);
            grad.addColorStop(0, p.waterTop);
            grad.addColorStop(0.46, p.waterMid);
            grad.addColorStop(1, p.waterDeep);
            ctx.fillStyle = grad;
            ctx.fillRect(-this.margin, 0, W + this.margin * 2, H);

            // Brilho da superfície
            const surf = ctx.createLinearGradient(0, 0, 0, 90);
            surf.addColorStop(0, 'rgba(190, 245, 255, 0.35)');
            surf.addColorStop(1, 'rgba(190, 245, 255, 0)');
            ctx.fillStyle = surf;
            ctx.fillRect(-this.margin, 0, W + this.margin * 2, 96);

            // Raios de sol estáticos
            ctx.save();
            ctx.globalAlpha = p.lightShaft * 1.4;
            ctx.fillStyle = '#dffaff';
            for (let i = 0; i < 6; i++) {
                const x = 120 + i * 210 + rng() * 60;
                ctx.beginPath();
                ctx.moveTo(x - 60, -20);
                ctx.lineTo(x + 30, -20);
                ctx.lineTo(x + 220, H * 0.92);
                ctx.lineTo(x + 40, H * 0.92);
                ctx.closePath();
                ctx.fill();
            }
            ctx.restore();

            // Cordilheira distante (silhueta com névoa)
            ctx.save();
            ctx.globalAlpha = 0.55;
            ctx.fillStyle = p.farRock;
            ctx.beginPath();
            ctx.moveTo(-this.margin, H);
            let x = -this.margin;
            ctx.lineTo(-this.margin, H - 150);
            while (x < W + this.margin) {
                const step = 70 + rng() * 90;
                const h = H - (200 + rng() * 120);
                ctx.lineTo(x + step * 0.5, h);
                ctx.lineTo(x + step, H - (140 + rng() * 60));
                x += step;
            }
            ctx.lineTo(W + this.margin, H);
            ctx.closePath();
            ctx.fill();
            ctx.restore();

            // Navio naufragado em silhueta (elemento principal da referência)
            ctx.save();
            ctx.globalAlpha = 0.9;
            this.drawSunkenShip(ctx, 700, 268, 1.12, -0.14, true);
            ctx.restore();

            // Cardume distante em silhueta
            ctx.save();
            ctx.globalAlpha = 0.35;
            ctx.fillStyle = '#062a44';
            for (let i = 0; i < 16; i++) {
                const bx = 210 + rng() * 320;
                const by = 120 + rng() * 130;
                const s = 3 + rng() * 3;
                ctx.beginPath();
                ctx.ellipse(bx, by, s, s * 0.5, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.moveTo(bx - s, by);
                ctx.lineTo(bx - s * 2, by - s * 0.6);
                ctx.lineTo(bx - s * 2, by + s * 0.6);
                ctx.closePath();
                ctx.fill();
            }
            ctx.restore();

            // Corais distantes (silhueta)
            ctx.save();
            ctx.globalAlpha = 0.5;
            const dist = ['#0a3f5c', '#093754'];
            for (let i = 0; i < 9; i++) {
                const cx = 40 + rng() * (W - 80);
                const cy = H - 150 - rng() * 40;
                this.drawSilhouetteCoral(ctx, cx, cy, 0.7 + rng() * 0.8, dist[i % 2]);
            }
            ctx.restore();

            // Névoa de profundidade
            const haze = ctx.createLinearGradient(0, H * 0.25, 0, H);
            haze.addColorStop(0, 'rgba(0,0,0,0)');
            haze.addColorStop(1, p.haze);
            ctx.fillStyle = haze;
            ctx.fillRect(-this.margin, 0, W + this.margin * 2, H);
        }

        /** Navio naufragado em silhueta com mastros, cordames e velas rasgadas */
        drawSunkenShip(ctx, cx, cy, scale, rot, silhouette) {
            const p = this.pal;
            const hullFill = silhouette ? 'rgba(4, 22, 38, 0.92)' : p.shipBody;
            const hullDark = silhouette ? 'rgba(2, 14, 26, 0.96)' : p.shipDark;
            const sailFill = silhouette ? 'rgba(5, 26, 44, 0.9)' : 'rgba(12, 54, 78, 0.9)';
            const ropeFill = silhouette ? 'rgba(2, 14, 26, 0.7)' : hullDark;

            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(rot);
            ctx.scale(scale, scale);

            // ---- MASTROS + VERGAS + VELAS (desenhados antes do casco) ----
            const masts = [
                { x: -96, lean: -0.13, h: 300 },
                { x: 6, lean: 0.02, h: 340 },
                { x: 106, lean: 0.15, h: 250 }
            ];

            // cordames traseiros (do topo dos mastros até o casco)
            ctx.strokeStyle = ropeFill;
            ctx.lineWidth = 1.6;
            masts.forEach(m => {
                ctx.beginPath();
                ctx.moveTo(m.x, -m.h);
                ctx.quadraticCurveTo(m.x + 26, -m.h * 0.45, m.x + 62, 4);
                ctx.moveTo(m.x, -m.h);
                ctx.quadraticCurveTo(m.x - 26, -m.h * 0.5, m.x - 58, 4);
                ctx.stroke();
            });

            masts.forEach((m, mi) => {
                ctx.save();
                ctx.translate(m.x, 6);
                ctx.rotate(m.lean);

                // mastro
                ctx.strokeStyle = hullDark;
                ctx.lineWidth = 7;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(0, -m.h);
                ctx.stroke();

                // vergas (travessões transversais)
                const yards = mi === 1 ? [-62, -150, -238] : [-58, -136];
                ctx.lineWidth = 5;
                yards.forEach(y => {
                    const w = 58 - Math.abs(y) * 0.05;
                    ctx.beginPath();
                    ctx.moveTo(-w, y + 8);
                    ctx.lineTo(w, y - 8);
                    ctx.stroke();
                });

                // velas rasgadas penduradas nas vergas de baixo
                yards.slice(0, 2).forEach((y, yi) => {
                    const w = 54 - Math.abs(y) * 0.08;
                    ctx.beginPath();
                    ctx.moveTo(-w, y + 8);
                    ctx.quadraticCurveTo(0, y + 22, w, y - 8);
                    // borda inferior rasgada
                    ctx.lineTo(w * 0.72, y + 44 + yi * 6);
                    ctx.lineTo(w * 0.5, y + 26);
                    ctx.lineTo(w * 0.22, y + 52 + yi * 6);
                    ctx.lineTo(-w * 0.05, y + 28);
                    ctx.lineTo(-w * 0.34, y + 50 + yi * 6);
                    ctx.lineTo(-w * 0.6, y + 24);
                    ctx.lineTo(-w * 0.84, y + 40 + yi * 6);
                    ctx.closePath();
                    ctx.fillStyle = sailFill;
                    ctx.fill();
                });

                ctx.restore();
            });

            // ---- CASCO ----
            const hull = new Path2D();
            hull.moveTo(-152, -8);
            hull.quadraticCurveTo(-150, 48, -102, 64);
            hull.quadraticCurveTo(-6, 88, 98, 60);
            hull.quadraticCurveTo(142, 44, 156, -6);
            hull.quadraticCurveTo(60, 16, -60, 14);
            hull.closePath();
            ctx.fillStyle = hullFill;
            ctx.fill(hull);

            // deque (faixa superior)
            ctx.beginPath();
            ctx.moveTo(-154, -12);
            ctx.quadraticCurveTo(0, 20, 158, -10);
            ctx.quadraticCurveTo(0, 34, -154, -12);
            ctx.closePath();
            ctx.fillStyle = hullDark;
            ctx.fill();

            // costelas do casco
            ctx.strokeStyle = hullDark;
            ctx.lineWidth = 3;
            for (let i = -5; i <= 5; i++) {
                const x = i * 27;
                ctx.beginPath();
                ctx.moveTo(x, 8);
                ctx.quadraticCurveTo(x + 3, 34, x + 6, 54);
                ctx.stroke();
            }

            // buracos / avarias
            ctx.fillStyle = hullDark;
            [[-74, 30], [6, 38], [80, 28]].forEach(h => {
                ctx.beginPath();
                ctx.ellipse(h[0], h[1], 10, 6.5, 0.2, 0, Math.PI * 2);
                ctx.fill();
            });

            // proa inclinada + gurupés
            ctx.beginPath();
            ctx.moveTo(152, -8);
            ctx.quadraticCurveTo(198, -24, 218, -58);
            ctx.quadraticCurveTo(180, -30, 148, -20);
            ctx.closePath();
            ctx.fillStyle = hullFill;
            ctx.fill();
            ctx.strokeStyle = hullDark;
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(150, -12);
            ctx.lineTo(232, -74);
            ctx.stroke();

            // vegetação cobrindo o casco
            ctx.strokeStyle = 'rgba(6, 40, 58, 0.85)';
            ctx.lineWidth = 3;
            for (let i = 0; i < 12; i++) {
                const x = -140 + rng2(i * 7.3) * 280;
                const hh = 16 + rng2(i * 3.1) * 26;
                ctx.beginPath();
                ctx.moveTo(x, 12);
                ctx.quadraticCurveTo(x + 6, 2 - hh * 0.5, x + 2, -hh);
                ctx.stroke();
            }

            ctx.restore();

            // Névoa de profundidade sobre o navio (empurra a silhueta para trás)
            if (silhouette) {
                const haze = ctx.createRadialGradient(cx, cy - 60, 40, cx, cy - 40, 420 * scale);
                haze.addColorStop(0, 'rgba(8, 62, 92, 0.34)');
                haze.addColorStop(0.7, 'rgba(8, 58, 88, 0.16)');
                haze.addColorStop(1, 'rgba(8, 58, 88, 0)');
                ctx.fillStyle = haze;
                ctx.fillRect(cx - 430 * scale, cy - 400 * scale, 860 * scale, 620 * scale);
            }

            function rng2(seed) {
                const v = Math.sin(seed * 12.9898) * 43758.5453;
                return v - Math.floor(v);
            }
        }

        /** Coral em silhueta (usado no fundo distante) */
        drawSilhouetteCoral(ctx, x, y, scale, color) {
            ctx.save();
            ctx.translate(x, y);
            ctx.scale(scale, scale);
            ctx.fillStyle = color;
            ctx.strokeStyle = color;
            ctx.lineWidth = 5;
            ctx.lineCap = 'round';
            for (let i = -2; i <= 2; i++) {
                ctx.beginPath();
                ctx.moveTo(i * 8, 0);
                ctx.quadraticCurveTo(i * 16, -26, i * 12, -52);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(i * 12, -52);
                ctx.lineTo(i * 12 - 8, -70);
                ctx.moveTo(i * 12, -52);
                ctx.lineTo(i * 12 + 9, -68);
                ctx.stroke();
            }
            ctx.restore();
        }

        // ---------------- CAMADA 2: ROCHAS, CAVERNAS, AREIA ----------------
        buildMid(ctx, rng) {
            const W = this.width, H = this.height, p = this.pal;

            // Areia do fundo com dunas centrais
            ctx.beginPath();
            ctx.moveTo(-this.margin, H);
            ctx.lineTo(-this.margin, H - 120);
            ctx.quadraticCurveTo(120, H - 150, 300, H - 116);
            ctx.quadraticCurveTo(560, H - 78, 760, H - 92);
            ctx.quadraticCurveTo(1000, H - 108, W + this.margin, H - 150);
            ctx.lineTo(W + this.margin, H);
            ctx.closePath();
            ctx.fillStyle = p.sand;
            ctx.fill();

            // Sombreamento inferior da areia
            ctx.save();
            ctx.globalAlpha = 0.35;
            ctx.fillStyle = p.sandDark;
            ctx.beginPath();
            ctx.moveTo(-this.margin, H);
            ctx.lineTo(-this.margin, H - 60);
            ctx.quadraticCurveTo(400, H - 46, 760, H - 62);
            ctx.quadraticCurveTo(1020, H - 74, W + this.margin, H - 100);
            ctx.lineTo(W + this.margin, H);
            ctx.closePath();
            ctx.fill();
            ctx.restore();

            // Grãos / textura da areia
            ctx.save();
            ctx.globalAlpha = 0.4;
            for (let i = 0; i < 320; i++) {
                const x = -this.margin + rng() * (W + this.margin * 2);
                const y = H - 40 - rng() * 110;
                ctx.fillStyle = rng() > 0.5 ? p.sandLight : p.sandDark;
                const s = 1 + rng() * 2;
                ctx.fillRect(x, y, s, s * 0.7);
            }
            ctx.restore();

            // Rochas / pedrinhas sobre a areia
            for (let i = 0; i < 16; i++) {
                const x = 60 + rng() * (W - 120);
                const y = H - 60 - rng() * 60;
                const r = 4 + rng() * 12;
                ctx.beginPath();
                ctx.ellipse(x, y, r * 1.5, r * 0.8, rng() * 0.4, 0, Math.PI * 2);
                ctx.fillStyle = p.rockShade;
                ctx.fill();
                ctx.beginPath();
                ctx.ellipse(x - r * 0.2, y - r * 0.24, r * 1.1, r * 0.5, 0, 0, Math.PI * 2);
                ctx.fillStyle = p.midRock;
                ctx.fill();
            }

            // Formação rochosa ESQUERDA com caverna (termina em rampa sobre a areia)
            this.drawRockMass(ctx, rng, -this.margin, 520, H,
                [[-90, H - 250], [40, H - 320], [150, H - 300], [250, H - 210], [330, H - 148], [400, H - 104], [470, H - 72], [520, H - 54]],
                1.0);
            this.drawCave(ctx, 150, H - 92, 78, 46);

            // Formação rochosa DIREITA com caverna (começa em rampa sobre a areia)
            this.drawRockMass(ctx, rng, 800, W + this.margin, H,
                [[800, H - 54], [850, H - 72], [905, H - 106], [980, H - 210], [1080, H - 300], [1180, H - 262], [1280, H - 300], [W + this.margin, H - 250]],
                1.0);
            this.drawCave(ctx, 1085, H - 96, 72, 44);

            // Rochedo central baixo (meio do canal de areia)
            ctx.save();
            ctx.globalAlpha = 0.95;
            this.drawRockMass(ctx, rng, 470, 600, H,
                [[470, H - 60], [510, H - 92], [556, H - 74], [600, H - 46]],
                0.85);
            ctx.restore();

            // Alguns corais de médio porte (atrás dos detalhes da frente)
            const corals = this.pal.coral;
            const spots = [
                [110, H - 108, 0.9, 1], [268, H - 92, 0.8, 3], [420, H - 76, 0.75, 0],
                [560, H - 70, 1.0, 3], [700, H - 78, 0.85, 4], [824, H - 72, 0.9, 2],
                [980, H - 86, 0.8, 1], [1160, H - 96, 0.9, 0]
            ];
            spots.forEach((s, i) => {
                const color = corals[s[3] % corals.length];
                if (i % 3 === 0) this.drawBrainCoral(ctx, s[0], s[1], 16 * s[2], color);
                else if (i % 3 === 1) this.drawFanCoral(ctx, s[0], s[1], s[2] * 1.1, color);
                else this.drawAnemone(ctx, s[0], s[1], s[2], color);
            });

            // Vegetação marinha do fundo
            for (let i = 0; i < 22; i++) {
                const x = 30 + rng() * (W - 60);
                const h = 22 + rng() * 40;
                this.drawStaticSeaweed(ctx, x, H - 34 - rng() * 34, h, rng() > 0.5 ? p.plantA : p.plantB);
            }

            // Fósseis gigantes na zona abissal / desconhecida
            if (p.bones) {
                ctx.save();
                ctx.globalAlpha = 0.3;
                this.drawFossilRibs(ctx, 720, H - 96, 1.5, '#e8e2cf');
                this.drawFossilRibs(ctx, 300, H - 104, 0.9, '#e8e2cf');
                ctx.restore();
            }

            // Razos de luz sobre a areia (sombra/brilho)
            ctx.save();
            ctx.globalAlpha = 0.10;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(340, H - 120);
            ctx.quadraticCurveTo(600, H - 70, 900, H - 118);
            ctx.quadraticCurveTo(600, H - 96, 340, H - 132);
            ctx.closePath();
            ctx.fill();
            ctx.restore();

            // Névoa entre as camadas
            const haze = ctx.createLinearGradient(0, H - 260, 0, H);
            haze.addColorStop(0, 'rgba(0,0,0,0)');
            haze.addColorStop(1, p.haze);
            ctx.fillStyle = haze;
            ctx.fillRect(-this.margin, H - 260, W + this.margin * 2, 260);
        }

        /** Massa rochosa estilizada com topo irregular e brilho nas arestas */
        drawRockMass(ctx, rng, x0, x1, H, topPoints, alpha) {
            const p = this.pal;
            ctx.save();
            ctx.globalAlpha = alpha;

            const rock = new Path2D();
            rock.moveTo(x0, H);
            rock.lineTo(topPoints[0][0], topPoints[0][1]);
            for (let i = 1; i < topPoints.length; i++) {
                const a = topPoints[i - 1], b = topPoints[i];
                // pontos intermediários irregulares
                const steps = 4;
                for (let s = 1; s <= steps; s++) {
                    const t = s / steps;
                    const jx = a[0] + (b[0] - a[0]) * t + (rng() - 0.5) * 16;
                    const jy = a[1] + (b[1] - a[1]) * t + (rng() - 0.5) * 14;
                    rock.lineTo(jx, jy);
                }
            }
            rock.lineTo(x1, H);
            rock.closePath();

            const g = ctx.createLinearGradient(0, H - 360, 0, H);
            g.addColorStop(0, p.rockLight);
            g.addColorStop(0.45, p.midRock);
            g.addColorStop(1, p.rockShade);
            ctx.fillStyle = g;
            ctx.fill(rock);

            // Arestas iluminadas
            ctx.strokeStyle = 'rgba(150, 220, 255, 0.28)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(topPoints[0][0], topPoints[0][1]);
            for (let i = 1; i < topPoints.length; i++) {
                const a = topPoints[i - 1], b = topPoints[i];
                ctx.quadraticCurveTo((a[0] + b[0]) / 2, Math.min(a[1], b[1]) - 8, b[0], b[1]);
            }
            ctx.stroke();

            // Fendas / textura
            ctx.strokeStyle = 'rgba(2, 16, 26, 0.5)';
            ctx.lineWidth = 2;
            for (let i = 0; i < 14; i++) {
                const x = x0 + rng() * (x1 - x0);
                const y = H - 30 - rng() * 180;
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.quadraticCurveTo(x + 10, y + 14, x + 4, y + 32);
                ctx.stroke();
            }
            ctx.restore();
        }

        /** Caverna escura (abertura em arco na rocha) */
        drawCave(ctx, x, y, w, h) {
            const p = this.pal;
            ctx.save();
            const grad = ctx.createRadialGradient(x, y + h * 0.4, 2, x, y + h * 0.4, w);
            grad.addColorStop(0, 'rgba(0, 0, 0, 1)');
            grad.addColorStop(0.7, 'rgba(2, 10, 20, 0.96)');
            grad.addColorStop(1, 'rgba(4, 20, 34, 0.75)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(x - w, y + h * 1.5);
            ctx.quadraticCurveTo(x - w, y - h, x, y - h);
            ctx.quadraticCurveTo(x + w, y - h, x + w, y + h * 1.5);
            ctx.closePath();
            ctx.fill();

            // borda superior iluminada
            ctx.strokeStyle = 'rgba(160, 225, 255, 0.22)';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(x - w, y + h * 1.2);
            ctx.quadraticCurveTo(x - w, y - h, x, y - h);
            ctx.quadraticCurveTo(x + w, y - h, x + w, y + h * 1.2);
            ctx.stroke();
            ctx.restore();
        }

        /** Costelas de fóssil gigante (regiões abissais) */
        drawFossilRibs(ctx, x, y, scale, color) {
            ctx.save();
            ctx.translate(x, y);
            ctx.scale(scale, scale);
            ctx.strokeStyle = color;
            ctx.lineWidth = 4;
            ctx.lineCap = 'round';
            // coluna
            ctx.beginPath();
            ctx.moveTo(-80, 0);
            ctx.quadraticCurveTo(0, 14, 84, -2);
            ctx.stroke();
            for (let i = -4; i <= 4; i++) {
                const bx = i * 18;
                const by = i * 1.4;
                ctx.beginPath();
                ctx.moveTo(bx, by);
                ctx.quadraticCurveTo(bx + 4, -26, bx + 16, -38);
                ctx.stroke();
            }
            ctx.restore();
        }
    }

    global.EnvironmentRenderer = EnvironmentRenderer;
})(window);

/**
 * PARTE 2 - Detalhes do cenário, primeiro plano e renderização por frame
 */
(function (global) {
    'use strict';

    const proto = global.EnvironmentRenderer.prototype;

    // ============================================================
    // ELEMENTOS DE CENÁRIO (CORAlS, ALGAS, PEDRAS, CONCHAS)
    // ============================================================

    proto.drawBrainCoral = function (ctx, x, y, r, color) {
        ctx.save();
        ctx.translate(x, y);
        // base sombreada
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath();
        ctx.ellipse(0, r * 0.18, r * 1.15, r * 0.34, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        const grad = ctx.createLinearGradient(0, -r, 0, r);
        grad.addColorStop(0, color);
        grad.addColorStop(1, 'rgba(10, 40, 50, 0.9)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(0, 0, r, r * 0.86, 0, 0, Math.PI * 2);
        ctx.fill();

        // padrão de "cérebro"
        ctx.strokeStyle = 'rgba(8, 30, 34, 0.55)';
        ctx.lineWidth = 1.6;
        for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            const yy = -r * 0.6 + i * (r * 0.3);
            ctx.moveTo(-r * 0.86, yy);
            ctx.bezierCurveTo(-r * 0.3, yy - r * 0.22, r * 0.3, yy + r * 0.22, r * 0.86, yy - r * 0.05);
            ctx.stroke();
        }
        // luz superior
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(-r * 0.25, -r * 0.42, r * 0.42, r * 0.2, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    };

    proto.drawTubeCoral = function (ctx, x, y, scale, color) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);
        const tubes = 5;
        for (let i = 0; i < tubes; i++) {
            const tx = -12 + i * 6 + (i % 2) * 2;
            const h = 20 + ((i * 37) % 17);
            const w = 4.4 - Math.abs(i - 2) * 0.4;
            ctx.beginPath();
            ctx.moveTo(tx - w, 0);
            ctx.lineTo(tx - w * 0.85, -h);
            ctx.quadraticCurveTo(tx, -h - 4, tx + w * 0.85, -h);
            ctx.lineTo(tx + w, 0);
            ctx.closePath();
            const g = ctx.createLinearGradient(tx, -h, tx + w, 0);
            g.addColorStop(0, '#ffd9b0');
            g.addColorStop(1, color);
            ctx.fillStyle = g;
            ctx.fill();
            ctx.strokeStyle = 'rgba(30, 12, 4, 0.45)';
            ctx.lineWidth = 1.4;
            ctx.stroke();
            // abertura escura do tubo
            ctx.beginPath();
            ctx.ellipse(tx, -h, w * 0.85, 2.2, 0, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(40, 14, 40, 0.85)';
            ctx.fill();
        }
        ctx.restore();
    };

    proto.drawFanCoral = function (ctx, x, y, scale, color) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.6;
        ctx.lineCap = 'round';
        const branches = 7;
        for (let i = 0; i < branches; i++) {
            const a = -Math.PI / 2 + (i / (branches - 1) - 0.5) * 1.9;
            const len = 26 + ((i * 53) % 18);
            const ex = Math.cos(a) * len;
            const ey = Math.sin(a) * len;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(ex * 0.4, ey * 0.7, ex, ey);
            ctx.stroke();
            // raminhos com pólipos
            for (let k = 1; k <= 3; k++) {
                const t = k / 3.4;
                const bx = ex * t;
                const by = ey * t;
                ctx.beginPath();
                ctx.moveTo(bx, by);
                ctx.lineTo(bx + Math.cos(a - 0.6) * 7, by + Math.sin(a - 0.6) * 7);
                ctx.moveTo(bx, by);
                ctx.lineTo(bx + Math.cos(a + 0.6) * 7, by + Math.sin(a + 0.6) * 7);
                ctx.stroke();
            }
        }
        // base
        ctx.fillStyle = 'rgba(20, 40, 60, 0.9)';
        ctx.beginPath();
        ctx.ellipse(0, 2, 9, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    };

    proto.drawAnemone = function (ctx, x, y, scale, color) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);
        // corpo
        const g = ctx.createLinearGradient(0, -18, 0, 6);
        g.addColorStop(0, color);
        g.addColorStop(1, 'rgba(60, 20, 60, 0.9)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(-13, 4);
        ctx.quadraticCurveTo(-9, -18, 0, -18);
        ctx.quadraticCurveTo(9, -18, 13, 4);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(20, 10, 30, 0.5)';
        ctx.lineWidth = 1.4;
        ctx.stroke();

        // tentáculos em leque
        ctx.lineCap = 'round';
        for (let i = 0; i < 16; i++) {
            const a = -Math.PI + (i / 15) * Math.PI;
            const len = 14 + ((i * 29) % 10);
            const ex = Math.cos(a) * len * 0.85;
            const ey = Math.sin(a) * len - 16;
            ctx.strokeStyle = i % 2 === 0 ? '#ffffff' : color;
            ctx.globalAlpha = 0.9;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, -16);
            ctx.quadraticCurveTo(ex * 0.6, ey * 0.85, ex, ey);
            ctx.stroke();
        }
        ctx.restore();
    };

    proto.drawStaticSeaweed = function (ctx, x, y, h, color) {
        ctx.save();
        ctx.translate(x, y);
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        const leaves = Math.floor(h / 12);
        for (let i = 0; i < leaves; i++) {
            const t = i / leaves;
            const ly = -14 - t * h;
            const dir = i % 2 === 0 ? 1 : -1;
            ctx.beginPath();
            ctx.moveTo(0, ly + 6);
            ctx.quadraticCurveTo(dir * 9, ly, dir * 13, ly - 8);
            ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(3, -h * 0.5, 0, -h);
        ctx.stroke();
        ctx.restore();
    };

    proto.drawStaticGrass = function (ctx, x, y, scale, color) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.2;
        ctx.lineCap = 'round';
        for (let i = -2; i <= 2; i++) {
            ctx.beginPath();
            ctx.moveTo(i * 2.6, 0);
            ctx.quadraticCurveTo(i * 5, -10, i * 7.5, -19 - Math.abs(i) * 2);
            ctx.stroke();
        }
        ctx.restore();
    };

    proto.drawShell = function (ctx, x, y, s, color) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(s, s);
        ctx.beginPath();
        ctx.moveTo(-7, 0);
        ctx.quadraticCurveTo(0, -9, 7, 0);
        ctx.quadraticCurveTo(0, 4, -7, 0);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = 'rgba(60, 40, 20, 0.5)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        for (let i = -2; i <= 2; i++) {
            ctx.beginPath();
            ctx.moveTo(0, 3);
            ctx.lineTo(i * 3, -6);
            ctx.stroke();
        }
        ctx.restore();
    };

    // ============================================================
    // CAMADA 3 (DETALHES): corais coloridos, anêmonas, algas, conchas
    // ============================================================
    proto.buildNear = function (ctx, rng) {
        const W = this.width, H = this.height, p = this.pal;
        const c = p.coral;

        // Sombras suaves para "assentar" os elementos na areia
        ctx.save();
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = '#031420';
        for (let i = 0; i < 12; i++) {
            const x = 60 + rng() * (W - 120);
            const y = H - 34 - rng() * 66;
            ctx.beginPath();
            ctx.ellipse(x, y, 20 + rng() * 22, 5 + rng() * 3, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        // Conjuntos de corais coloridos (referência: recife vivo)
        const groups = [
            { x: 96, y: H - 30, type: 'anemone', s: 1.0, col: c[0] },
            { x: 132, y: H - 36, type: 'fan', s: 1.0, col: c[1] },
            { x: 196, y: H - 26, type: 'brain', s: 15, col: c[3] },
            { x: 372, y: H - 24, type: 'tube', s: 1.1, col: '#e07a3a' },
            { x: 420, y: H - 30, type: 'grass', s: 1.1, col: p.plantC },
            { x: 604, y: H - 26, type: 'brain', s: 13, col: c[3] },
            { x: 648, y: H - 24, type: 'brain', s: 9, col: c[4] },
            { x: 838, y: H - 30, type: 'tube', s: 1.35, col: '#c9631f' },
            { x: 892, y: H - 26, type: 'anemone', s: 0.85, col: c[5] },
            { x: 1042, y: H - 40, type: 'fan', s: 1.2, col: c[1] },
            { x: 1096, y: H - 28, type: 'grass', s: 1.0, col: p.plantA },
            { x: 1188, y: H - 34, type: 'tube', s: 1.0, col: '#d9743a' }
        ];
        groups.forEach(g => {
            if (g.type === 'anemone') this.drawAnemone(ctx, g.x, g.y, g.s, g.col);
            else if (g.type === 'fan') this.drawFanCoral(ctx, g.x, g.y, g.s, g.col);
            else if (g.type === 'brain') this.drawBrainCoral(ctx, g.x, g.y, g.s, g.col);
            else if (g.type === 'tube') this.drawTubeCoral(ctx, g.x, g.y, g.s, g.col);
            else this.drawStaticGrass(ctx, g.x, g.y, g.s, g.col);
        });

        // Conchas e pedrinhas pequenas
        for (let i = 0; i < 10; i++) {
            this.drawShell(ctx, 80 + rng() * (W - 160), H - 24 - rng() * 30, 0.8 + rng() * 0.7,
                rng() > 0.5 ? '#f3e2c8' : '#e8cbb0');
        }

        // Tufos de grama espalhados
        for (let i = 0; i < 16; i++) {
            this.drawStaticGrass(ctx, 40 + rng() * (W - 80), H - 18 - rng() * 30, 0.7 + rng() * 0.5,
                rng() > 0.5 ? p.plantA : p.plantC);
        }

        // Estrela-do-mar decorativa
        ctx.save();
        ctx.translate(300, H - 22);
        ctx.rotate(0.3);
        ctx.scale(0.85, 0.85);
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
            const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
            const r = i % 2 === 0 ? 12 : 5;
            const x = Math.cos(a) * r;
            const y = Math.sin(a) * r * 0.9;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fillStyle = '#e4643c';
        ctx.fill();
        ctx.restore();
    };

    // ============================================================
    // PRIMEIRO PLANO: faixa inferior + vinheta (nunca cobre o jogador)
    // ============================================================
    proto.buildForeground = function (ctx, rng) {
        const W = this.width, H = this.height, p = this.pal;

        // Faixa escura no rodapé (abaixo da área jogável: jogador fica até y=665)
        const grad = ctx.createLinearGradient(0, H - 34, 0, H);
        grad.addColorStop(0, 'rgba(3, 14, 24, 0.15)');
        grad.addColorStop(1, 'rgba(1, 8, 16, 0.85)');
        ctx.fillStyle = grad;
        ctx.fillRect(-this.margin, H - 34, W + this.margin * 2, 34);

        // Cascalho escuro
        for (let i = 0; i < 90; i++) {
            const x = -this.margin + rng() * (W + this.margin * 2);
            const y = H - 30 + rng() * 28;
            ctx.globalAlpha = 0.4 + rng() * 0.4;
            ctx.fillStyle = rng() > 0.6 ? p.sandDark : '#04121e';
            const s = 1 + rng() * 3.4;
            ctx.beginPath();
            ctx.ellipse(x, y, s * 1.6, s, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Vinheta geral (foca a atenção no centro, não esconde criaturas)
        const vg = ctx.createRadialGradient(W / 2, H * 0.52, H * 0.28, W / 2, H * 0.55, H * 0.95);
        vg.addColorStop(0, 'rgba(0,0,0,0)');
        vg.addColorStop(1, `rgba(0, 8, 18, ${p.vignette})`);
        ctx.fillStyle = vg;
        ctx.fillRect(-this.margin, 0, W + this.margin * 2, H);

        // Escurecimento das bordas laterais (profundidade)
        const left = ctx.createLinearGradient(-this.margin, 0, 70, 0);
        left.addColorStop(0, 'rgba(0, 10, 20, 0.5)');
        left.addColorStop(1, 'rgba(0, 10, 20, 0)');
        ctx.fillStyle = left;
        ctx.fillRect(-this.margin, 0, this.margin + 70, H);
        const right = ctx.createLinearGradient(W + this.margin, 0, W - 70, 0);
        right.addColorStop(0, 'rgba(0, 10, 20, 0.5)');
        right.addColorStop(1, 'rgba(0, 10, 20, 0)');
        ctx.fillStyle = right;
        ctx.fillRect(W - 70, 0, this.margin + 70, H);
    };

    // ============================================================
    // RENDERIZAÇÃO POR FRAME
    // ============================================================

    /** Desenha tudo que fica ATRÁS das criaturas/jogador */
    proto.drawBack = function (ctx, dt, player) {
        this.time += dt;
        const L = this.layers;
        if (!L.far) return;

        const px = player ? player.x - this.width / 2 : 0;
        const py = player ? player.y - this.height / 2 : 0;

        const off = [
            { l: L.far, kx: 0.012, ky: 0.008 },
            { l: L.mid, kx: 0.030, ky: 0.016 },
            { l: L.near, kx: 0.060, ky: 0.028 }
        ];

        for (const o of off) {
            ctx.drawImage(o.l.canvas, -this.margin - px * o.kx, -py * o.ky);
        }

        // Raios de luz animados
        this.drawLightShafts(ctx);
        // Neve marinha
        this.drawMarineSnow(ctx, dt);
        // Algas balançando em primeiro plano de cenário
        this.drawSwayingKelp(ctx);
        // Motes bioluminescentes (zonas abissal/desconhecida)
        if (this.pal.glowMotes > 0) this.drawGlowMotes(ctx, dt);
    };

    /** Desenha tudo que fica NA FRENTE (faixa inferior + vinheta) */
    proto.drawFront = function (ctx) {
        const L = this.layers;
        if (!L.fg) return;
        ctx.drawImage(L.fg.canvas, -this.margin, 0);
    };

    proto.drawLightShafts = function (ctx) {
        const p = this.pal;
        if (p.lightShaft <= 0.025) return;
        const t = this.time;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 5; i++) {
            const sway = Math.sin(t * 0.22 + i * 1.7) * 46;
            const x = 90 + i * 250 + sway;
            const w = 46 + Math.sin(t * 0.31 + i) * 16;
            const grad = ctx.createLinearGradient(x, 0, x + 120, this.height);
            grad.addColorStop(0, `rgba(190, 245, 255, ${p.lightShaft})`);
            grad.addColorStop(0.6, `rgba(150, 230, 255, ${p.lightShaft * 0.5})`);
            grad.addColorStop(1, 'rgba(120, 200, 255, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(x - w * 0.5, -20);
            ctx.lineTo(x + w * 0.5, -20);
            ctx.lineTo(x + 150, this.height * 0.95);
            ctx.lineTo(x + 150 - w * 2.2, this.height * 0.95);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
    };

    proto.drawMarineSnow = function (ctx, dt) {
        ctx.save();
        for (const s of this.snow) {
            s.y += s.vy * dt;
            s.phase += dt * 0.8;
            if (s.y > this.height + 6) {
                s.y = -6;
                s.x = Math.random() * this.width;
            }
            const x = s.x + Math.sin(s.phase) * s.sway;
            ctx.globalAlpha = s.a;
            ctx.fillStyle = '#dff6ff';
            ctx.beginPath();
            ctx.arc(x, s.y, s.r, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    };

    proto.drawGlowMotes = function (ctx, dt) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (const m of this.motes) {
            m.y += m.vy * dt;
            m.phase += dt * 1.6;
            if (m.y < -20) {
                m.y = this.height + 20;
                m.x = Math.random() * this.width;
            }
            const x = m.x + Math.sin(m.phase) * m.r;
            const size = 12 + Math.sin(m.phase * 1.4) * 5;
            ctx.globalAlpha = m.a;
            ctx.drawImage(this.glowSprite, x - size / 2, m.y - size / 2, size, size);
        }
        ctx.restore();
    };

    /** Algas compridas que balançam no cenário (animação contínua) */
    proto.drawSwayingKelp = function (ctx) {
        const p = this.pal;
        const H = this.height;
        const kelp = [
            { x: 118, y: H - 52, h: 250, w: 9, c: p.plantC, ph: 0 },
            { x: 156, y: H - 44, h: 186, w: 7, c: p.plantA, ph: 1.2 },
            { x: 192, y: H - 38, h: 128, w: 5.5, c: p.plantB, ph: 2.4 },
            { x: 1162, y: H - 48, h: 226, w: 8, c: p.plantC, ph: 0.7 },
            { x: 1124, y: H - 40, h: 164, w: 6.5, c: p.plantA, ph: 3.1 },
            { x: 1088, y: H - 36, h: 116, w: 5, c: p.plantB, ph: 2.1 },
            { x: 366, y: H - 30, h: 104, w: 5, c: p.plantA, ph: 1.8 },
            { x: 902, y: H - 32, h: 112, w: 5.2, c: p.plantC, ph: 2.6 }
        ];

        const t = this.time;
        const leafA = this.zone === 'unknown' ? '#9b7fe0' : '#8fdc95';
        const leafB = this.zone === 'abyss' ? '#4e9c86' : '#6cc47a';
        ctx.save();
        ctx.lineCap = 'round';
        for (const k of kelp) {
            const segs = 6;
            // sombra do talo (dá volume/contraste contra o fundo azul)
            ctx.strokeStyle = 'rgba(2, 26, 24, 0.55)';
            ctx.lineWidth = k.w * 1.7;
            ctx.globalAlpha = 1;
            ctx.beginPath();
            ctx.moveTo(k.x, k.y);
            let px = k.x, py = k.y;
            for (let i = 1; i <= segs; i++) {
                const f = i / segs;
                const sway = Math.sin(t * 1.1 + k.ph + f * 2.4) * (8 + f * 22);
                const nx = k.x + sway * f;
                const ny = k.y - k.h * f;
                ctx.quadraticCurveTo(px + sway * 0.4, (py + ny) / 2, nx, ny);
                px = nx;
                py = ny;
                // folhinhas
                if (i % 2 === 0) {
                    ctx.save();
                    ctx.strokeStyle = leafA;
                    ctx.lineWidth = k.w * 0.55;
                    ctx.beginPath();
                    ctx.moveTo(nx, ny);
                    ctx.quadraticCurveTo(nx + 7, ny - 3, nx + 12, ny - 10);
                    ctx.stroke();
                    ctx.strokeStyle = leafB;
                    ctx.beginPath();
                    ctx.moveTo(nx, ny + 5);
                    ctx.quadraticCurveTo(nx - 7, ny + 2, nx - 12, ny - 6);
                    ctx.stroke();
                    ctx.restore();
                }
            }
            ctx.stroke();
        }
        ctx.restore();
    };

    // ============================================================
    // OVERLAYS DE ESTADO (dano / morte) usados pelo game.js
    // ============================================================
    proto.drawDamageOverlay = function (ctx, intensity) {
        if (intensity <= 0) return;
        const W = this.width, H = this.height;
        ctx.save();
        const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.22, W / 2, H / 2, H * 0.8);
        g.addColorStop(0, 'rgba(255, 0, 60, 0)');
        g.addColorStop(1, `rgba(255, 0, 60, ${0.55 * intensity})`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
    };

    proto.drawDeathOverlay = function (ctx, progress) {
        const W = this.width, H = this.height;
        const p = Math.max(0, Math.min(1, progress));
        ctx.save();
        ctx.fillStyle = `rgba(1, 6, 14, ${0.72 * p})`;
        ctx.fillRect(0, 0, W, H);
        const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.1, W / 2, H / 2, H * 0.85);
        g.addColorStop(0, 'rgba(120, 0, 30, 0)');
        g.addColorStop(1, `rgba(120, 0, 30, ${0.6 * p})`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
    };
})(window);
