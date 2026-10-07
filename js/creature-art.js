/**
 * DEEP HUNT - Creature Art Module (2D Game Art Sprites)
 * ---------------------------------------------------------------
 * Renderizador de sprites vetoriais estilizados para TODAS as criaturas.
 * Base visual: referência "DEEP HUNT - Complete Creature Reference Sheet".
 *
 * Todas as funções desenham a criatura em coordenadas LOCAIS:
 *   +X = direção para onde a criatura está nadando
 *   (0,0) = centro do corpo / centro de colisão da criatura
 *
 * Módulo puramente visual: NÃO altera a lógica de jogo, colisão ou IA.
 */
(function (global) {
    'use strict';

    // ============================================================
    // HELPERS DE DESENHO
    // ============================================================

    const OUTLINE = 'rgba(3, 12, 26, 0.92)';
    const OUTLINE_SOFT = 'rgba(6, 24, 46, 0.65)';
    const TEETH = '#f7fbff';
    const MAW_DARK = '#4a0a12';
    const MAW_MID = '#8e1420';

    function path(build) {
        const p = new Path2D();
        build(p);
        return p;
    }

    function poly(pts, close = true) {
        return path(p => {
            p.moveTo(pts[0][0], pts[0][1]);
            for (let i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1]);
            if (close) p.closePath();
        });
    }

    function ell(cx, cy, rx, ry, rot = 0) {
        return path(p => p.ellipse(cx, cy, Math.abs(rx), Math.abs(ry), rot, 0, Math.PI * 2));
    }

    function ring(cx, cy, r, rot = 0, a0 = 0, a1 = Math.PI * 2) {
        return path(p => p.arc(cx, cy, Math.abs(r), a0, a1, rot > 0));
    }

    function roundRect(x, y, w, h, r) {
        return path(p => {
            const rr = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
            p.moveTo(x + rr, y);
            p.arcTo(x + w, y, x + w, y + h, rr);
            p.arcTo(x + w, y + h, x, y + h, rr);
            p.arcTo(x, y + h, x, y, rr);
            p.arcTo(x, y, x + w, y, rr);
            p.closePath();
        });
    }

    /** Preenche e contorna um Path2D com o estilo clássico "outline cartoon" */
    function paint(ctx, p, fill, strokeColor, lineWidth) {
        if (fill) { ctx.fillStyle = fill; ctx.fill(p); }
        if (strokeColor !== null) {
            ctx.strokeStyle = strokeColor || OUTLINE;
            ctx.lineWidth = lineWidth === undefined ? 2.4 : lineWidth;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            ctx.stroke(p);
        }
    }

    /** Gradiente vertical suave (dorso escuro -> barriga clara) */
    function vgrad(ctx, y0, y1, top, bottom) {
        const g = ctx.createLinearGradient(0, y0, 0, y1);
        g.addColorStop(0, top);
        g.addColorStop(1, bottom);
        return g;
    }

    function shade(ctx, p, color, alpha) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.fill(p);
        ctx.restore();
    }

    /** Olho estilizado com esclera, íris, pupila e brilho especular */
    function eye(ctx, x, y, r, opts = {}) {
        const pupil = opts.pupil || '#080d16';
        const iris = opts.iris || '#f4d35e';
        const angry = opts.angry || 0;      // inclinação da "sobrancelha"
        const lookX = opts.lookX === undefined ? 0.18 : opts.lookX;
        const lookY = opts.lookY === undefined ? -0.05 : opts.lookY;
        const sclera = opts.sclera || '#ffffff';

        if (opts.glow) {
            ctx.save();
            ctx.shadowColor = opts.glow;
            ctx.shadowBlur = 10;
            paint(ctx, ell(x, y, r, r), sclera, null);
            ctx.restore();
        } else {
            paint(ctx, ell(x, y, r, r), sclera, OUTLINE, Math.max(1, r * 0.28));
        }

        paint(ctx, ell(x + r * lookX, y + r * lookY, r * 0.52, r * 0.6), iris, null);
        paint(ctx, ell(x + r * lookX, y + r * lookY, r * 0.26, r * 0.5), pupil, null);
        // brilho
        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        ctx.beginPath();
        ctx.arc(x + r * (lookX - 0.28), y + r * (lookY - 0.36), Math.max(0.7, r * 0.2), 0, Math.PI * 2);
        ctx.fill();

        if (angry > 0) {
            // sobrancelha / pálpebra raivosa
            const lid = poly([
                [x - r * 1.15, y - r * 0.85],
                [x + r * 1.15, y - r * (0.85 - angry * 0.55)],
                [x + r * 1.15, y - r * 1.4],
                [x - r * 1.15, y - r * 1.4]
            ]);
            ctx.save();
            ctx.beginPath();
            ctx.rect(x - r * 2, y - r * 3, r * 4, r * 3);
            ctx.clip();
            paint(ctx, lid, opts.skin || '#2b4159', null);
            ctx.restore();
        }
    }

    /**
     * Boca/presas abertas: pivô na "garganta", abrindo para +X.
     * open = 0 (fechada) .. 1 (escancarada)
     */
    function maw(ctx, cfg) {
        const px = cfg.x, py = cfg.y;
        const L = cfg.len;
        const spread = cfg.spread === undefined ? 0.16 : cfg.spread;
        const open = Math.max(0, Math.min(1, cfg.open || 0));
        const openAng = spread + open * (cfg.maxOpen === undefined ? 0.75 : cfg.maxOpen);
        const teeth = cfg.teeth === undefined ? 9 : cfg.teeth;
        const size = cfg.size === undefined ? 5 : cfg.size;
        const tColor = cfg.teethColor || TEETH;

        const tipUp = [px + Math.cos(-spread) * L, py + Math.sin(-spread) * L];
        const tipDn = [px + Math.cos(openAng) * L, py + Math.sin(openAng) * L];

        // Cavidade bucal
        const cavity = poly([[px, py], tipUp, tipDn]);
        const g = ctx.createLinearGradient(px, py, px + L, py);
        g.addColorStop(0, MAW_DARK);
        g.addColorStop(1, MAW_MID);
        paint(ctx, cavity, g, OUTLINE, 2.2);

        // Língua
        if (open > 0.25) {
            const tongue = poly([
                [px + L * 0.28, py + Math.sin(openAng * 0.45) * L * 0.35],
                [px + L * 0.86, py + Math.sin(openAng) * L * 0.72],
                [px + L * 0.5, py + Math.sin(openAng) * L * 0.52]
            ]);
            shade(ctx, tongue, '#c6485a', 0.85);
        }

        // Fileiras de dentes
        for (let i = 0; i < teeth; i++) {
            const t = 0.16 + (i / teeth) * 0.78;
            const upX = px + Math.cos(-spread) * L * t;
            const upY = py + Math.sin(-spread) * L * t;
            const wn = size * (1 - t * 0.35);
            paint(ctx, poly([
                [upX - wn * 0.5, upY - 0.6],
                [upX + wn * 0.5, upY - 0.6],
                [upX, upY + wn * 1.5]
            ]), tColor, OUTLINE_SOFT, 1);

            const dnX = px + Math.cos(openAng) * L * t;
            const dnY = py + Math.sin(openAng) * L * t;
            paint(ctx, poly([
                [dnX - wn * 0.5, dnY + 0.6],
                [dnX + wn * 0.5, dnY + 0.6],
                [dnX, dnY - wn * 1.5]
            ]), tColor, OUTLINE_SOFT, 1);
        }
    }

    /** Nadadeira triangular com borda traseira curva */
    function finPath(pts, curve) {
        return path(p => {
            p.moveTo(pts[0][0], pts[0][1]);
            p.lineTo(pts[1][0], pts[1][1]);
            if (curve) p.quadraticCurveTo(curve[0], curve[1], pts[2][0], pts[2][1]);
            else p.lineTo(pts[2][0], pts[2][1]);
            p.closePath();
        });
    }

    /** Pele com pontinhos/malhas (textura estilizada) */
    function speckle(ctx, rng, count, x0, y0, x1, y1, color, size = 1.6, alpha = 0.5) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        for (let i = 0; i < count; i++) {
            const x = x0 + rng() * (x1 - x0);
            const y = y0 + rng() * (y1 - y0);
            ctx.beginPath();
            ctx.arc(x, y, size * (0.5 + rng()), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    function rnd(seed) {
        let s = seed || 7;
        return function () {
            s = (s * 1664525 + 1013904223) % 4294967296;
            return s / 4294967296;
        };
    }

    // ============================================================
    // TILÁPIA / FALLBACK
    // ============================================================
    function fallback(ctx, c) {
        const r = c.type.radius;
        paint(ctx, ell(0, 0, r, r * 0.68), c.type.color || '#7fd4ef', OUTLINE, 2.4);
        paint(ctx, poly([[-r, 0], [-r * 1.7, -r * 0.6], [-r * 1.7, r * 0.6]]), c.type.color || '#7fd4ef', OUTLINE, 2.2);
        eye(ctx, r * 0.45, -r * 0.16, Math.max(2.2, r * 0.2));
    }

    // ============================================================
    // CRIATURAS COMUNS
    // ============================================================

    /** Peixe Pequeno (sardinha prateada) */
    function smallFish(ctx, c) {
        const wig = c.wig;
        const body = path(p => {
            p.moveTo(17, 0);
            p.bezierCurveTo(10, -8.5, -2, -10, -11, -7);
            p.bezierCurveTo(-18, -5, -20, 5, -13, 8);
            p.bezierCurveTo(-2, 11, 10, 8.5, 17, 0);
            p.closePath();
        });

        // Cauda
        paint(ctx, poly([[-12, 0], [-22, -7.5 + wig * 2], [-19, 0], [-22, 7.5 + wig * 2]]), '#8fbfd8', OUTLINE, 2);
        // Dorsal
        paint(ctx, finPath([[-4, -9], [2, -16], [9, -8]], [4, -13]), '#8fbfd8', OUTLINE, 2);
        // Peitoral
        paint(ctx, finPath([[2, 5], [7, 12.5], [-3, 8]], null), '#a7d3e8', OUTLINE, 2);

        paint(ctx, body, vgrad(ctx, -10, 10, '#5f9dc0', '#e7f4fb'), OUTLINE, 2.4);
        // faixa lateral prateada
        ctx.save();
        ctx.globalAlpha = 0.75;
        ctx.strokeStyle = '#f2fbff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(14, -1.5);
        ctx.quadraticCurveTo(0, 1.6, -12, -0.6);
        ctx.stroke();
        ctx.restore();
        // guelras
        ctx.strokeStyle = 'rgba(6,30,52,0.5)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(9, -5);
        ctx.quadraticCurveTo(12, 0, 9, 5);
        ctx.stroke();

        eye(ctx, 11, -1.6, 3.2, { iris: '#12314a', lookX: 0.2 });
    }

    /** Peixe-Palhaço */
    function clownfish(ctx, c) {
        const wig = c.wig;
        const body = path(p => {
            p.moveTo(18, 0);
            p.bezierCurveTo(12, -10.5, -2, -12.5, -12, -9.5);
            p.bezierCurveTo(-20, -7, -21, 7, -12, 10);
            p.bezierCurveTo(-1, 13, 12, 10, 18, 0);
            p.closePath();
        });

        paint(ctx, poly([[-12, 0], [-23, -9 + wig * 2], [-19, 0], [-23, 9 + wig * 2]]), '#ff9e2c', OUTLINE, 2);
        paint(ctx, finPath([[-3, -10], [3, -18], [10, -9]], [5, -15]), '#ff9e2c', OUTLINE, 2);
        paint(ctx, finPath([[1, 6], [6, 14], [-4, 9]], null), '#ffb74d', OUTLINE, 2);

        paint(ctx, body, vgrad(ctx, -12, 12, '#f4661b', '#ffa94d'), OUTLINE, 2.4);

        // 3 faixas brancas com bordas escuras
        [-7, 2, 10].forEach((bx, i) => {
            const w = i === 2 ? 5 : 6;
            const band = path(p => {
                p.moveTo(bx - w, -12);
                p.quadraticCurveTo(bx + 1.5, 0, bx - w * 0.6, 11.5);
                p.lineTo(bx + w * 0.6, 11.5);
                p.quadraticCurveTo(bx + 2.5, 0, bx + w, -12);
                p.closePath();
            });
            paint(ctx, band, '#fdfdfd', OUTLINE, 1.6);
        });

        // barbatanas com ponta preta
        ctx.fillStyle = '#111820';
        ctx.beginPath();
        ctx.moveTo(-7.5, -11.5);
        ctx.lineTo(-3.5, -11.5);
        ctx.lineTo(-5.5, -8.5);
        ctx.closePath();
        ctx.fill();

        eye(ctx, 12.5, -2, 3.4, { iris: '#20242c' });
    }

    /** Baiacu (Pufferfish) */
    function pufferfish(ctx, c) {
        const puff = 1 + (c.puffed || 0) * 0.18;
        const r = 13 * puff;
        const wig = c.wig;

        paint(ctx, poly([[-r * 0.95, 0], [-r * 1.75, -6 + wig], [-r * 1.5, 0], [-r * 1.75, 6 + wig]]), '#e2b23c', OUTLINE, 2);
        paint(ctx, finPath([[2, r * 0.55], [9, r * 0.95], [-2, r * 0.95]], null), '#f0c860', OUTLINE, 2);
        paint(ctx, finPath([[0, -r * 0.6], [6, -r * 1.05], [-3, -r * 0.95]], null), '#f0c860', OUTLINE, 2);

        paint(ctx, ell(0, 0, r, r * 0.95), vgrad(ctx, -r, r, '#f0c453', '#ffe6a1'), OUTLINE, 2.4);

        // espinhos
        ctx.fillStyle = '#c79018';
        for (let i = 0; i < 14; i++) {
            const a = (i / 14) * Math.PI * 2 - 0.6;
            const x = Math.cos(a) * r * 0.93;
            const y = Math.sin(a) * r * 0.9;
            ctx.beginPath();
            ctx.moveTo(x - 2.4, y + 2.2);
            ctx.lineTo(x + 2.4, y + 2.2);
            ctx.lineTo(x + Math.cos(a) * 5, y + Math.sin(a) * 5);
            ctx.closePath();
            ctx.fill();
        }

        // manchas escuras
        const rng = rnd(31);
        for (let i = 0; i < 12; i++) {
            const a = rng() * Math.PI * 2;
            const d = rng() * r * 0.72;
            ctx.save();
            ctx.globalAlpha = 0.35;
            paint(ctx, ell(Math.cos(a) * d, Math.sin(a) * d, 1.4 + rng() * 1.6, 1.2 + rng() * 1.4), '#7c5510', null);
            ctx.restore();
        }

        eye(ctx, r * 0.52, -r * 0.32, r * 0.3, { iris: '#1b2430', sclera: '#ffffff' });
        paint(ctx, ell(r * 0.92, r * 0.2, 3.4, 2.6), '#8c2b1f', OUTLINE_SOFT, 1.2);
    }

    /** Água-Viva (comum) */
    function jellyfish(ctx, c, params = {}) {
        const col = params.color || '#d99bff';
        const colDark = params.dark || '#8b3fd6';
        const glow = params.glow || '#e0aaff';
        const scale = params.scale || 1;
        const pulse = Math.sin(c.pulsePhase) * 0.12;

        ctx.save();
        ctx.scale(scale, scale);
        ctx.shadowColor = glow;
        ctx.shadowBlur = params.blur === undefined ? 16 : params.blur;

        // Tentáculos
        ctx.strokeStyle = col;
        ctx.lineWidth = 2.2;
        ctx.lineCap = 'round';
        for (let i = -3; i <= 3; i++) {
            const x0 = i * 4.2;
            ctx.beginPath();
            ctx.moveTo(x0, 2);
            ctx.bezierCurveTo(
                x0 + Math.sin(c.animTime * 1.6 + i) * 5, 12,
                x0 + Math.cos(c.animTime * 1.3 + i * 1.4) * 7, 22,
                x0 + Math.sin(c.animTime * 1.1 + i) * 6, 32 + (i % 2 === 0 ? 4 : 0)
            );
            ctx.stroke();
        }

        // Cúpula (bell) com borda recortada
        const bell = path(p => {
            p.moveTo(-16 * (1 + pulse), 0);
            p.bezierCurveTo(-16 * (1 + pulse), -20 - pulse * 16, 16 * (1 + pulse), -20 - pulse * 16, 16 * (1 + pulse), 0);
            // borda inferior ondulada
            const n = 6;
            for (let i = 0; i <= n; i++) {
                const x = 16 * (1 + pulse) - (i / n) * 32 * (1 + pulse);
                const y = i % 2 === 0 ? 4.5 : 0.5;
                p.lineTo(x, y);
            }
            p.closePath();
        });
        const g = ctx.createLinearGradient(0, -20, 0, 4);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.35, col);
        g.addColorStop(1, colDark);
        paint(ctx, bell, g, OUTLINE, 2.2);

        // segmentos internos radial
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.6;
        for (let i = -2; i <= 2; i++) {
            ctx.beginPath();
            ctx.moveTo(i * 5, -1);
            ctx.quadraticCurveTo(i * 4.2, -11, 0, -15);
            ctx.stroke();
        }
        ctx.restore();

        // núcleo luminoso
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.beginPath();
        ctx.arc(0, -8, 4.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    /** Caranguejo */
    function crab(ctx, c) {
        const step = Math.sin(c.animTime * 3);
        // patas
        ctx.strokeStyle = '#8c1220';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        for (let side = -1; side <= 1; side += 2) {
            for (let i = 0; i < 4; i++) {
                const x = -8 + i * 6;
                const off = Math.sin(c.animTime * 4 + i * 1.3) * 2.4;
                ctx.beginPath();
                ctx.moveTo(x, side * 7);
                ctx.quadraticCurveTo(x - 3, side * 13, x + 2, side * 16 + off);
                ctx.stroke();
            }
        }

        // garras
        [-1, 1].forEach(side => {
            const cx = 15, cy = side * 9 + step * 1.5;
            paint(ctx, poly([[cx - 4, cy + side * 4], [cx + 7, cy - side * 2], [cx + 2, cy + side * 5]], null), '#c1121f', OUTLINE, 2);
            paint(ctx, poly([[cx + 2, cy - side * 3], [cx + 11, cy - side * 6], [cx + 8, cy + side * 1]], null), '#e5383b', OUTLINE, 2);
            paint(ctx, ell(cx + 2, cy + side * 1.5, 4.6, 3.4, side * 0.3), '#e5383b', OUTLINE, 1.8);
        });

        // carapaça
        paint(ctx, ell(0, 0, 15, 10.5), '#c1121f', OUTLINE, 2.4);
        ctx.save();
        ctx.globalAlpha = 0.55;
        paint(ctx, ell(-1, -3.4, 11, 4.2), '#ff6b6b', null);
        ctx.restore();
        // textura da carapaça
        ctx.strokeStyle = 'rgba(60,10,14,0.55)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(-9, 0);
        ctx.quadraticCurveTo(0, 3.6, 9, 0);
        ctx.moveTo(-5, -6);
        ctx.quadraticCurveTo(0, -3.4, 5, -6);
        ctx.stroke();

        // olhos espetados
        [-1, 1].forEach(side => {
            ctx.strokeStyle = '#8c1220';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(4, side * 5);
            ctx.lineTo(6, side * 10);
            ctx.stroke();
            eye(ctx, 6.5, side * 10.6, 2.6, { iris: '#101820' });
        });
    }

    /** Peixe-Lanterna (abissal) */
    function lanternfish(ctx, c) {
        const wig = c.wig;
        const glow = 0.55 + 0.45 * Math.sin(c.animTime * 2.2);

        paint(ctx, poly([[-11, 0], [-22, -9 + wig * 2], [-18, 0], [-22, 9 + wig * 2]]), '#1b3a52', OUTLINE, 2);
        paint(ctx, finPath([[-2, -9], [4, -17], [11, -8]], [6, -14]), '#254e6b', OUTLINE, 2);

        const body = path(p => {
            p.moveTo(18, -1);
            p.bezierCurveTo(11, -10, -1, -10.5, -11, -8);
            p.bezierCurveTo(-17, -6, -17, 6, -10, 8);
            p.bezierCurveTo(2, 11, 12, 8, 18, -1);
            p.closePath();
        });
        paint(ctx, body, vgrad(ctx, -10, 10, '#0f2b3f', '#3c6c8c'), OUTLINE, 2.4);

        // fotóforos bioluminescentes
        ctx.save();
        ctx.shadowColor = '#5ce1ff';
        ctx.shadowBlur = 8;
        ctx.fillStyle = `rgba(120,235,255,${glow})`;
        for (let i = 0; i < 7; i++) {
            const x = -9 + i * 3.6;
            const y = 6.4 - Math.abs(i - 3) * 0.35;
            ctx.beginPath();
            ctx.arc(x, y, 1.7, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        // antena luminosa (lure)
        ctx.strokeStyle = '#67b7d6';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(12, -7);
        ctx.quadraticCurveTo(20, -18, 23, -14);
        ctx.stroke();
        ctx.save();
        ctx.shadowColor = '#ffe066';
        ctx.shadowBlur = 16;
        paint(ctx, ell(24, -13, 4.4, 4.4), '#fff3a0', null);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(24, -13, 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // dentes
        ctx.fillStyle = TEETH;
        for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            ctx.moveTo(8 + i * 2.6, 1.6);
            ctx.lineTo(9.6 + i * 2.6, 5.4);
            ctx.lineTo(11.2 + i * 2.6, 1.6);
            ctx.closePath();
            ctx.fill();
        }

        eye(ctx, 12.5, -3.4, 4.4, { iris: '#f4f4c1', lookX: 0.2 });
    }

    /** Lula Pequena */
    function smallSquid(ctx, c) {
        const j = Math.sin(c.animTime * 2.4) * 2;
        const body = path(p => {
            p.moveTo(14, 0);
            p.quadraticCurveTo(6, -7.5, -12, -5.6);
            p.quadraticCurveTo(-20, -3, -20, 0);
            p.quadraticCurveTo(-20, 3, -12, 5.6);
            p.quadraticCurveTo(6, 7.5, 14, 0);
            p.closePath();
        });
        // braços
        ctx.strokeStyle = '#d6336c';
        ctx.lineWidth = 2.6;
        ctx.lineCap = 'round';
        for (let i = -2; i <= 2; i++) {
            ctx.beginPath();
            ctx.moveTo(10, i * 2.2);
            ctx.quadraticCurveTo(24, i * 4.6 + j, 36, i * 5.6 + j * 1.4);
            ctx.stroke();
        }
        // dois tentáculos longos
        ctx.lineWidth = 1.8;
        [-1, 1].forEach(s => {
            ctx.beginPath();
            ctx.moveTo(11, s * 2);
            ctx.quadraticCurveTo(28, s * 8 + j, 44, s * 3.6 + j * 1.6);
            ctx.stroke();
        });

        paint(ctx, body, vgrad(ctx, -7, 7, '#ff5c8a', '#ffa8c0'), OUTLINE, 2.4);
        // nadadeiras traseiras
        paint(ctx, poly([[-12, -5], [-20, -11], [-21, -3]], null), '#ff87ad', OUTLINE, 1.8);
        paint(ctx, poly([[-12, 5], [-20, 11], [-21, 3]], null), '#ff87ad', OUTLINE, 1.8);
        // manchas
        const rng = rnd(17);
        for (let i = 0; i < 8; i++) {
            const x = -16 + rng() * 26;
            const y = (rng() - 0.5) * 8;
            ctx.save();
            ctx.globalAlpha = 0.35;
            paint(ctx, ell(x, y, 1.8, 1.4), '#8c1c47', null);
            ctx.restore();
        }

        eye(ctx, 7, -2, 4.2, { iris: '#1b1116', sclera: '#fff8e7' });
    }

    /** Moreia (enguia verde) - comum e gigante compartilham o corpo */
    function morayEel(ctx, c, params = {}) {
        const scales = params.scale || 1;
        const segs = params.segments || 7;
        const len = (params.length || 15) * scales;
        const thick = (params.thickness || 8) * scales;
        const colMain = params.color || '#7cae3a';
        const colDark = params.dark || '#3f5c1c';
        const colBelly = params.belly || '#d9e88a';
        const open = params.giant ? Math.max(0.45, c.mouthOpen) : 0.25 + c.mouthOpen * 0.4;

        ctx.save();
        // corpo serpentino
        const pts = [];
        for (let i = 0; i <= segs; i++) {
            const t = i / segs;
            const x = -t * len;
            const wob = Math.sin(c.animTime * 2.2 - t * 3.4) * (3 + 8 * t) * (params.giant ? 1.4 : 1);
            const y = wob;
            pts.push([x, y, thick * (1 - t * 0.62)]);
        }

        // dorsal contínua
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1] - pts[0][2]);
        for (const q of pts) ctx.lineTo(q[0], q[1] - q[2] * 1.35);
        ctx.strokeStyle = colDark;
        ctx.lineWidth = 2.6;
        ctx.stroke();

        // corpo
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1] - pts[0][2]);
        for (const q of pts) ctx.lineTo(q[0], q[1] - q[2]);
        for (let i = pts.length - 1; i >= 0; i--) ctx.lineTo(pts[i][0], pts[i][1] + pts[i][2]);
        ctx.closePath();
        const g = ctx.createLinearGradient(0, -thick, 0, thick);
        g.addColorStop(0, colDark);
        g.addColorStop(0.45, colMain);
        g.addColorStop(1, colBelly);
        ctx.fillStyle = g;
        ctx.fill();
        ctx.strokeStyle = OUTLINE;
        ctx.lineWidth = 2.3;
        ctx.stroke();

        // manchas (padrão de leopardo da moreia)
        const rng = rnd(params.giant ? 91 : 43);
        ctx.save();
        ctx.globalAlpha = 0.55;
        for (let i = 0; i < 22; i++) {
            const t = rng();
            const idx = Math.min(pts.length - 1, Math.round(t * segs));
            const q = pts[idx];
            const x = q[0] + (rng() - 0.5) * thick;
            const y = q[1] + (rng() - 0.5) * thick * 1.4;
            paint(ctx, ell(x, y, 2 + rng() * 2.6, 1.6 + rng() * 2), colDark, null);
        }
        ctx.restore();
        ctx.restore();

        // cabeça + mandíbula escancarada
        const headX = 0, headY = 0;
        ctx.save();
        ctx.translate(headX, headY);
        paint(ctx, path(p => {
            p.moveTo(14 * scales, -2.5 * scales);
            p.quadraticCurveTo(2 * scales, -thick - 1, -6 * scales, -thick * 0.9);
            p.quadraticCurveTo(-10 * scales, 0, -6 * scales, thick * 0.9);
            p.quadraticCurveTo(2 * scales, thick + 1, 14 * scales, 2.5 * scales);
            p.closePath();
        }), vgrad(ctx, -thick, thick, colDark, colBelly), OUTLINE, 2.3);

        // boca aberta com dentes agulha
        maw(ctx, {
            x: 2 * scales,
            y: -1.5 * scales,
            len: 22 * scales,
            spread: 0.1,
            open: open,
            maxOpen: 0.62,
            teeth: params.giant ? 11 : 7,
            size: 3.4 * scales,
            teethColor: '#fffbe8'
        });

        eye(ctx, 8 * scales, -4.5 * scales, 3.1 * scales, { iris: '#f0c419', angry: 0.5, skin: colDark });
        ctx.restore();
    }

    /** Cavalo-Marinho */
    function seahorse(ctx, c) {
        const bob = Math.sin(c.animTime * 1.6) * 1.6;
        ctx.save();
        ctx.translate(0, bob);

        // cauda enrolada
        ctx.strokeStyle = '#e0812a';
        ctx.lineWidth = 4.2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-2, 12);
        ctx.quadraticCurveTo(-8, 20, -1, 24);
        ctx.quadraticCurveTo(6, 26, 4, 19);
        ctx.stroke();

        // corpo
        const body = path(p => {
            p.moveTo(7, -12);
            p.bezierCurveTo(13, -6, 12, 4, 5, 13);
            p.bezierCurveTo(0, 18, -4, 16, -3, 8);
            p.bezierCurveTo(-2, 0, -6, -8, 2, -13);
            p.closePath();
        });
        paint(ctx, body, vgrad(ctx, -13, 13, '#f5b93c', '#e0812a'), OUTLINE, 2.3);
        // anéis do ventre
        ctx.strokeStyle = 'rgba(140, 70, 10, 0.45)';
        ctx.lineWidth = 1.3;
        for (let i = 0; i < 6; i++) {
            const y = -6 + i * 3.4;
            ctx.beginPath();
            ctx.moveTo(-2, y);
            ctx.quadraticCurveTo(4, y + 2, 9, y + 0.5);
            ctx.stroke();
        }
        // nadadeira dorsal
        ctx.fillStyle = 'rgba(255, 226, 150, 0.85)';
        const dw = Math.sin(c.animTime * 8) * 1.6;
        paint(ctx, path(p => {
            p.moveTo(-4, -2);
            p.quadraticCurveTo(-12 - dw, 0, -4, 5);
            p.closePath();
        }), 'rgba(255,226,150,0.85)', OUTLINE_SOFT, 1.4);

        // cabeça + focinho tubular + crista
        paint(ctx, path(p => {
            p.moveTo(6, -12);
            p.quadraticCurveTo(14, -18, 20, -14);
            p.lineTo(22, -12.6);
            p.quadraticCurveTo(15, -11.4, 12, -8);
            p.closePath();
        }), '#f5b93c', OUTLINE, 2);
        paint(ctx, ell(7, -13, 6, 5.4), '#f5b93c', OUTLINE, 2.2);
        // crista
        paint(ctx, finPath([[3, -17], [-1, -24], [7, -17.5]], [-2, -21]), '#e0812a', OUTLINE, 1.8);

        eye(ctx, 9.5, -14.4, 2.3, { iris: '#111820' });
        ctx.restore();
    }

    /** Estrela-do-mar (fundo do mar) */
    function starfish(ctx, c) {
        const pulse = 1 + Math.sin(c.animTime * 1.2) * 0.015;
        ctx.save();
        ctx.scale(pulse, pulse);
        ctx.rotate(Math.sin(c.animTime * 0.5) * 0.08);

        const star = path(p => {
            for (let i = 0; i < 10; i++) {
                const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
                const r = i % 2 === 0 ? 17 : 7.4;
                const x = Math.cos(a) * r;
                const y = Math.sin(a) * r * 0.92;
                if (i === 0) p.moveTo(x, y); else p.lineTo(x, y);
            }
            p.closePath();
        });
        paint(ctx, star, '#f4794f', OUTLINE, 2.4);
        const star2 = path(p => {
            for (let i = 0; i < 10; i++) {
                const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
                const r = (i % 2 === 0 ? 17 : 7.4) * 0.62;
                const x = Math.cos(a) * r;
                const y = Math.sin(a) * r * 0.92;
                if (i === 0) p.moveTo(x, y); else p.lineTo(x, y);
            }
            p.closePath();
        });
        paint(ctx, star2, '#ffa07a', null);

        const rng = rnd(53);
        for (let i = 0; i < 16; i++) {
            const a = rng() * Math.PI * 2;
            const d = 3 + rng() * 11;
            ctx.save();
            ctx.globalAlpha = 0.6;
            paint(ctx, ell(Math.cos(a) * d, Math.sin(a) * d * 0.9, 1.1 + rng(), 1.1 + rng()), '#ffd9a0', null);
            ctx.restore();
        }
        ctx.restore();
    }

    /** Tartaruga Marinha */
    function seaTurtle(ctx, c) {
        const flap = Math.sin(c.animTime * 2.6);
        // nadadeiras traseiras
        ctx.save();
        [1, -1].forEach(s => {
            paint(ctx, path(p => {
                p.ellipse(-13, s * 8, 8, 4, s * 0.5 + flap * 0.1, 0, Math.PI * 2);
            }), '#3f7a5e', OUTLINE, 2);
        });
        // nadadeiras dianteiras (batendo)
        [1, -1].forEach(s => {
            ctx.save();
            ctx.translate(9, s * 8);
            ctx.rotate(s * (0.25 + flap * 0.35));
            paint(ctx, path(p => p.ellipse(6, s * 5, 11, 4.6, s * 0.35, 0, Math.PI * 2)), '#4b8f6a', OUTLINE, 2.2);
            ctx.restore();
        });
        ctx.restore();

        // cabeça
        paint(ctx, path(p => {
            p.moveTo(13, -4.5);
            p.quadraticCurveTo(22, -5, 25, 0);
            p.quadraticCurveTo(22, 5, 13, 4.5);
            p.closePath();
        }), '#6fa27d', OUTLINE, 2);

        // casco
        paint(ctx, ell(0, 0, 15, 11.5), '#2f6f52', OUTLINE, 2.4);
        paint(ctx, ell(-1, -1, 12.6, 9.2), '#4c9b72', null);
        // placas do casco (hexágonos estilizados)
        ctx.strokeStyle = 'rgba(10, 50, 34, 0.75)';
        ctx.lineWidth = 1.5;
        const cx0 = -1, cy0 = 0;
        for (let i = 0; i < 5; i++) {
            const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
            paint(ctx, ell(cx0 + Math.cos(a) * 6.6, cy0 + Math.sin(a) * 5.4, 3.4, 3), null, null);
            ctx.beginPath();
            ctx.ellipse(cx0 + Math.cos(a) * 6.6, cy0 + Math.sin(a) * 5.4, 3.4, 3, 0, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.beginPath();
        ctx.ellipse(cx0, cy0, 4, 3.4, 0, 0, Math.PI * 2);
        ctx.stroke();

        eye(ctx, 20.5, -1.6, 2.4, { iris: '#101820', sclera: '#f3f7ea' });
    }

    /** Arraia (stingray comum) */
    function stingray(ctx, c) {
        const flap = Math.sin(c.animTime * 2.1);
        // cauda com ferrão
        ctx.strokeStyle = '#7a6b57';
        ctx.lineWidth = 2.6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-14, 0);
        ctx.quadraticCurveTo(-30, flap * 5, -44, flap * 7);
        ctx.stroke();
        ctx.fillStyle = '#3b342a';
        ctx.beginPath();
        ctx.moveTo(-30, flap * 4 - 1);
        ctx.lineTo(-38, flap * 5.6 - 9);
        ctx.lineTo(-34, flap * 5 + 2);
        ctx.closePath();
        ctx.fill();

        // corpo losango
        const body = path(p => {
            p.moveTo(14, -1);
            p.bezierCurveTo(6, -13 - flap * 1.6, -8, -14 - flap * 2.2, -16, -3);
            p.bezierCurveTo(-18, 0, -16, 3, -8, 6);
            p.bezierCurveTo(2, 10 - flap * 1.4, 10, 8, 14, -1);
            p.closePath();
        });
        paint(ctx, body, vgrad(ctx, -14, 10, '#9b8a6f', '#d9cbb0'), OUTLINE, 2.4);
        // pontinhos claros
        const rng = rnd(29);
        ctx.save();
        ctx.globalAlpha = 0.55;
        for (let i = 0; i < 14; i++) {
            const x = -12 + rng() * 24;
            const y = (rng() - 0.5) * 16;
            paint(ctx, ell(x, y, 1.4 + rng() * 1.4, 1.2 + rng()), '#f3ead6', null);
        }
        ctx.restore();
        // olhos e espiráculo
        eye(ctx, 8, -5.4, 2.6, { iris: '#101820', sclera: '#f7f3e6' });
        eye(ctx, 8, 3.6, 2.6, { iris: '#101820', sclera: '#f7f3e6' });
    }

    global.CreatureArt = {
        helpers: { path, poly, ell, paint, eye, maw, vgrad, speckle, rnd, finPath, roundRect, OUTLINE },
        fallback,
        smallFish,
        clownfish,
        pufferfish,
        jellyfish,
        crab,
        lanternfish,
        smallSquid,
        morayEel,
        seahorse,
        starfish,
        seaTurtle,
        stingray
    };
})(window);

