# DEEP HUNT — evolução da versão existente

Jogo de caça submarina em Canvas 2D. Esta é a **continuação do projeto original**
(as funcionalidades anteriores foram mantidas) com as alterações pedidas:
nova IA dos predadores, Game Over corrigido, 5 corações, sprites novos das
criaturas e cenário submarino em camadas.

---

## Como rodar

O jogo é 100% estático (HTML + CSS + JS puro, sem build):

```bash
cd deep-hunt
python3 -m http.server 8080
# abra http://localhost:8080
```

> Também funciona abrindo `index.html` direto no navegador, mas servir por HTTP
> é o recomendado (localStorage/fontes se comportam melhor).

---

## Estrutura de arquivos

```
deep-hunt/
├── index.html                  (HUD ajustado p/ 5 corações + novos scripts + bestiário atualizado)
├── css/style.css               (animação de dano nos corações)
├── js/
│   ├── storage.js              (inalterado: ranking, skins, missões, config)
│   ├── audio.js                (inalterado: SFX e música sintetizados)
│   ├── creature-art.js         (NOVO ★) sprites 2D de todas as 28 criaturas
│   ├── environment.js          (NOVO ★) cenário submarino em camadas + overlays
│   ├── player.js               (5 corações, estado de morte, controles bloqueados)
│   ├── bullets.js              (+ updateVisualsOnly p/ cena congelada)
│   ├── creatures.js            (REESCRITO ★ bestiário + IA em máquina de estados)
│   ├── ui.js                   (HUD dos 5 corações + limpeza de timers)
│   └── game.js                 (REESCRITO ★ fluxo de estados, DYING→GAMEOVER, cenário)
├── referencias-criaturas.png   (imagem 1 fornecida)
└── referencias-cenario.png     (imagem 2 fornecida)
```

---

## 1. IA dos predadores (PRIORIDADE 1)

Máquina de estados implementada em `js/creatures.js`:

```
IDLE → ALERT (detecta) → CHASE → ATTACK → RETREAT → COOLDOWN → CHASE novamente
```

| Estado    | Comportamento |
|-----------|---------------|
| IDLE      | Patrulha com wander + "território" (volta para casa se se afastar) |
| ALERT     | Vira para o jogador, freia e mostra "!" (telegrafia) |
| CHASE     | Persegue **mantendo distância mínima** (`standoff`); nunca cola |
| ATTACK    | Telegrafia curta → investida em **linha reta** (dá para desviar) → **1 único hit** |
| RETREAT   | Afasta-se rápido do jogador (velocidade × 1.3) até `retreatDistance` |
| COOLDOWN  | Circula observando; **não causa dano**; timer individual por criatura |

Regras de balanceamento:

- Velocidade dos predadores **abaixo** da do mergulhador (285 px/s) — a fuga sempre funciona.
- Cada ataque = **1 coração**. O ataque só "acerta" uma vez (`hasHitThisAttack`).
- Após o ataque, RECUO tem prioridade (mesmo se estiver colado no jogador).
- Cooldowns individuais de 2,6 s a 5,0 s (chefe incluso).
- Invulnerabilidade do jogador de 1,5 s entre danos (proteção extra).
- Colisão de contato **não causa dano** em predadores (só águas-vivas ferroam, com cooldown próprio).
- Separação física dura: a criatura é reposicionada, o **jogador nunca é empurrado**.
- Repulsão entre criaturas evita empilhamento/colagem em grupo.

## 2. Game Over (PRIORIDADE 2)

Fluxo de estados do engine (`js/game.js`):

```
MENU → PLAYING ⇄ PAUSED
           ↓ vida = 0
        DYING (1,2 s)  → controles off, IA congelada, dano desativado, sem timers novos
           ↓
        GAMEOVER (tela sempre exibida)
           ↓ RESTART
        startGame() = reset completo (5 corações, IA, spawns, timers, HUD)
```

Correções de causa raiz:

1. `requestAnimationFrame` é reagendado **antes** de update/render → erro de frame não mata o loop.
2. `update`/`render` em `try/catch` com contador de erros e estado seguro.
3. `applyPlayerDamage` só funciona em `PLAYING` (dano desligado em DYING/GAMEOVER/PAUSED/MENU).
4. `creatureManager.freezeAll()` zera velocidades e tira a IA de CHASE/ATTACK.
5. `gameUI.clearPendingTimers()` limpa timers de banner/toast em restart/menu.
6. Delta time limitado (máx. 0,05 s) + pausa automática ao trocar de aba → sem "dano em massa" ao voltar o foco.
7. `finishGameOver()` tem trava de idempotência (nunca roda 2×).

## 3. Vida: 5 corações (PRIORIDADE 3)

- `player.maxHealth = 5` · HUD `❤️❤️❤️❤️❤️` com corações vazios 🖤.
- Animação de "tremida" na cápsula ao perder vida (CSS `heartsHit`).
- Vida cai apenas por ataque real; nunca em sequência rápida.

## 4. Criaturas (PRIORIDADE 4)

`js/creature-art.js` desenha **28 criaturas** com corpo/olho/boca/nadadeiras/
dentes/padrões seguindo a folha de referência fornecida:

- **Comuns:** Peixe Pequeno, Peixe-Palhaço, Baiacu, Água-Viva, Caranguejo,
  Peixe-Lanterna, Lula Pequena, Moreia, Cavalo-Marinho, Estrela-do-Mar,
  Tartaruga Marinha, Arraia.
- **Perigosas:** Tubarão, Tubarão-Martelo, Moreia Gigante, Arraia Manta Gigante,
  Polvo Gigante, Lula Gigante.
- **Pré-históricas:** Dunkleosteus (placas ósseas laminadas), Helicoprion
  (serra circular de dentes girando), Pliosaurus, Megalodon (bocarra dupla),
  Mosasaurus, Livyatan (cachalote pré-histórico com cicatrizes).
- **Abissais:** Void-Walker (esqueleto luminoso), Deep-Sea Nightmare
  (peixe-pescador com isca), Luminous Jelly-Spawn (medusa neon),
  Abyssal Leviathan (chefe, placas/tentáculos bioluminescentes).

**Performance:** cada sprite é rasterizado uma única vez por "pose" e copiado
com `drawImage` (cache com teto de memória) — o custo de desenho de uma
criatura caiu de ~80 operações de path/quadro para 1 blit.

## 5. Cenário submarino (PRIORIDADE 5)

`js/environment.js` — 4 camadas de parallax pré-renderizadas por região:

1. **Fundo:** gradiente de profundidade, brilho de superfície, raios de sol,
   cordilheira distante, **navio naufragado** (casco, 3 mastros, velas rasgadas,
   cordames) e cardume em silhueta.
2. **Meio:** areia com dunas e textura, rochas laterais com **cavernas**,
   corais, vegetação e (em zonas profundas) **fósseis de costelas gigantes**.
3. **Detalhes:** grupos de corais (cérebro, tubo, leque, anêmona), gramas,
   conchas e estrela-do-mar.
4. **Primeiro plano:** faixa de cascalho no rodapé + vinheta — nunca cobre a
   área jogável.

Animado por quadro: algas balançando, neve marinha, raios de luz e motes
bioluminescentes nas zonas escuras. Cada zona (`reef`, `deep`, `abyss`,
`unknown`) tem paleta e elementos próprios.

---

## Testes executados (Chromium headless + Playwright)

| # | Teste | Resultado |
|---|-------|-----------|
| 1 | Detecção e aproximação | IDLE→ALERT→CHASE observados; persegue a distância segura |
| 2 | 1 hit por ataque | 100% dos danos dentro do estado ATTACK |
| 3 | Recuo após ataque | RETREAT alcança 235 px de distância |
| 4 | Cooldown sem dano | 0 danos durante COOLDOWN |
| 5 | Reengajamento | CHASE repetido após cada cooldown |
| 6 | Fuga possível | +230 px de distância em 1,6 s de corrida |
| 7 | 5 corações → GAME OVER | tela aparece, IA congelada, jogo não trava |
| 8 | RESTART | volta com 5 corações, IA ativa, sem flags mortas |
| 9 | Estresse (15 predadores juntos) | todos completam o ciclo; cooldown individual OK; nenhuma criatura penetrou (< 26 px) no jogador |
| 10 | Desempenho | **55 FPS** (headless) contra 30 FPS da versão original |