/**
 * PARTE 2 - CRIATURAS PERIGOSAS (referência: Shark, Hammerhead, Manta Ray,
 * Giant Octopus, Giant Squid, Giant Moray Eel)
 */
(function (global) {
    'use strict';
    const A = global.CreatureArt;
    const H = A.helpers;
    const paint = H.paint, path = H.path, poly = H.poly, ell = H.ell, eye = H.eye, maw = H.maw,
        vgrad = H.vgrad, OUTLINE = H.OUTLINE;

    // ---------------- TUBARÃO (Great White estilizado) ----------------
    function shark(ctx, c) {
        const wig = c.wig;
        const open = c.mouthOpen;
        const main = '#5b7f9e', dark = '#3a6079', fin = '#4d7391', belly = '#e6eef4';

        // Cauda em crescente
        paint(ctx, path(p => {
            p.moveTo(-30, 0);
            p.quadraticCurveTo(-42, -7, -54, -28 + wig * 2.4);
            p.quadraticCurveTo(-46, -6, -40, -1);
            p.quadraticCurveTo(-46, 8, -50, 19 + wig * 2.4);
            p.quadraticCurveTo(-40, 7, -30, 0);
            p.closePath();
        }), fin, OUTLINE, 2.3);

        // Barbatana dorsal alta e falciforme
        paint(ctx, path(p => {
            p.moveTo(-8, -13);
            p.bezierCurveTo(-6, -30, 4, -36, 12, -38);
            p.bezierCurveTo(3, -27, 3, -18, 13, -12);
            p.closePath();
        }), fin, OUTLINE, 2.3);

        // Nadadeira peitoral + pélvica
        paint(ctx, path(p => {
            p.moveTo(13, 8);
            p.bezierCurveTo(6, 20, -6, 27, -16, 27);
            p.bezierCurveTo(-8, 18, -3, 12, 2, 8);
            p.closePath();
        }), fin, OUTLINE, 2.2);
        paint(ctx, poly([[-18, 10], [-27, 18], [-11, 13]]), fin, OUTLINE, 2);

        // Corpo
        const body = path(p => {
            p.moveTo(43, 1);
            p.bezierCurveTo(32, -12, 8, -17, -12, -14);
            p.bezierCurveTo(-24, -12, -29, -6, -30, 0);
            p.bezierCurveTo(-29, 8, -20, 13, -8, 15);
            p.bezierCurveTo(10, 18, 32, 14, 43, 1);
            p.closePath();
        });
        paint(ctx, body, vgrad(ctx, -17, 17, dark, main), OUTLINE, 2.6);
        // barriga clara (contra-sombra)
        ctx.save();
        ctx.globalAlpha = 0.85;
        paint(ctx, path(p => {
            p.moveTo(40, 3);
            p.bezierCurveTo(24, 14, 2, 16, -14, 12);
            p.bezierCurveTo(-2, 18, 20, 18, 40, 3);
            p.closePath();
        }), belly, null);
        ctx.restore();

        // Guelras
        ctx.strokeStyle = 'rgba(8, 34, 52, 0.6)';
        ctx.lineWidth = 1.7;
        for (let i = 0; i < 5; i++) {
            const x = 15 + i * 3.2;
            ctx.beginPath();
            ctx.moveTo(x, -3 + i * 0.4);
            ctx.quadraticCurveTo(x + 2, 3, x - 0.5, 9 - i * 0.4);
            ctx.stroke();
        }

        // Nadadeira dorsal pequena traseira + marcas
        ctx.save();
        ctx.globalAlpha = 0.25;
        paint(ctx, ell(-2, 9, 9, 3.4), '#ffffff', null);
        ctx.restore();

        // Boca com dentes
        maw(ctx, { x: 24, y: 2.5, len: 22, spread: 0.13, open, maxOpen: 0.6, teeth: 8, size: 5 });

        eye(ctx, 30, -5, 4, { iris: '#0d1116', sclera: '#f4f8fb', angry: 0.7, skin: dark });
    }

    // ---------------- TUBARÃO-MARTELO ----------------
    function hammerhead(ctx, c) {
        const wig = c.wig;
        const open = c.mouthOpen;
        const main = '#8d9aa6', dark = '#5d6c78', fin = '#7b8a96', belly = '#eef3f6';

        paint(ctx, path(p => {
            p.moveTo(-30, 0);
            p.quadraticCurveTo(-42, -8, -54, -30 + wig * 2.6);
            p.quadraticCurveTo(-44, -6, -38, -1);
            p.quadraticCurveTo(-44, 8, -48, 22 + wig * 2.6);
            p.quadraticCurveTo(-38, 8, -30, 0);
            p.closePath();
        }), fin, OUTLINE, 2.3);

        // Dorsal alta e recurvada (bem característica)
        paint(ctx, path(p => {
            p.moveTo(-10, -13);
            p.bezierCurveTo(-6, -34, 6, -42, 14, -44);
            p.bezierCurveTo(2, -30, 2, -19, 14, -12);
            p.closePath();
        }), fin, OUTLINE, 2.3);

        paint(ctx, path(p => {
            p.moveTo(10, 8);
            p.bezierCurveTo(4, 22, -10, 29, -20, 28);
            p.bezierCurveTo(-10, 19, -4, 12, -1, 8);
            p.closePath();
        }), fin, OUTLINE, 2.2);
        paint(ctx, poly([[-18, 10], [-27, 19], [-11, 13]]), fin, OUTLINE, 2);

        // Corpo (mais esguio)
        const body = path(p => {
            p.moveTo(30, 0);
            p.bezierCurveTo(22, -9, 4, -14, -12, -12);
            p.bezierCurveTo(-24, -10, -29, -5, -30, 0);
            p.bezierCurveTo(-29, 6, -20, 11, -8, 13);
            p.bezierCurveTo(8, 15, 22, 11, 30, 0);
            p.closePath();
        });
        paint(ctx, body, vgrad(ctx, -14, 15, dark, main), OUTLINE, 2.5);
        ctx.save();
        ctx.globalAlpha = 0.8;
        paint(ctx, path(p => {
            p.moveTo(26, 3);
            p.bezierCurveTo(14, 13, -2, 14, -14, 11);
            p.bezierCurveTo(0, 16, 14, 15, 26, 3);
            p.closePath();
        }), belly, null);
        ctx.restore();

        // Cabeça em "T" (cefalofólio) com recorte central
        const head = path(p => {
            p.moveTo(28, -9);
            p.quadraticCurveTo(40, -20, 47, -19);
            p.quadraticCurveTo(44, -12, 38, -8);
            p.quadraticCurveTo(34, -4, 33, 0);
            p.quadraticCurveTo(34, 4, 38, 8);
            p.quadraticCurveTo(44, 12, 47, 19);
            p.quadraticCurveTo(40, 20, 28, 9);
            p.quadraticCurveTo(22, 4, 22, 0);
            p.quadraticCurveTo(22, -4, 28, -9);
            p.closePath();
        });
        paint(ctx, head, vgrad(ctx, -20, 20, dark, '#a8b4bf'), OUTLINE, 2.5);

        // Bordas do martelo mais claras
        ctx.save();
        ctx.globalAlpha = 0.35;
        paint(ctx, poly([[43, -18], [47, -19], [44, -12]], null), '#ffffff', null);
        paint(ctx, poly([[43, 18], [47, 19], [44, 12]], null), '#ffffff', null);
        ctx.restore();

        // Olhos nas pontas laterais do martelo
        eye(ctx, 42.5, -17, 3.1, { iris: '#f7d046', pupil: '#101820', sclera: '#ffffff', angry: 0.3, skin: dark });
        eye(ctx, 42.5, 17, 3.1, { iris: '#f7d046', pupil: '#101820', sclera: '#ffffff', angry: 0.3, skin: dark });

        // Boca frontal
        maw(ctx, { x: 30, y: 1, len: 12, spread: 0.2, open, maxOpen: 0.6, teeth: 7, size: 3.6 });
    }

    // ---------------- ARRAIA MANTA GIGANTE ----------------
    function mantaRay(ctx, c) {
        const flap = Math.sin(c.animTime * 1.7);
        const wig = c.wig;
        const top = '#455a75', mid = '#5d7492', belly = '#e8eef5';

        // Cauda longa
        ctx.strokeStyle = mid;
        ctx.lineWidth = 2.6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-18, 0);
        ctx.quadraticCurveTo(-46, wig * 3, -78, wig * 6);
        ctx.stroke();

        // Asas (bordas traseiras escuras)
        [1, -1].forEach(s => {
            const tipY = s * (46 + flap * 7);
            paint(ctx, path(p => {
                p.moveTo(16, s * 8);
                p.quadraticCurveTo(4, s * (30 + flap * 4), -14, tipY);
                p.quadraticCurveTo(-4, s * (34 + flap * 5), -22, s * 8);
                p.closePath();
            }), mid, OUTLINE, 2.5);
        });

        // Corpo em losango
        const body = path(p => {
            p.moveTo(28, 0);
            p.bezierCurveTo(18, -13, 2, -18, -16, -13);
            p.bezierCurveTo(-24, -9, -24, 9, -16, 13);
            p.bezierCurveTo(2, 18, 18, 13, 28, 0);
            p.closePath();
        });
        paint(ctx, body, vgrad(ctx, -18, 18, top, mid), OUTLINE, 2.6);

        // Marcação branca nos ombros (como na referência)
        ctx.save();
        ctx.globalAlpha = 0.85;
        paint(ctx, path(p => {
            p.moveTo(16, -6);
            p.quadraticCurveTo(6, -12, -2, -8);
            p.quadraticCurveTo(6, -5, 14, -2);
            p.closePath();
        }), '#f2f6fa', null);
        paint(ctx, path(p => {
            p.moveTo(16, 6);
            p.quadraticCurveTo(6, 12, -2, 8);
            p.quadraticCurveTo(6, 5, 14, 2);
            p.closePath();
        }), '#f2f6fa', null);
        ctx.restore();

        // Barriga clara na parte inferior
        ctx.save();
        ctx.globalAlpha = 0.7;
        paint(ctx, path(p => {
            p.moveTo(22, 4);
            p.bezierCurveTo(10, 16, -8, 15, -18, 9);
            p.bezierCurveTo(-4, 18, 12, 16, 22, 4);
            p.closePath();
        }), belly, null);
        ctx.restore();

        // Cefalofins (chifres) na frente
        [1, -1].forEach(s => {
            paint(ctx, path(p => {
                p.moveTo(24, s * 5);
                p.quadraticCurveTo(36, s * 7, 40, s * 2);
                p.quadraticCurveTo(33, s * 2, 24, s * 1);
                p.closePath();
            }), mid, OUTLINE, 2);
        });

        eye(ctx, 19, -8.5, 3.1, { iris: '#111820', sclera: '#f5f8fb' });
        eye(ctx, 19, 8.5, 3.1, { iris: '#111820', sclera: '#f5f8fb' });
    }

    // ---------------- POLVO GIGANTE ----------------
    function giantOctopus(ctx, c) {
        const flush = c.mouthOpen; // fica mais vermelho ao atacar
        const body = flush > 0.5 ? '#b02a4a' : '#8e2f9e';
        const dark = flush > 0.5 ? '#7a1230' : '#5b1a6b';
        const light = flush > 0.5 ? '#e0557d' : '#c86ce0';

        // 8 tentáculos com ventosas
        for (let i = 0; i < 8; i++) {
            const a = (i / 7.5) * Math.PI * 1.35 - Math.PI * 0.68;
            const len = 44 + (i % 3) * 8;
            const sway = Math.sin(c.animTime * 1.8 + i * 0.8) * 10;
            const tipX = Math.cos(a) * len + sway * 0.4;
            const tipY = Math.sin(a) * len + sway;
            const midX = Math.cos(a) * len * 0.55;
            const midY = Math.sin(a) * len * 0.55;

            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(midX, midY, tipX, tipY);
            ctx.lineWidth = 9 * (1 - i * 0.02);
            ctx.strokeStyle = dark;
            ctx.lineCap = 'round';
            ctx.stroke();
            ctx.lineWidth = 6;
            ctx.strokeStyle = body;
            ctx.stroke();

            // ventosas
            for (let s = 0.45; s < 1; s += 0.22) {
                const x = midX * s * 1.45 + (tipX - midX) * (s - 0.45) * 1.2;
                const y = midY * s * 1.45 + (tipY - midY) * (s - 0.45) * 1.2;
                paint(ctx, ell(x, y, 1.5, 1.4), '#f0c8ff', null);
            }
        }

        // Manto (cabeça grande, formato de gota)
        const mantle = path(p => {
            p.moveTo(14, 0);
            p.bezierCurveTo(12, -22, -8, -30, -22, -22);
            p.bezierCurveTo(-30, -16, -30, 16, -22, 22);
            p.bezierCurveTo(-8, 30, 12, 22, 14, 0);
            p.closePath();
        });
        paint(ctx, mantle, vgrad(ctx, -28, 28, dark, light), OUTLINE, 2.6);

        // Manchas / textura da pele
        const rng = H.rnd(77);
        ctx.save();
        ctx.globalAlpha = 0.3;
        for (let i = 0; i < 16; i++) {
            paint(ctx, ell(-14 + rng() * 24, (rng() - 0.5) * 34, 2 + rng() * 2.4, 1.6 + rng() * 2), '#ffffff', null);
        }
        ctx.restore();

        // Sifão
        paint(ctx, path(p => {
            p.moveTo(10, -10);
            p.quadraticCurveTo(20, -14, 19, -5);
            p.quadraticCurveTo(14, -4, 10, -4);
            p.closePath();
        }), dark, OUTLINE, 2);

        // Olhos grandes com pupila horizontal
        [1, -1].forEach(s => {
            paint(ctx, ell(6, s * 11 - 2, 6.4, 5.6), '#f9f4ff', OUTLINE, 2);
            paint(ctx, ell(7.6, s * 11 - 2, 2.6, 3.4), '#141018', null);
            paint(ctx, ell(5.4, s * 11 - 6, 1.6, 1.2), '#ffffff', null);
            // pálpebra
            ctx.strokeStyle = dark;
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(1, s * 11 - 6.4);
            ctx.quadraticCurveTo(7, s * 11 - 8, 11.5, s * 11 - 5.4);
            ctx.stroke();
        });
    }

    // ---------------- LULA GIGANTE ----------------
    function giantSquid(ctx, c) {
        const j = Math.sin(c.animTime * 2.6) * 3;
        const main = '#c0392b', dark = '#7d1a12', light = '#e8694a', belly = '#f2c3a6';
        const reach = c.aiState === 'ATTACK' ? 1.25 : 1;

        // Braços (8) - se espalham na frente
        for (let i = -3; i <= 3; i++) {
            const spread = i * 0.22;
            const len = (30 + Math.abs(i) * 5) * reach;
            const x1 = 14 + Math.cos(spread) * len * 0.6;
            const y1 = Math.sin(spread) * len * 0.6 + j;
            const x2 = 14 + Math.cos(spread) * len;
            const y2 = Math.sin(spread) * len * 1.5 + j * 1.8;
            ctx.beginPath();
            ctx.moveTo(12, i * 2.4);
            ctx.quadraticCurveTo(x1, y1, x2, y2);
            ctx.lineWidth = 5.4;
            ctx.strokeStyle = dark;
            ctx.lineCap = 'round';
            ctx.stroke();
            ctx.lineWidth = 3;
            ctx.strokeStyle = main;
            ctx.stroke();
        }
        // 2 tentáculos de alimentação (longos, com clava)
        [-1, 1].forEach(s => {
            const x1 = 34 * reach, y1 = s * 16 + j;
            const x2 = 54 * reach, y2 = s * 10 + j * 2;
            ctx.beginPath();
            ctx.moveTo(13, s * 3);
            ctx.quadraticCurveTo(x1, y1, x2, y2);
            ctx.lineWidth = 3.4;
            ctx.strokeStyle = dark;
            ctx.stroke();
            ctx.lineWidth = 1.8;
            ctx.strokeStyle = light;
            ctx.stroke();
            // clava com ventosas
            paint(ctx, ell(x2, y2, 4.4, 3), light, OUTLINE, 1.4);
            for (let k = 0; k < 3; k++) paint(ctx, ell(x2 - 2 + k * 2, y2, 1.1, 1), '#f7e2d6', null);
        });

        // Manto (torpedo + nadadeiras traseiras)
        const mantle = path(p => {
            p.moveTo(16, 0);
            p.bezierCurveTo(10, -13, -6, -16, -26, -12);
            p.bezierCurveTo(-40, -9, -48, -4, -50, 0);
            p.bezierCurveTo(-48, 4, -40, 9, -26, 12);
            p.bezierCurveTo(-6, 16, 10, 13, 16, 0);
            p.closePath();
        });
        paint(ctx, mantle, vgrad(ctx, -16, 16, dark, light), OUTLINE, 2.6);

        // nadadeiras posteriores triangulares
        [1, -1].forEach(s => {
            paint(ctx, path(p => {
                p.moveTo(-30, s * 8);
                p.quadraticCurveTo(-46, s * 22, -52, s * 26);
                p.quadraticCurveTo(-50, s * 12, -44, s * 5);
                p.closePath();
            }), dark, OUTLINE, 2);
        });

        // barriga clara
        ctx.save();
        ctx.globalAlpha = 0.35;
        paint(ctx, path(p => {
            p.moveTo(12, 4);
            p.bezierCurveTo(0, 14, -22, 13, -44, 4);
            p.bezierCurveTo(-22, 18, 0, 18, 12, 4);
            p.closePath();
        }), belly, null);
        ctx.restore();

        // pontos cromatóforos
        const rng = H.rnd(23);
        for (let i = 0; i < 14; i++) {
            ctx.save();
            ctx.globalAlpha = 0.35;
            paint(ctx, ell(-46 + rng() * 56, (rng() - 0.5) * 17, 1.6 + rng() * 1.8, 1.3 + rng()), '#5c0f0a', null);
            ctx.restore();
        }

        // Olho gigante
        paint(ctx, ell(11, -6, 6.6, 6), '#fdf3e3', OUTLINE, 2);
        paint(ctx, ell(12, -6, 3.4, 4.4), '#111a22', null);
        paint(ctx, ell(10.6, -8, 1.5, 1.3), '#ffffff', null);
    }

    // ---------------- MOREIA GIGANTE ----------------
    function giantMoray(ctx, c) {
        A.morayEel(ctx, c, {
            giant: true,
            scale: 1.55,
            segments: 9,
            length: 17,
            thickness: 11,
            color: '#93a52a',
            dark: '#4d5a10',
            belly: '#dfe38a'
        });
    }

    Object.assign(A, { shark, hammerhead, mantaRay, giantOctopus, giantSquid, giantMoray });
})(window);

/**
 * PARTE 3 - CRIATURAS PRÉ-HISTÓRICAS E ABISSAIS
 * (Dunkleosteus, Megalodon, Mosasaurus, Pliosaurus, Helicoprion, Livyatan,
 *  Abyssal Leviathan, Void-Walker, Deep-Sea Nightmare, Luminous Jelly-Spawn)
 */
(function (global) {
    'use strict';
    const A = global.CreatureArt;
    const H = A.helpers;
    const paint = H.paint, path = H.path, poly = H.poly, ell = H.ell, eye = H.eye, maw = H.maw,
        vgrad = H.vgrad, OUTLINE = H.OUTLINE;

    // ---------------- MEGALODON ----------------
    function megalodon(ctx, c) {
        const wig = c.wig;
        const open = c.mouthOpen;
        const dark = '#3a5a70', main = '#4f7692', fin = '#3f647e', belly = '#e9f1f6';

        paint(ctx, path(p => {
            p.moveTo(-36, 0);
            p.quadraticCurveTo(-52, -10, -66, -36 + wig * 3);
            p.quadraticCurveTo(-54, -8, -46, -1);
            p.quadraticCurveTo(-54, 10, -60, 26 + wig * 3);
            p.quadraticCurveTo(-48, 9, -36, 0);
            p.closePath();
        }), fin, OUTLINE, 2.4);

        // Dorsal enorme
        paint(ctx, path(p => {
            p.moveTo(-10, -16);
            p.bezierCurveTo(-8, -40, 4, -50, 16, -52);
            p.bezierCurveTo(4, -36, 2, -24, 14, -14);
            p.closePath();
        }), fin, OUTLINE, 2.4);

        paint(ctx, path(p => {
            p.moveTo(16, 10);
            p.bezierCurveTo(8, 26, -8, 34, -22, 33);
            p.bezierCurveTo(-10, 22, -4, 14, 2, 10);
            p.closePath();
        }), fin, OUTLINE, 2.3);
        paint(ctx, poly([[-22, 12], [-34, 22], [-14, 16]]), fin, OUTLINE, 2);

        const body = path(p => {
            p.moveTo(50, 2);
            p.bezierCurveTo(38, -15, 10, -21, -14, -18);
            p.bezierCurveTo(-28, -15, -34, -8, -36, 0);
            p.bezierCurveTo(-34, 9, -24, 16, -10, 19);
            p.bezierCurveTo(12, 22, 38, 17, 50, 2);
            p.closePath();
        });
        paint(ctx, body, vgrad(ctx, -21, 21, dark, main), OUTLINE, 2.8);
        ctx.save();
        ctx.globalAlpha = 0.8;
        paint(ctx, path(p => {
            p.moveTo(46, 4);
            p.bezierCurveTo(28, 18, 0, 20, -18, 15);
            p.bezierCurveTo(0, 22, 26, 22, 46, 4);
            p.closePath();
        }), belly, null);
        ctx.restore();

        // Cicatrizes de batalha
        ctx.strokeStyle = 'rgba(255, 150, 170, 0.7)';
        ctx.lineWidth = 2;
        [[6, -14, 16, -4], [-16, -10, -6, -1]].forEach(s => {
            ctx.beginPath();
            ctx.moveTo(s[0], s[1]);
            ctx.lineTo(s[2], s[3]);
            ctx.stroke();
        });

        // Guelras
        ctx.strokeStyle = 'rgba(6, 28, 42, 0.65)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 5; i++) {
            const x = 16 + i * 3.6;
            ctx.beginPath();
            ctx.moveTo(x, -5 + i * 0.5);
            ctx.quadraticCurveTo(x + 2.4, 4, x - 0.6, 12 - i * 0.6);
            ctx.stroke();
        }

        // Bocarra com duas fileiras de dentes gigantes
        maw(ctx, { x: 28, y: 2.5, len: 26, spread: 0.12, open, maxOpen: 0.72, teeth: 11, size: 6.4 });
        maw(ctx, { x: 32, y: 4, len: 20, spread: 0.3, open: open * 0.85, maxOpen: 0.5, teeth: 7, size: 4.4, teethColor: '#e8f1f7' });

        eye(ctx, 34, -7, 4.4, { iris: '#0b0f14', sclera: '#f2f6fa', angry: 0.8, skin: dark });
    }

    // ---------------- DUNKLEOSTEUS ----------------
    function dunkleosteus(ctx, c) {
        const wig = c.wig;
        const open = c.mouthOpen;
        const plate = '#8a7355', plateDark = '#5b4a35', plateLight = '#b39a76';
        const bodyMain = '#6d6049', belly = '#d8c8ab', blade = '#cfd8de';

        paint(ctx, path(p => {
            p.moveTo(-30, 0);
            p.quadraticCurveTo(-42, -8, -52, -26 + wig * 2.6);
            p.quadraticCurveTo(-42, -6, -36, 0);
            p.quadraticCurveTo(-42, 7, -46, 18 + wig * 2.6);
            p.quadraticCurveTo(-36, 6, -30, 0);
            p.closePath();
        }), '#5c5038', OUTLINE, 2.3);

        // Dorsal pequena + peitoral
        paint(ctx, path(p => {
            p.moveTo(-6, -16);
            p.quadraticCurveTo(0, -28, 10, -26);
            p.quadraticCurveTo(2, -20, 6, -14);
            p.closePath();
        }), '#5c5038', OUTLINE, 2.2);
        paint(ctx, path(p => {
            p.moveTo(10, 12);
            p.quadraticCurveTo(0, 30, -18, 32);
            p.quadraticCurveTo(-6, 20, 0, 12);
            p.closePath();
        }), '#5c5038', OUTLINE, 2.2);

        // Corpo pesado
        const body = path(p => {
            p.moveTo(30, -2);
            p.bezierCurveTo(24, -16, 6, -20, -12, -18);
            p.bezierCurveTo(-24, -16, -30, -8, -30, 0);
            p.bezierCurveTo(-30, 9, -22, 16, -8, 18);
            p.bezierCurveTo(10, 21, 26, 14, 30, -2);
            p.closePath();
        });
        paint(ctx, body, vgrad(ctx, -20, 21, '#4f4534', bodyMain), OUTLINE, 2.6);
        ctx.save();
        ctx.globalAlpha = 0.75;
        paint(ctx, path(p => {
            p.moveTo(24, 6);
            p.bezierCurveTo(10, 18, -10, 18, -26, 12);
            p.bezierCurveTo(-8, 20, 12, 20, 24, 6);
            p.closePath();
        }), belly, null);
        ctx.restore();

        // Escamas / placas do corpo
        ctx.strokeStyle = 'rgba(20, 16, 10, 0.35)';
        ctx.lineWidth = 1.4;
        for (let i = 0; i < 4; i++) {
            const x = -6 - i * 7;
            ctx.beginPath();
            ctx.moveTo(x, -14);
            ctx.quadraticCurveTo(x - 3, 0, x, 15);
            ctx.stroke();
        }

        // Cabeça blindada (placas ósseas)
        const head = path(p => {
            p.moveTo(48, 2);
            p.bezierCurveTo(46, -14, 28, -22, 8, -20);
            p.bezierCurveTo(-2, -19, -4, -8, -4, 0);
            p.bezierCurveTo(-4, 9, -2, 18, 10, 19);
            p.bezierCurveTo(28, 21, 46, 14, 48, 2);
            p.closePath();
        });
        paint(ctx, head, vgrad(ctx, -22, 20, plateDark, plate), OUTLINE, 2.7);

        // Placas com bisel claro
        paint(ctx, path(p => {
            p.moveTo(44, -6);
            p.bezierCurveTo(36, -16, 20, -19, 8, -16);
            p.quadraticCurveTo(22, -12, 30, -6);
            p.closePath();
        }), plateLight, OUTLINE, 1.6);
        paint(ctx, path(p => {
            p.moveTo(30, 8);
            p.quadraticCurveTo(20, 15, 8, 12);
            p.quadraticCurveTo(20, 10, 30, 4);
            p.closePath();
        }), plateLight, OUTLINE, 1.4);
        // sutura em zigue-zague entre as placas
        ctx.strokeStyle = plateDark;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(26, -14);
        ctx.lineTo(20, -6);
        ctx.lineTo(26, 0);
        ctx.lineTo(20, 8);
        ctx.stroke();

        // Mandíbulas cortantes (auto-afiáveis)
        const upperBlade = path(p => {
            p.moveTo(46, -6);
            p.quadraticCurveTo(56, -2, 58, 2);
            p.quadraticCurveTo(50, 2, 42, 1);
            p.closePath();
        });
        paint(ctx, upperBlade, blade, OUTLINE, 2);
        const jawDrop = open * 16;
        ctx.save();
        ctx.translate(38, 6);
        ctx.rotate(jawDrop * 0.05);
        const lowerBlade = path(p => {
            p.moveTo(4, 0);
            p.quadraticCurveTo(16, 2, 20, 7);
            p.quadraticCurveTo(10, 8, 0, 6);
            p.closePath();
        });
        paint(ctx, lowerBlade, blade, OUTLINE, 2);
        ctx.restore();

        // Cavidade bucal quando abre
        if (open > 0.15) {
            ctx.save();
            ctx.globalAlpha = Math.min(1, open * 1.4);
            paint(ctx, poly([[36, 0], [52, -2], [50, 6], [34, 6]]), '#5a1015', null);
            ctx.restore();
        }

        // Olho pequeno com anel ósseo
        paint(ctx, ell(32, -8, 4.4, 4.2), plateLight, OUTLINE, 1.6);
        eye(ctx, 32.5, -8, 2.6, { iris: '#e8c341', pupil: '#12100c', angry: 0.4, skin: plateDark });
    }

    // ---------------- MOSASAURUS ----------------
    function mosasaurus(ctx, c) {
        const wig = c.wig;
        const open = c.mouthOpen;
        const dark = '#245043', main = '#3f7d5f', light = '#7cae86', belly = '#dff0d8';
        const flap = Math.sin(c.animTime * 2.2);

        // Cauda com leme (fluke)
        paint(ctx, path(p => {
            p.moveTo(-52, 0);
            p.bezierCurveTo(-66, -14, -80, -30 + wig * 3, -86, -34 + wig * 3);
            p.bezierCurveTo(-76, -16, -70, -6, -62, 0);
            p.bezierCurveTo(-70, 8, -76, 18, -80, 30 + wig * 3);
            p.bezierCurveTo(-70, 16, -60, 8, -52, 0);
            p.closePath();
        }), dark, OUTLINE, 2.4);

        // Nadadeiras traseiras (traseiras menores)
        [1, -1].forEach(s => {
            ctx.save();
            ctx.translate(-40, s * 12);
            ctx.rotate(s * (0.3 - flap * 0.3));
            paint(ctx, path(p => p.ellipse(-2, s * 6, 14, 6, s * 0.4, 0, Math.PI * 2)), dark, OUTLINE, 2.2);
            ctx.restore();
        });

        // Corpo serpentino
        const body = path(p => {
            p.moveTo(40, 0);
            p.bezierCurveTo(30, -19, 2, -25, -26, -20);
            p.bezierCurveTo(-42, -16, -50, -8, -52, 0);
            p.bezierCurveTo(-50, 8, -42, 15, -26, 19);
            p.bezierCurveTo(2, 24, 30, 20, 40, 0);
            p.closePath();
        });
        paint(ctx, body, vgrad(ctx, -25, 24, dark, main), OUTLINE, 2.7);

        // barriga clara
        ctx.save();
        ctx.globalAlpha = 0.7;
        paint(ctx, path(p => {
            p.moveTo(34, 6);
            p.bezierCurveTo(14, 22, -16, 22, -46, 10);
            p.bezierCurveTo(-14, 26, 14, 26, 34, 6);
            p.closePath();
        }), belly, null);
        ctx.restore();

        // Faixas escuras (padrão de pele)
        ctx.save();
        ctx.globalAlpha = 0.3;
        for (let i = 0; i < 7; i++) {
            const x = -10 - i * 9;
            paint(ctx, path(p => {
                p.moveTo(x, -20);
                p.quadraticCurveTo(x + 4, 0, x, 18);
                p.lineTo(x + 3, 18);
                p.quadraticCurveTo(x + 7, 0, x + 3, -20);
                p.closePath();
            }), dark, null);
        }
        ctx.restore();

        // Nadadeiras dianteiras (remos)
        [1, -1].forEach(s => {
            ctx.save();
            ctx.translate(22, s * 14);
            ctx.rotate(s * (0.45 + flap * 0.35));
            paint(ctx, path(p => p.ellipse(4, s * 9, 18, 7, s * 0.35, 0, Math.PI * 2)), light, OUTLINE, 2.3);
            ctx.restore();
        });

        // Cabeça de réptil com focinho longo
        const head = path(p => {
            p.moveTo(40, -14);
            p.bezierCurveTo(56, -14, 70, -8, 82, -2);
            p.bezierCurveTo(74, 2, 76, 6, 82, 8);
            p.bezierCurveTo(70, 12, 54, 15, 40, 15);
            p.bezierCurveTo(34, 8, 34, -6, 40, -14);
            p.closePath();
        });
        paint(ctx, head, vgrad(ctx, -15, 15, dark, main), OUTLINE, 2.5);

        // Mandíbula superior/inferior com dentes
        const gape = open * 12;
        ctx.strokeStyle = OUTLINE;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(44, -2);
        ctx.lineTo(84, -1 - gape * 0.15);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(44, 5);
        ctx.lineTo(80, 6 + gape);
        ctx.stroke();
        if (open > 0.1) {
            ctx.save();
            ctx.globalAlpha = Math.min(1, open * 1.3);
            paint(ctx, poly([[44, -1], [84, -1 - gape * 0.15], [80, 6 + gape], [44, 6]]), '#5c1119', null);
            ctx.restore();
        }
        // dentes
        ctx.fillStyle = '#fbfdf8';
        for (let i = 0; i < 11; i++) {
            const t = i / 10;
            const x = 46 + t * 36;
            const yU = -1 - t * gape * 0.15;
            const yD = 6 + t * gape;
            ctx.beginPath();
            ctx.moveTo(x - 1.4, yU);
            ctx.lineTo(x + 1.4, yU);
            ctx.lineTo(x, yU + 4.6);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(x - 1.4, yD);
            ctx.lineTo(x + 1.4, yD);
            ctx.lineTo(x, yD - 4.4);
            ctx.closePath();
            ctx.fill();
        }

        // Olho amarelo reptiliano
        eye(ctx, 52, -7, 4.2, { iris: '#f0c419', pupil: '#0f0d08', angry: 0.6, skin: dark });
        // narina
        paint(ctx, ell(78, -3, 1.8, 1.4), '#1b2b25', null);
    }

    // ---------------- PLIOSAURUS ----------------
    function pliosaurus(ctx, c) {
        const wig = c.wig;
        const open = c.mouthOpen;
        const dark = '#274b6b', main = '#3f6e94', belly = '#e2eef6';
        const flap = Math.sin(c.animTime * 2.4);

        // Cauda curta com fluke
        paint(ctx, path(p => {
            p.moveTo(-40, 0);
            p.bezierCurveTo(-52, -10, -62, -22 + wig * 2, -66, -26 + wig * 2);
            p.bezierCurveTo(-58, -12, -52, -4, -46, 0);
            p.bezierCurveTo(-52, 6, -58, 14, -60, 22 + wig * 2);
            p.bezierCurveTo(-52, 12, -46, 6, -40, 0);
            p.closePath();
        }), dark, OUTLINE, 2.4);

        // 4 nadadeiras (remos) - as traseiras
        [1, -1].forEach(s => {
            ctx.save();
            ctx.translate(-26, s * 14);
            ctx.rotate(s * (0.35 - flap * 0.3));
            paint(ctx, path(p => p.ellipse(-3, s * 7, 12, 5.4, s * 0.4, 0, Math.PI * 2)), dark, OUTLINE, 2.2);
            ctx.restore();
        });

        // Corpo robusto
        const body = path(p => {
            p.moveTo(34, 0);
            p.bezierCurveTo(26, -20, 0, -26, -22, -21);
            p.bezierCurveTo(-34, -18, -40, -8, -40, 0);
            p.bezierCurveTo(-40, 8, -34, 16, -22, 19);
            p.bezierCurveTo(0, 24, 26, 20, 34, 0);
            p.closePath();
        });
        paint(ctx, body, vgrad(ctx, -26, 24, dark, main), OUTLINE, 2.7);
        ctx.save();
        ctx.globalAlpha = 0.7;
        paint(ctx, path(p => {
            p.moveTo(28, 7);
            p.bezierCurveTo(10, 24, -14, 22, -34, 12);
            p.bezierCurveTo(-12, 26, 10, 26, 28, 7);
            p.closePath();
        }), belly, null);
        ctx.restore();

        // Nadadeiras dianteiras grandes
        [1, -1].forEach(s => {
            ctx.save();
            ctx.translate(16, s * 16);
            ctx.rotate(s * (0.5 + flap * 0.4));
            paint(ctx, path(p => p.ellipse(4, s * 10, 17, 7, s * 0.35, 0, Math.PI * 2)), main, OUTLINE, 2.3);
            ctx.restore();
        });
        paint(ctx, path(p => {
            p.moveTo(-4, -22);
            p.quadraticCurveTo(4, -32, 14, -28);
            p.quadraticCurveTo(6, -24, 10, -18);
            p.closePath();
        }), dark, OUTLINE, 2);

        // Cabeça grande de pescoço curto + mandíbulas longas
        const head = path(p => {
            p.moveTo(34, -16);
            p.bezierCurveTo(48, -20, 62, -14, 74, -6);
            p.bezierCurveTo(66, -2, 68, 3, 74, 6);
            p.bezierCurveTo(60, 14, 46, 18, 34, 16);
            p.bezierCurveTo(28, 6, 28, -8, 34, -16);
            p.closePath();
        });
        paint(ctx, head, vgrad(ctx, -20, 18, dark, main), OUTLINE, 2.5);

        const gape = open * 14;
        ctx.strokeStyle = OUTLINE;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(38, -3);
        ctx.lineTo(76, -4 - gape * 0.12);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(38, 5);
        ctx.lineTo(72, 7 + gape);
        ctx.stroke();
        if (open > 0.1) {
            ctx.save();
            ctx.globalAlpha = Math.min(1, open * 1.3);
            paint(ctx, poly([[38, -3], [76, -4 - gape * 0.12], [72, 7 + gape], [38, 5]]), '#591018', null);
            ctx.restore();
        }
        ctx.fillStyle = '#fbfdf8';
        for (let i = 0; i < 12; i++) {
            const t = i / 11;
            const x = 40 + t * 34;
            const yU = -3 - t * gape * 0.12;
            const yD = 5 + t * gape;
            const s = i < 3 ? 4.4 : 5.4;
            ctx.beginPath();
            ctx.moveTo(x - 1.4, yU);
            ctx.lineTo(x + 1.4, yU);
            ctx.lineTo(x, yU + s);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(x - 1.4, yD);
            ctx.lineTo(x + 1.4, yD);
            ctx.lineTo(x, yD - s);
            ctx.closePath();
            ctx.fill();
        }

        eye(ctx, 46, -9, 4, { iris: '#ffd166', pupil: '#100f0c', angry: 0.55, skin: dark });
    }

    // ---------------- HELICOPRION ----------------
    function helicoprion(ctx, c) {
        const wig = c.wig;
        const open = c.mouthOpen;
        const dark = '#6b6455', main = '#948a75', belly = '#e2dccb';
        const spin = c.animTime * (c.aiState === 'ATTACK' ? 3 : 1.2);

        // Cauda heterocercal
        paint(ctx, path(p => {
            p.moveTo(-32, 0);
            p.bezierCurveTo(-42, -10, -52, -26 + wig * 2, -56, -30 + wig * 2);
            p.bezierCurveTo(-48, -12, -44, -4, -38, 0);
            p.bezierCurveTo(-44, 6, -46, 12, -48, 18 + wig * 2);
            p.bezierCurveTo(-40, 10, -36, 5, -32, 0);
            p.closePath();
        }), dark, OUTLINE, 2.3);

        paint(ctx, path(p => {
            p.moveTo(-6, -14);
            p.quadraticCurveTo(0, -28, 12, -26);
            p.quadraticCurveTo(4, -20, 8, -13);
            p.closePath();
        }), dark, OUTLINE, 2.2);
        paint(ctx, path(p => {
            p.moveTo(10, 8);
            p.quadraticCurveTo(0, 22, -14, 24);
            p.quadraticCurveTo(-4, 15, 1, 8);
            p.closePath();
        }), dark, OUTLINE, 2.2);

        // Corpo de tubarão primitivo
        const body = path(p => {
            p.moveTo(38, 0);
            p.bezierCurveTo(30, -14, 6, -19, -12, -17);
            p.bezierCurveTo(-24, -15, -30, -8, -32, 0);
            p.bezierCurveTo(-30, 8, -22, 14, -10, 16);
            p.bezierCurveTo(8, 19, 30, 14, 38, 0);
            p.closePath();
        });
        paint(ctx, body, vgrad(ctx, -19, 19, dark, main), OUTLINE, 2.6);
        ctx.save();
        ctx.globalAlpha = 0.7;
        paint(ctx, path(p => {
            p.moveTo(34, 4);
            p.bezierCurveTo(18, 16, -6, 16, -26, 10);
            p.bezierCurveTo(-6, 19, 18, 19, 34, 4);
            p.closePath();
        }), belly, null);
        ctx.restore();

        // Faixas marrons
        ctx.save();
        ctx.globalAlpha = 0.35;
        for (let i = 0; i < 6; i++) {
            const x = -8 - i * 6;
            paint(ctx, path(p => {
                p.moveTo(x, -16);
                p.quadraticCurveTo(x + 3, 0, x, 14);
                p.lineTo(x + 2.6, 14);
                p.quadraticCurveTo(x + 5.6, 0, x + 2.6, -16);
                p.closePath();
            }), '#3b3527', null);
        }
        ctx.restore();

        // Cabeça curta e arredondada
        paint(ctx, path(p => {
            p.moveTo(38, -12);
            p.bezierCurveTo(50, -12, 56, -6, 56, 0);
            p.bezierCurveTo(56, 8, 48, 14, 36, 14);
            p.bezierCurveTo(32, 6, 32, -6, 38, -12);
            p.closePath();
        }), vgrad(ctx, -12, 14, dark, main), OUTLINE, 2.4);

        // SERRA CIRCULAR DE DENTES (marca registrada do Helicoprion)
        ctx.save();
        ctx.translate(40, 4);
        ctx.rotate(open * 0.35);
        // disco exposto
        paint(ctx, ell(2, 2, 10.5, 10.5), '#5b5344', OUTLINE, 2);
        ctx.save();
        ctx.beginPath();
        ctx.arc(2, 2, 10.5, 0, Math.PI * 2);
        ctx.clip();
        // espiral de dentes
        for (let i = 0; i < 26; i++) {
            const a = (i / 26) * Math.PI * 2 + spin * 0.2;
            const rr = 2 + (i / 26) * 8;
            const x = 2 + Math.cos(a) * rr;
            const y = 2 + Math.sin(a) * rr;
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(a + Math.PI / 2);
            ctx.fillStyle = '#f7f3e3';
            ctx.beginPath();
            ctx.moveTo(-1.7, 0);
            ctx.lineTo(1.7, 0);
            ctx.lineTo(0, -4.8);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = 'rgba(40,32,18,0.5)';
            ctx.lineWidth = 0.6;
            ctx.stroke();
            ctx.restore();
        }
        ctx.restore();
        // borda externa do disco
        paint(ctx, ell(2, 2, 10.5, 10.5), null, OUTLINE, 2);
        ctx.restore();

        eye(ctx, 46, -7, 3.2, { iris: '#1a2233', sclera: '#f4f1e4', angry: 0.35, skin: dark });
    }

    // ---------------- LIVYATAN ----------------
    function livyatan(ctx, c) {
        const wig = c.wig;
        const open = c.mouthOpen;
        const dark = '#5b6975', main = '#7f8f9c', belly = '#e6ecf1';
        const flap = Math.sin(c.animTime * 1.5);

        // Cauda em leme horizontal
        paint(ctx, path(p => {
            p.moveTo(-62, 0);
            p.bezierCurveTo(-74, -12, -86, -24, -92, -28 + wig * 2.4);
            p.bezierCurveTo(-84, -12, -78, -4, -70, 0);
            p.bezierCurveTo(-78, 6, -84, 16, -88, 26 + wig * 2.4);
            p.bezierCurveTo(-80, 14, -72, 6, -62, 0);
            p.closePath();
        }), dark, OUTLINE, 2.4);

        // Corpo de cachalote
        const body = path(p => {
            p.moveTo(40, -6);
            p.bezierCurveTo(30, -30, -4, -34, -36, -26);
            p.bezierCurveTo(-52, -20, -60, -8, -62, 0);
            p.bezierCurveTo(-60, 10, -50, 20, -30, 24);
            p.bezierCurveTo(0, 30, 30, 24, 40, -6);
            p.closePath();
        });
        paint(ctx, body, vgrad(ctx, -34, 30, dark, main), OUTLINE, 2.8);
        ctx.save();
        ctx.globalAlpha = 0.75;
        paint(ctx, path(p => {
            p.moveTo(34, 6);
            p.bezierCurveTo(10, 30, -28, 26, -56, 12);
            p.bezierCurveTo(-24, 32, 12, 32, 34, 6);
            p.closePath();
        }), belly, null);
        ctx.restore();

        // Corcova dorsal
        paint(ctx, path(p => {
            p.moveTo(-16, -30);
            p.quadraticCurveTo(-24, -42, -34, -40);
            p.quadraticCurveTo(-24, -36, -26, -28);
            p.closePath();
        }), dark, OUTLINE, 2.2);

        // Peitoral
        [1].forEach(s => {
            ctx.save();
            ctx.translate(6, 20);
            ctx.rotate(0.5 + flap * 0.28);
            paint(ctx, path(p => p.ellipse(2, 10, 17, 7, 0.3, 0, Math.PI * 2)), main, OUTLINE, 2.3);
            ctx.restore();
        });

        // Escoriações / cicatrizes típicas
        ctx.strokeStyle = 'rgba(240, 245, 250, 0.55)';
        ctx.lineWidth = 1.8;
        [[10, -18, 22, -22], [-8, -24, 4, -20], [-30, -16, -18, -12]].forEach(s => {
            ctx.beginPath();
            ctx.moveTo(s[0], s[1]);
            ctx.lineTo(s[2], s[3]);
            ctx.stroke();
        });

        // Cabeça enorme e quadrada (cachalote)
        const head = path(p => {
            p.moveTo(36, -30);
            p.bezierCurveTo(64, -34, 88, -24, 96, -10);
            p.bezierCurveTo(98, -2, 96, 4, 90, 8);
            p.bezierCurveTo(74, 14, 52, 14, 38, 10);
            p.bezierCurveTo(30, -4, 30, -20, 36, -30);
            p.closePath();
        });
        paint(ctx, head, vgrad(ctx, -34, 14, dark, main), OUTLINE, 2.7);

        // Mandíbula inferior comprida com dentes grandes
        const drop = open * 18;
        ctx.save();
        ctx.translate(44, 8);
        ctx.rotate(drop * 0.045);
        const jaw = path(p => {
            p.moveTo(0, -3);
            p.bezierCurveTo(18, -2, 36, 2, 44, 6);
            p.bezierCurveTo(34, 12, 16, 12, -2, 8);
            p.closePath();
        });
        paint(ctx, jaw, vgrad(ctx, -3, 12, '#3f4b56', main), OUTLINE, 2.4);
        ctx.fillStyle = '#fbfdf8';
        for (let i = 0; i < 9; i++) {
            const x = 2 + i * 4.8;
            ctx.beginPath();
            ctx.moveTo(x - 1.6, 1);
            ctx.lineTo(x + 1.6, 1);
            ctx.lineTo(x, -5.4);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();

        if (open > 0.15) {
            ctx.save();
            ctx.globalAlpha = Math.min(1, open * 1.2);
            paint(ctx, poly([[46, 4], [92, 6], [86, 12], [46, 12]]), '#54101a', null);
            ctx.restore();
        }

        // Olho pequeno, líquido escuro no topo do crânio
        eye(ctx, 62, -16, 3.4, { iris: '#12151a', sclera: '#dfe7ee' });
        // respiradouro
        paint(ctx, ell(48, -30, 3.2, 1.6), '#2c343d', OUTLINE, 1.2);
    }

    // ---------------- ABYSSAL LEVIATHAN (CHEFE) ----------------
    function abyssalLeviathan(ctx, c) {
        const wig = c.wig;
        const open = c.mouthOpen;
        const pulse = 0.65 + 0.35 * Math.sin(c.animTime * 1.6);
        const angry = open > 0.5;
        const glow = angry ? '#ff2a6d' : '#22e6ff';
        const glowSoft = angry ? 'rgba(255,42,109,0.5)' : 'rgba(34,230,255,0.5)';

        // tentáculos bioluminescentes traseiros
        ctx.save();
        ctx.shadowColor = glow;
        ctx.shadowBlur = 18;
        ctx.strokeStyle = glowSoft;
        for (let i = -2; i <= 2; i++) {
            const len = 70 + Math.abs(i) * 8;
            const s = Math.sin(c.animTime * 1.6 + i) * 14;
            ctx.lineWidth = 4 - Math.abs(i) * 0.5;
            ctx.beginPath();
            ctx.moveTo(-70, i * 10);
            ctx.bezierCurveTo(-70 - len * 0.4, i * 16 + s, -70 - len * 0.75, i * 22 - s * 1.4, -70 - len, i * 26 + s);
            ctx.stroke();
        }
        ctx.restore();

        // Cauda membranosa
        paint(ctx, path(p => {
            p.moveTo(-72, 0);
            p.bezierCurveTo(-92, -20, -116, -48 + wig * 3, -128, -58 + wig * 3);
            p.bezierCurveTo(-112, -26, -104, -12, -96, 0);
            p.bezierCurveTo(-104, 14, -112, 28, -118, 56 + wig * 3);
            p.bezierCurveTo(-96, 34, -86, 16, -72, 0);
            p.closePath();
        }), '#2b1a55', OUTLINE, 2.6);

        // Corpo titânico
        const body = path(p => {
            p.moveTo(58, -6);
            p.bezierCurveTo(38, -38, 0, -44, -40, -36);
            p.bezierCurveTo(-60, -30, -72, -14, -72, 0);
            p.bezierCurveTo(-72, 16, -58, 32, -34, 38);
            p.bezierCurveTo(6, 46, 38, 38, 58, -6);
            p.closePath();
        });
        ctx.save();
        ctx.shadowColor = glow;
        ctx.shadowBlur = 22;
        paint(ctx, body, vgrad(ctx, -44, 42, '#160a33', '#3d1a70'), OUTLINE, 3);
        ctx.restore();

        // Placas / veias bioluminescentes
        ctx.save();
        ctx.shadowColor = glow;
        ctx.shadowBlur = 16;
        ctx.strokeStyle = glow;
        ctx.globalAlpha = 0.55 + pulse * 0.4;
        ctx.lineWidth = 3;
        for (let i = 0; i < 6; i++) {
            const x = -50 + i * 18;
            ctx.beginPath();
            ctx.moveTo(x, -30 + i * 2);
            ctx.quadraticCurveTo(x + 6, 0, x, 30 - i * 2);
            ctx.stroke();
        }
        // linha dorsal luminosa
        ctx.beginPath();
        ctx.moveTo(-64, -12);
        ctx.quadraticCurveTo(-10, -40, 52, -16);
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.restore();

        // Espinhos dorsais múltiplos
        ctx.save();
        ctx.shadowColor = glow;
        ctx.shadowBlur = 14;
        for (let i = 0; i < 7; i++) {
            const x = -58 + i * 17;
            const h = 18 + Math.sin(i * 1.2) * 8 + pulse * 6;
            paint(ctx, poly([[x - 7, -32], [x, -32 - h], [x + 8, -30]]), i % 2 === 0 ? '#6d28d9' : '#22e6ff', OUTLINE, 1.8);
        }
        ctx.restore();

        // Olhos múltiplos
        ctx.save();
        ctx.shadowColor = glow;
        ctx.shadowBlur = 18;
        [-16, -6, 4].forEach((oy, i) => {
            paint(ctx, ell(44 + i * 9, oy, 4.6, 4.4), i === 2 ? glow : '#ff2a6d', null);
            paint(ctx, ell(44 + i * 9, oy, 1.8, 1.8), '#0b0416', null);
        });
        ctx.restore();

        // Mandíbula alienígena com presas de cristal
        const gape = open * 16;
        const upper = path(p => {
            p.moveTo(56, -20);
            p.quadraticCurveTo(88, -18, 104, -8);
            p.quadraticCurveTo(86, -6, 58, -6);
            p.closePath();
        });
        paint(ctx, upper, '#3b1d6e', OUTLINE, 2.6);
        ctx.save();
        ctx.translate(58, -2);
        ctx.rotate(gape * 0.05);
        const lower = path(p => {
            p.moveTo(0, 0);
            p.quadraticCurveTo(28, 6, 44, 14);
            p.quadraticCurveTo(26, 16, -2, 12);
            p.closePath();
        });
        paint(ctx, lower, '#2c1553', OUTLINE, 2.6);
        ctx.restore();

        if (open > 0.1) {
            ctx.save();
            ctx.globalAlpha = Math.min(1, open * 1.3);
            paint(ctx, poly([[56, -18], [104, -8], [102, 12], [56, 10]]), '#3c041f', null);
            ctx.restore();
        }

        // Presas de cristal
        ctx.save();
        ctx.shadowColor = glow;
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#c9fbff';
        for (let i = 0; i < 9; i++) {
            const x = 58 + i * 5.4;
            ctx.beginPath();
            ctx.moveTo(x - 1.8, -6);
            ctx.lineTo(x + 1.8, -6);
            ctx.lineTo(x, 3.4);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(x - 1.8, 12);
            ctx.lineTo(x + 1.8, 12);
            ctx.lineTo(x, 3);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
    }

    // ---------------- VOID-WALKER (abissal) ----------------
    function voidWalker(ctx, c) {
        const step = Math.sin(c.animTime * 5);
        const glow = '#7ef9ff';

        // pernas esguias
        ctx.strokeStyle = '#cfe8ee';
        ctx.lineWidth = 2.4;
        ctx.lineCap = 'round';
        for (let i = 0; i < 5; i++) {
            const x = -14 + i * 8;
            const off = Math.sin(c.animTime * 5 + i) * 4;
            [1, -1].forEach(s => {
                ctx.beginPath();
                ctx.moveTo(x, s * 4);
                ctx.quadraticCurveTo(x - 5, s * 13 + off, x - 1 + off * 0.4, s * 19 + off);
                ctx.stroke();
            });
        }

        // corpo ósseo segmentado
        const body = path(p => {
            p.moveTo(22, 0);
            p.bezierCurveTo(14, -9, -2, -12, -20, -8);
            p.bezierCurveTo(-26, -4, -26, 4, -20, 8);
            p.bezierCurveTo(-2, 12, 14, 9, 22, 0);
            p.closePath();
        });
        paint(ctx, body, vgrad(ctx, -12, 12, '#eef6f7', '#b9cfd6'), OUTLINE, 2.4);

        // costelas / espinhos
        ctx.strokeStyle = '#8fb7c1';
        ctx.lineWidth = 1.8;
        for (let i = 0; i < 5; i++) {
            const x = -16 + i * 8;
            ctx.beginPath();
            ctx.moveTo(x, -8);
            ctx.quadraticCurveTo(x + 2, 0, x, 8);
            ctx.stroke();
        }

        // núcleo luminoso + olhos vazios
        ctx.save();
        ctx.shadowColor = glow;
        ctx.shadowBlur = 16;
        paint(ctx, ell(-2, 0, 5.4, 4.6), glow, null);
        paint(ctx, ell(15, -4.6, 2.6, 2.6), glow, null);
        paint(ctx, ell(15, 4.2, 2.6, 2.6), glow, null);
        ctx.restore();

        // mandíbula óssea com presas
        const gape = c.mouthOpen * 9;
        ctx.strokeStyle = '#e8f3f5';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(20, -4);
        ctx.lineTo(28, -3 - gape * 0.4);
        ctx.moveTo(20, 4);
        ctx.lineTo(27, 5 + gape);
        ctx.stroke();
        ctx.fillStyle = '#f4fbfc';
        for (let i = 0; i < 5; i++) {
            const x = 21 + i * 2.2;
            ctx.beginPath();
            ctx.moveTo(x - 1, -3 - gape * 0.1);
            ctx.lineTo(x + 1, -3 - gape * 0.1);
            ctx.lineTo(x, 1.5);
            ctx.closePath();
            ctx.fill();
        }
    }

    // ---------------- DEEP-SEA NIGHTMARE (peixe-pescador) ----------------
    function deepSeaNightmare(ctx, c) {
        const wig = c.wig;
        const open = Math.max(0.55, c.mouthOpen);
        const dark = '#1b1016', main = '#3d1a24', belly = '#6b2b38';

        paint(ctx, poly([[-14, 0], [-26, -10 + wig * 2], [-23, 0], [-26, 10 + wig * 2]]), '#2a1420', OUTLINE, 2.2);
        paint(ctx, path(p => {
            p.moveTo(-4, -12);
            p.quadraticCurveTo(-2, -24, 8, -24);
            p.quadraticCurveTo(0, -18, 4, -11);
            p.closePath();
        }), '#2a1420', OUTLINE, 2.2);
        // espinhos laterais
        ctx.fillStyle = '#28131c';
        for (let i = 0; i < 5; i++) {
            const x = -10 + i * 6;
            ctx.beginPath();
            ctx.moveTo(x, 10);
            ctx.lineTo(x + 2, 18);
            ctx.lineTo(x + 4, 10);
            ctx.closePath();
            ctx.fill();
        }

        // corpo abissal
        const body = path(p => {
            p.moveTo(20, -4);
            p.bezierCurveTo(14, -16, -2, -18, -14, -13);
            p.bezierCurveTo(-22, -9, -22, 11, -12, 15);
            p.bezierCurveTo(2, 19, 16, 12, 20, -4);
            p.closePath();
        });
        paint(ctx, body, vgrad(ctx, -18, 19, '#120a12', main), OUTLINE, 2.6);
        ctx.save();
        ctx.globalAlpha = 0.55;
        paint(ctx, path(p => {
            p.moveTo(16, 4);
            p.bezierCurveTo(6, 14, -8, 14, -18, 9);
            p.bezierCurveTo(-4, 16, 8, 15, 16, 4);
            p.closePath();
        }), belly, null);
        ctx.restore();

        // pontos bioluminescentes
        ctx.save();
        ctx.shadowColor = '#8affc1';
        ctx.shadowBlur = 8;
        ctx.fillStyle = 'rgba(140,255,193,0.85)';
        for (let i = 0; i < 8; i++) {
            ctx.beginPath();
            ctx.arc(-12 + i * 3.4, 8 - Math.abs(i - 3) * 0.5, 1.3, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        // bocarra com presas agulha
        maw(ctx, { x: 10, y: 0, len: 24, spread: 0.24, open: open, maxOpen: 0.4, teeth: 12, size: 5.4, teethColor: '#f6ffe8' });
        // mandíbula superior reforçada
        paint(ctx, path(p => {
            p.moveTo(8, -9);
            p.quadraticCurveTo(18, -12, 30, -9);
            p.quadraticCurveTo(20, -5, 10, -4);
            p.closePath();
        }), '#241019', OUTLINE, 2.2);

        // illicium (antena com isca luminosa)
        ctx.strokeStyle = '#3a1f2a';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(10, -12);
        ctx.quadraticCurveTo(20, -34, 32, -26);
        ctx.stroke();
        ctx.save();
        ctx.shadowColor = '#d9ff5c';
        ctx.shadowBlur = 20;
        paint(ctx, ell(34, -25, 4.6, 4.6), '#e8ff8a', null);
        paint(ctx, ell(34, -25, 2, 2), '#ffffff', null);
        ctx.restore();
        // espinha dorsal da isca
        ctx.strokeStyle = '#c8e86a';
        ctx.lineWidth = 1.4;
        for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.moveTo(31 + i * 2, -22);
            ctx.lineTo(29 + i * 2.4, -17);
            ctx.stroke();
        }

        eye(ctx, 12, -7.5, 3.6, { iris: '#c8e86a', pupil: '#0a0a0a', sclera: '#f4ffdd', angry: 0.6, skin: '#241019' });
    }

    // ---------------- LUMINOUS JELLY-SPAWN ----------------
    function luminousJelly(ctx, c) {
        const pulse = Math.sin(c.pulsePhase) * 0.14;
        const glowPulse = 0.6 + 0.4 * Math.sin(c.animTime * 2.4);
        const r = 30;

        ctx.save();
        // tentáculos longos e luminosos
        ctx.shadowColor = '#5df2ff';
        ctx.shadowBlur = 14;
        ctx.strokeStyle = 'rgba(120,240,255,0.85)';
        ctx.lineWidth = 2.4;
        ctx.lineCap = 'round';
        for (let i = -4; i <= 4; i++) {
            const x0 = i * 6;
            ctx.beginPath();
            ctx.moveTo(x0, 4);
            ctx.bezierCurveTo(
                x0 + Math.sin(c.animTime * 1.4 + i) * 9, 26,
                x0 + Math.cos(c.animTime * 1.2 + i * 1.3) * 12, 48,
                x0 + Math.sin(c.animTime * 1.1 + i * 0.7) * 10, 70
            );
            ctx.stroke();
        }
        // tentáculos internos mais curtos
        ctx.strokeStyle = 'rgba(200,255,255,0.7)';
        ctx.lineWidth = 1.6;
        for (let i = -3; i <= 3; i++) {
            ctx.beginPath();
            ctx.moveTo(i * 5, 4);
            ctx.quadraticCurveTo(i * 6 + Math.sin(c.animTime * 2 + i) * 6, 20, i * 7, 34);
            ctx.stroke();
        }

        // cúpula
        const bell = path(p => {
            p.moveTo(-r * (1 + pulse), 2);
            p.bezierCurveTo(-r * (1 + pulse), -r * 1.5, r * (1 + pulse), -r * 1.5, r * (1 + pulse), 2);
            const n = 8;
            for (let i = 0; i <= n; i++) {
                const x = r * (1 + pulse) - (i / n) * 2 * r * (1 + pulse);
                p.lineTo(x, i % 2 === 0 ? 7.5 : 1.5);
            }
            p.closePath();
        });
        const g = ctx.createLinearGradient(0, -r * 1.5, 0, 6);
        g.addColorStop(0, 'rgba(255,255,255,0.95)');
        g.addColorStop(0.4, 'rgba(90,235,255,0.9)');
        g.addColorStop(1, 'rgba(30,140,220,0.85)');
        paint(ctx, bell, g, OUTLINE, 2.4);

        // anéis luminosos internos
        ctx.save();
        ctx.globalAlpha = 0.5 + glowPulse * 0.4;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        for (let i = 1; i <= 3; i++) {
            ctx.beginPath();
            ctx.ellipse(0, -6, i * 7, i * 4.6, 0, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.restore();

        // núcleo pulsante
        ctx.fillStyle = `rgba(255,255,255,${0.6 + glowPulse * 0.4})`;
        ctx.beginPath();
        ctx.arc(0, -12, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // ============================================================
    // TABELA DE DISPATCH: typeId -> função de arte
    // ============================================================
    const ART = {
        peixe_pequeno: A.smallFish,
        peixe_palhaco: A.clownfish,
        baiacu: A.pufferfish,
        agua_viva: (ctx, c) => A.jellyfish(ctx, c, {}),
        caranguejo: A.crab,
        peixe_lanterna: A.lanternfish,
        lula_pequena: A.smallSquid,
        moreia: (ctx, c) => A.morayEel(ctx, c, {}),
        cavalo_marinho: A.seahorse,
        estrela_do_mar: A.starfish,
        tartaruga_marinha: A.seaTurtle,
        arraia_comum: A.stingray,

        tubarao: A.shark,
        tubarao_martelo: A.hammerhead,
        arraia_gigante: A.mantaRay,
        polvo_gigante: A.giantOctopus,
        lula_gigante: A.giantSquid,
        moreia_gigante: A.giantMoray,

        dunkleosteus: (ctx, c) => A.dunkleosteus(ctx, c),
        megalodon: (ctx, c) => A.megalodon(ctx, c),
        mosasaurus: (ctx, c) => A.mosasaurus(ctx, c),
        pliosaurus: (ctx, c) => A.pliosaurus(ctx, c),
        helicoprion: (ctx, c) => A.helicoprion(ctx, c),
        livyatan: (ctx, c) => A.livyatan(ctx, c),

        abyssal_leviathan: (ctx, c) => A.abyssalLeviathan(ctx, c),
        void_walker: (ctx, c) => A.voidWalker(ctx, c),
        deep_sea_nightmare: (ctx, c) => A.deepSeaNightmare(ctx, c),
        luminous_jelly_spawn: (ctx, c) => A.luminousJelly(ctx, c)
    };

    Object.assign(A, {
        megalodon, dunkleosteus, mosasaurus, pliosaurus, helicoprion, livyatan,
        abyssalLeviathan, voidWalker, deepSeaNightmare, luminousJelly, ART
    });

    // ============================================================
    // CACHE DE SPRITES (PERFORMANCE)
    // ------------------------------------------------------------
    // Cada criatura é rasterizada UMA vez por "pose" em um canvas
    // offscreen e depois apenas copiada (drawImage) a cada frame.
    // Isso reduz de ~80 operações de path por criatura/frame para 1 blit,
    // mantendo exatamente o mesmo visual. As poses são geradas sob
    // demanda (lazy) e o cache tem teto de memória.
    // ============================================================
    const POSES = 8;              // quadros de animação por ciclo
    const MOUTH_BUCKETS = 3;      // boca fechada / entreaberta / atacando
    const MAX_SPRITES = 200;      // teto de canvases em memória
    const spriteCache = new Map();
    let spriteCount = 0;
    A.cacheStats = { sprites: 0, hits: 0, misses: 0 };

    function poseOf(c) {
        const twoPi = Math.PI * 2;
        let t = c.animTime % twoPi;
        if (t < 0) t += twoPi;
        return Math.floor((t / twoPi) * POSES) % POSES;
    }

    function mouthOf(c) {
        const m = c.mouthOpen || 0;
        return m > 0.66 ? 2 : (m > 0.28 ? 1 : 0);
    }

    /** Rasteriza a criatura em um canvas próprio (coordenadas locais centradas) */
    function bakeSprite(typeId, pose, mouth, radius) {
        const fn = ART[typeId];
        if (!fn) return null;

        const half = Math.ceil(radius * 2.05) + 6;
        const size = half * 2;
        const cv = document.createElement('canvas');
        cv.width = size;
        cv.height = size;
        const g = cv.getContext('2d');

        // "criatura fantasma" com pose fixa (determinística) para o desenho
        const angle = ((pose + 0.5) / POSES) * Math.PI * 2;
        const proxy = {
            typeId: typeId,
            type: (typeof CREATURE_TYPES !== 'undefined' && CREATURE_TYPES[typeId]) || { radius: radius, color: '#7fd4ef' },
            radius: radius,
            animTime: angle,
            pulsePhase: angle * 0.8,
            mouthOpen: mouth === 2 ? 1 : (mouth === 1 ? 0.45 : 0.06),
            puffed: mouth === 2 ? 1 : (mouth === 1 ? 0.5 : 0),
            glowPulse: 0.8,
            aiState: 'IDLE',
            ai: { aggressive: false }
        };
        proxy.wig = Math.sin(angle) * 6.5;
        proxy.wigFast = Math.sin(angle * 2.2);

        g.translate(half, half);
        fn(g, proxy);
        return cv;
    }

    function getSprite(c) {
        const key = c.typeId + ':' + poseOf(c) + ':' + mouthOf(c);
        let cv = spriteCache.get(key);
        if (cv) {
            A.cacheStats.hits++;
            return cv;
        }
        A.cacheStats.misses++;
        if (spriteCount >= MAX_SPRITES) {
            spriteCache.clear();
            spriteCount = 0;
        }
        try {
            cv = bakeSprite(c.typeId, poseOf(c), mouthOf(c), c.radius);
        } catch (err) {
            if (window.console) console.error('[CreatureArt] falha ao rasterizar ' + c.typeId, err);
            cv = null;
        }
        if (cv) {
            spriteCache.set(key, cv);
            spriteCount++;
            A.cacheStats.sprites = spriteCount;
        }
        return cv;
    }

    /** Ponto único de entrada usado por Creature.draw() */
    A.draw = function (ctx, c) {
        const fn = ART[c.typeId];

        // Sem sprite conhecido: renderiza direto (ou usa o fallback genérico)
        if (!fn) {
            A.fallback(ctx, c);
            return;
        }

        // Com cache desligado (debug), desenha em tempo real
        if (A.disableCache) {
            try { fn(ctx, c); } catch (err) { A.fallback(ctx, c); }
            return;
        }

        const sprite = getSprite(c);
        if (sprite) {
            const half = sprite.width / 2;
            try {
                ctx.drawImage(sprite, -half, -half);
                return;
            } catch (err) {
                if (window.console) console.error('[CreatureArt] falha ao copiar sprite ' + c.typeId, err);
            }
        }

        try {
            fn(ctx, c);
        } catch (err) {
            if (window.console) console.error('[CreatureArt] falha ao desenhar ' + c.typeId, err);
            A.fallback(ctx, c);
        }
    };
})(window);
