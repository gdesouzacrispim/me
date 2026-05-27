/* ============================================================================
 * OPERAÇÃO ESTREITO MINADO
 * ---------------------------------------------------------------------------
 * Campo Minado satírico ambientado no Estreito de Ormuz.
 *
 * Organização do arquivo:
 *   §1  CONFIG        — dificuldades, mensagens, frases satíricas
 *   §2  STATE         — estado global do jogo
 *   §3  STORAGE       — persistência (localStorage)
 *   §4  AUDIO         — efeitos sonoros procedurais (Web Audio API)
 *   §5  LOGIC         — geração do tabuleiro e regras de campo minado
 *   §6  RENDER        — criação e atualização de DOM
 *   §7  EFFECTS       — shake, flash, animação de explosão
 *   §8  HUD / LOG     — atualização de pontuação, tempo, log de operações
 *   §9  EVENT HANDLERS — clique, clique direito, teclado, resize
 *   §10 SCREEN FLOW   — telas inicial / jogo / vitória / derrota
 *   §11 INIT          — inicialização da aplicação
 * ========================================================================== */


/* ===========================================================
 * §1  CONFIG
 * ========================================================== */

const DIFFICULTIES = {
  easy:   { key: 'easy',   rows: 9,  cols: 12, mines: 12, label: 'FÁCIL',       multiplier: 1 },
  medium: { key: 'medium', rows: 12, cols: 18, mines: 35, label: 'MÉDIO',       multiplier: 2 },
  crisis: { key: 'crisis', rows: 16, cols: 24, mines: 80, label: 'CRISE TOTAL', multiplier: 4 }
};

// Pontos por tipo de ação
const POINTS = {
  reveal:        10,    // cada célula limpa revelada
  streakBonus:    2,    // bônus multiplicado pela sequência atual
  flagCorrect:   25,    // marcou uma mina corretamente (ao vencer)
  victoryBase: 500,    // bônus de vitória base
  timeBonus:      5,    // bônus por segundo restante (caso < 5min)
  wrongFlag:    -15     // marcou uma posição que não era mina (penalidade no fim)
};

// Os "alvos" da sátira - imagens locais
const TARGETS = [
  { id: 'trump',   src: 'assets/images/trump.png',   weight: 50, line: 'Mina do Trump detonada. Twitter pegou fogo.' },
  { id: 'vance',   src: 'assets/images/vance.png',   weight: 17, line: 'Vance ativado. Vice em modo defensivo no podcast.' },
  { id: 'rubio',   src: 'assets/images/rubio.png',   weight: 17, line: 'Rubio detonado. Departamento de Estado em chamas.' },
  { id: 'hegseth', src: 'assets/images/hegseth.png', weight: 16, line: 'Hegseth ativado. Pentágono convoca coletiva.' }
];

// Frases satíricas para o log de operações
const OPS_MESSAGES = {
  start: [
    'Frota americana posicionada no Golfo. Aguardando ordens.',
    'Inteligência confirma minas espalhadas pelo Estreito.',
    'CIC operacional. Iniciando varredura sonar.',
    'Aliados notificados. Mídia internacional em alerta.'
  ],
  reveal: [
    'Zona limpa. Avanço autorizado.',
    'Setor neutralizado.',
    'Sonar não detectou anomalias.',
    'Avanço aprovado pelo comando.',
    'Quadrante seco. Próximo.'
  ],
  flag: [
    'Suspeita registrada. Marcação no mapa.',
    'Possível mina diplomática reportada.',
    'Equipe de demolição em standby.',
    'Coordenada flagada para a inteligência.'
  ],
  flagRemoved: [
    'Marcação retirada. Comando reavalia.',
    'Falso alarme. Reabertura do setor.'
  ],
  streak: [
    'Avanço sem incidentes — moral da tropa em alta.',
    'Comando saúda a precisão da operação.',
    'Sequência limpa registrada nos relatórios.'
  ],
  defeat: [
    'CRISE NO GOLFO! Manchetes globais explodem.',
    'Mina diplomática ativada. Bolsas despencam.',
    'Operação comprometida. Mídia em frenesi.',
    'EXPLOSÃO ESTRATÉGICA! Aliados pedem explicações.'
  ],
  victory: [
    'Estreito limpo. Comando neutralizado com sucesso.',
    'Operação encerrada. Honras militares serão concedidas.',
    'Mídia anuncia vitória diplomática. Bolsas em alta.'
  ]
};

// Títulos do modal de derrota — variam conforme o "alvo"
const DEFEAT_TITLES = {
  trump:   'TWITTER GLOBAL EM CHAMAS',
  vance:   'VICE-PRESIDENTE NEUTRALIZADO',
  rubio:   'DEPARTAMENTO DE ESTADO EM CRISE',
  hegseth: 'PENTÁGONO EM ALERTA MÁXIMO'
};

const DEFEAT_DESCS = {
  trump:   'Você ativou a mina mais barulhenta do estreito. Manchetes mundiais explodem em três fusos horários simultaneamente.',
  vance:   'Uma mina vice-presidencial foi detonada. O podcast oficial já está sendo gravado em formato pós-crise.',
  rubio:   'Mina secretarial ativada. Briefings em três idiomas estão sendo redigidos enquanto você lê isto.',
  hegseth: 'Mina ministerial ativada. O Pentágono convoca coletiva de imprensa para daqui a quinze minutos.'
};

// Mensagens satíricas no rodapé do título
const VICTORY_DESCS = [
  'Você atravessou o Estreito sem detonar uma única mina diplomática. A imprensa internacional saudará seu sangue-frio.',
  'Operação encerrada sem baixas. Aliados enviam parabenizações criptografadas pelos canais oficiais.',
  'O Estreito está aberto à navegação civil. Bolsas reagem em alta. Você virou capa de revista.'
];


/* ===========================================================
 * §2  STATE
 * ========================================================== */

const State = {
  difficulty: null,    // 'easy' | 'medium' | 'crisis'
  rows: 0,
  cols: 0,
  totalMines: 0,
  grid: [],            // matriz [row][col] = { mine, revealed, flagged, n, el, target? }
  firstClick: true,
  isGameOver: false,
  isVictory: false,

  // Pontuação
  score: 0,
  streak: 0,
  flagsPlaced: 0,
  revealedCount: 0,

  // Tempo
  startedAt: 0,
  elapsed: 0,           // em segundos
  timerId: null,

  // Último alvo detonado
  lastTarget: null
};


/* ===========================================================
 * §3  STORAGE
 * ========================================================== */

const STORAGE_KEY = 'operacao_estreito_minado_records_v1';

function loadBestScores() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { easy: null, medium: null, crisis: null };
    return JSON.parse(raw);
  } catch (e) {
    return { easy: null, medium: null, crisis: null };
  }
}

function saveBestScore(diffKey, score) {
  const records = loadBestScores();
  if (records[diffKey] == null || score > records[diffKey]) {
    records[diffKey] = score;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(records)); } catch (e) {}
    return true;
  }
  return false;
}


/* ===========================================================
 * §4  AUDIO — efeitos sonoros procedurais leves (Web Audio API)
 *
 * Geramos os sons em tempo real para não depender de arquivos.
 * Qualquer falha é silenciada (audio é "nice-to-have").
 * ========================================================== */

let audioCtx = null;
function ensureAudio() {
  if (audioCtx) return audioCtx;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  } catch (e) {
    audioCtx = null;
  }
  return audioCtx;
}

function playTone({ freq = 440, type = 'sine', dur = 0.12, vol = 0.18, slideTo = null, delay = 0 } = {}) {
  const ctx = ensureAudio();
  if (!ctx) return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo != null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(vol, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function playNoise({ dur = 0.4, vol = 0.4, lowpass = 1200 } = {}) {
  const ctx = ensureAudio();
  if (!ctx) return;
  const bufferSize = ctx.sampleRate * dur;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 1.5);
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = lowpass;
  const gain = ctx.createGain();
  gain.gain.value = vol;
  src.connect(filter).connect(gain).connect(ctx.destination);
  src.start();
}

const SFX = {
  reveal: () => playTone({ freq: 760, type: 'triangle', dur: 0.06, vol: 0.08 }),
  flag:   () => playTone({ freq: 220, type: 'square',   dur: 0.08, vol: 0.10, slideTo: 160 }),
  unflag: () => playTone({ freq: 180, type: 'square',   dur: 0.06, vol: 0.08 }),
  explosion: () => {
    playNoise({ dur: 0.9, vol: 0.5, lowpass: 800 });
    playTone({ freq: 120, type: 'sawtooth', dur: 0.8, vol: 0.25, slideTo: 30 });
    playTone({ freq: 90,  type: 'sine',     dur: 1.2, vol: 0.3,  slideTo: 25, delay: 0.05 });
  },
  victory: () => {
    [523, 659, 784, 1046].forEach((f, i) => {
      playTone({ freq: f, type: 'triangle', dur: 0.18, vol: 0.18, delay: i * 0.1 });
    });
  },
  alert: () => playTone({ freq: 880, type: 'square', dur: 0.18, vol: 0.15, slideTo: 660 })
};


/* ===========================================================
 * §5  LOGIC — geração e regras
 * ========================================================== */

function makeEmptyGrid(rows, cols) {
  const grid = [];
  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) {
      row.push({ mine: false, revealed: false, flagged: false, n: 0, el: null, target: null });
    }
    grid.push(row);
  }
  return grid;
}

/**
 * Posiciona minas aleatoriamente, garantindo que a primeira célula clicada
 * e seus vizinhos diretos NUNCA sejam minas (regra clássica para evitar
 * derrota imediata no primeiro clique).
 */
function placeMines(grid, rows, cols, totalMines, safeR, safeC) {
  const forbidden = new Set();
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const nr = safeR + dr, nc = safeC + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
        forbidden.add(nr * cols + nc);
      }
    }
  }

  const candidates = [];
  for (let i = 0; i < rows * cols; i++) {
    if (!forbidden.has(i)) candidates.push(i);
  }
  // Fisher-Yates parcial para escolher N únicos
  for (let i = candidates.length - 1; i > 0 && i > candidates.length - totalMines - 1; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  const chosen = candidates.slice(-totalMines);

  for (const idx of chosen) {
    const r = Math.floor(idx / cols);
    const c = idx % cols;
    grid[r][c].mine = true;
    grid[r][c].target = pickTarget();
  }

  // Calcula contagem de minas vizinhas para cada célula
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c].mine) continue;
      let n = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (!dr && !dc) continue;
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc].mine) n++;
        }
      }
      grid[r][c].n = n;
    }
  }
}

/** Escolhe um "alvo" (político) com pesos definidos em TARGETS */
function pickTarget() {
  const totalWeight = TARGETS.reduce((s, t) => s + t.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const t of TARGETS) {
    if (roll < t.weight) return t;
    roll -= t.weight;
  }
  return TARGETS[0];
}

/**
 * Revela a célula. Se for vazia (n=0), faz flood-fill nos vizinhos.
 * Retorna true se a célula clicada era mina.
 */
function revealCell(r, c) {
  const { rows, cols, grid } = State;
  if (r < 0 || c < 0 || r >= rows || c >= cols) return false;
  const cell = grid[r][c];
  if (cell.revealed || cell.flagged) return false;

  cell.revealed = true;
  State.revealedCount++;
  renderRevealed(cell, r, c);

  if (cell.mine) return true;

  // Pontuação
  State.streak++;
  const streakBonus = State.streak * POINTS.streakBonus;
  addScore(POINTS.reveal + streakBonus);

  if (State.streak === 10 || State.streak === 25 || State.streak === 50) {
    addOpsLog(rand(OPS_MESSAGES.streak), 'success');
  }

  // Flood fill se n=0
  if (cell.n === 0) {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        revealCell(r + dr, c + dc);
      }
    }
  }
  return false;
}

/** Verifica vitória: todas as células não-mina reveladas */
function checkVictory() {
  const target = State.rows * State.cols - State.totalMines;
  return State.revealedCount >= target;
}


/* ===========================================================
 * §6  RENDER
 * ========================================================== */

const $   = (sel, ctx = document) => ctx.querySelector(sel);
const $$  = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

function buildBoard() {
  const board = $('#board');
  board.innerHTML = '';
  board.style.gridTemplateColumns = `repeat(${State.cols}, 1fr)`;
  board.style.gridTemplateRows = `repeat(${State.rows}, 1fr)`;

  for (let r = 0; r < State.rows; r++) {
    for (let c = 0; c < State.cols; c++) {
      const div = document.createElement('div');
      div.className = 'cell';
      div.dataset.r = r;
      div.dataset.c = c;
      div.setAttribute('role', 'gridcell');
      div.setAttribute('aria-label', `Setor ${String.fromCharCode(65 + c)}${r + 1}`);
      board.appendChild(div);
      State.grid[r][c].el = div;
    }
  }
  sizeBoard();
  buildCoords();
}

function buildCoords() {
  const top  = $('#coords-top');
  const left = $('#coords-left');
  top.innerHTML = '';
  left.innerHTML = '';

  // Letras nas colunas (A, B, C...)
  const showColEvery = State.cols > 18 ? 2 : 1;
  for (let c = 0; c < State.cols; c++) {
    const span = document.createElement('span');
    span.textContent = (c % showColEvery === 0) ? String.fromCharCode(65 + c) : '';
    top.appendChild(span);
  }
  // Números nas linhas
  const showRowEvery = State.rows > 12 ? 2 : 1;
  for (let r = 0; r < State.rows; r++) {
    const span = document.createElement('span');
    span.textContent = (r % showRowEvery === 0) ? String(r + 1) : '';
    left.appendChild(span);
  }
}

/** Ajusta o tamanho do board para preencher o espaço disponível */
function sizeBoard() {
  const board = $('#board');
  const wrap = $('.board-wrap');
  if (!board || !wrap) return;
  const wRect = wrap.getBoundingClientRect();
  const gap = 2;
  const cellSize = Math.floor(Math.min(
    (wRect.width  - (State.cols - 1) * gap) / State.cols,
    (wRect.height - (State.rows - 1) * gap) / State.rows
  ));
  if (!isFinite(cellSize) || cellSize < 4) return;
  const totalW = cellSize * State.cols + (State.cols - 1) * gap;
  const totalH = cellSize * State.rows + (State.rows - 1) * gap;
  board.style.width  = `${totalW}px`;
  board.style.height = `${totalH}px`;
}

/** Renderiza visualmente a célula que acabou de ser revelada */
function renderRevealed(cell, r, c) {
  const el = cell.el;
  el.classList.add('revealed', 'appear');
  if (cell.mine) {
    el.classList.add('exploded');
  } else if (cell.n > 0) {
    el.dataset.n = String(cell.n);
    el.textContent = String(cell.n);
  } else {
    el.dataset.n = '0';
  }
  if (!cell.mine) SFX.reveal();
}

/** Mostra todas as minas no fim de jogo */
function revealAllMines() {
  for (let r = 0; r < State.rows; r++) {
    for (let c = 0; c < State.cols; c++) {
      const cell = State.grid[r][c];
      if (cell.mine && !cell.revealed) {
        cell.el.classList.add('mine-revealed');
      } else if (!cell.mine && cell.flagged) {
        cell.el.classList.add('wrong-flag');
      }
    }
  }
}


/* ===========================================================
 * §7  EFFECTS — shake, flash, animação de explosão
 * ========================================================== */

function screenShake() {
  document.body.classList.remove('shake');
  // forçar reflow para reiniciar a animação
  void document.body.offsetWidth;
  document.body.classList.add('shake');
  setTimeout(() => document.body.classList.remove('shake'), 800);
}

function flashRed() {
  const f = $('#flash-overlay');
  f.classList.add('active');
  setTimeout(() => f.classList.remove('active'), 90);
  setTimeout(() => { f.classList.add('active'); }, 200);
  setTimeout(() => { f.classList.remove('active'); }, 320);
}

function showBoomScene(target) {
  const scene = $('#boom-scene');
  const img = $('#boom-portrait');
  const word = $('#boom-word');
  img.src = target.src;
  img.onerror = () => {
    // Fallback caso a imagem não carregue: substitui por um SVG placeholder
    img.onerror = null;
    img.src = "data:image/svg+xml;utf8," + encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'>
        <rect width='200' height='200' fill='%231a2940'/>
        <text x='100' y='110' text-anchor='middle' font-family='Georgia' font-size='80' fill='%23ffb000'>?</text>
      </svg>`
    );
  };
  // Variação cartunesca do "BOOM" por alvo
  const words = {
    trump:   'BOOM!',
    vance:   'KA-POW!',
    rubio:   'BANG!',
    hegseth: 'KABOOM!'
  };
  word.textContent = words[target.id] || 'BOOM!';

  scene.classList.remove('fire');
  void scene.offsetWidth;
  scene.classList.add('fire');
}


/* ===========================================================
 * §8  HUD / LOG
 * ========================================================== */

function addScore(amount) {
  State.score += amount;
  if (State.score < 0) State.score = 0;
  const el = $('#readout-score');
  el.textContent = State.score.toLocaleString('pt-BR');
  el.classList.remove('pulse');
  void el.offsetWidth;
  if (amount > 0) el.classList.add('pulse');
}

function updateStreak() {
  $('#readout-streak').textContent = `×${State.streak}`;
}

function updateMines() {
  const remaining = State.totalMines - State.flagsPlaced;
  $('#readout-mines').textContent = String(remaining).padStart(2, '0');
}

function updateTime() {
  const m = Math.floor(State.elapsed / 60);
  const s = State.elapsed % 60;
  $('#readout-time').textContent =
    String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

function updateBestScore() {
  const records = loadBestScores();
  const best = records[State.difficulty];
  $('#readout-best').textContent = best != null ? best.toLocaleString('pt-BR') : '—';
}

function startTimer() {
  stopTimer();
  State.startedAt = Date.now();
  State.elapsed = 0;
  updateTime();
  State.timerId = setInterval(() => {
    State.elapsed = Math.floor((Date.now() - State.startedAt) / 1000);
    updateTime();
  }, 1000);
}

function stopTimer() {
  if (State.timerId) {
    clearInterval(State.timerId);
    State.timerId = null;
  }
}

/* --- Log de operações --- */
function addOpsLog(text, kind = '') {
  const list = $('#ops-log-list');
  if (!list) return;
  const li = document.createElement('li');
  if (kind) li.className = kind;
  const ts = document.createElement('span');
  ts.className = 'ts';
  ts.textContent = `[${formatTimeStamp()}]`;
  li.appendChild(ts);
  li.appendChild(document.createTextNode(' ' + text));
  list.insertBefore(li, list.firstChild);
  // Limita a 14 entradas
  while (list.children.length > 14) list.removeChild(list.lastChild);
}

function formatTimeStamp() {
  const m = Math.floor(State.elapsed / 60);
  const s = State.elapsed % 60;
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}


/* ===========================================================
 * §9  EVENT HANDLERS
 * ========================================================== */

function onBoardClick(e) {
  if (State.isGameOver) return;
  const target = e.target.closest('.cell');
  if (!target) return;
  const r = +target.dataset.r, c = +target.dataset.c;
  handleReveal(r, c);
}

function onBoardContextMenu(e) {
  e.preventDefault();
  if (State.isGameOver) return;
  const target = e.target.closest('.cell');
  if (!target) return;
  const r = +target.dataset.r, c = +target.dataset.c;
  handleFlag(r, c);
}

function handleReveal(r, c) {
  const cell = State.grid[r][c];
  if (cell.revealed || cell.flagged) return;

  // No primeiro clique, garantimos célula segura e geramos as minas
  if (State.firstClick) {
    placeMines(State.grid, State.rows, State.cols, State.totalMines, r, c);
    State.firstClick = false;
    startTimer();
    addOpsLog('Operação iniciada. Setor inicial seguro.', 'success');
  }

  const hit = revealCell(r, c);
  if (hit) return triggerDefeat(r, c);

  updateStreak();
  if (checkVictory()) triggerVictory();
}

function handleFlag(r, c) {
  const cell = State.grid[r][c];
  if (cell.revealed) return;
  cell.flagged = !cell.flagged;
  cell.el.classList.toggle('flagged', cell.flagged);
  State.flagsPlaced += cell.flagged ? 1 : -1;
  updateMines();
  if (cell.flagged) {
    SFX.flag();
    addOpsLog(rand(OPS_MESSAGES.flag), 'warn');
  } else {
    SFX.unflag();
    addOpsLog(rand(OPS_MESSAGES.flagRemoved));
  }
}

function onKeyDown(e) {
  if (e.key === 'r' || e.key === 'R') {
    if (!$('#game-area').hidden) restartGame();
  }
  if (e.key === 'Escape') {
    if (!$('#screen-defeat').hidden) hide('#screen-defeat');
    if (!$('#screen-victory').hidden) hide('#screen-victory');
  }
}

function onResize() {
  if (!$('#game-area').hidden) sizeBoard();
}


/* ===========================================================
 * §10  SCREEN FLOW
 * ========================================================== */

function show(sel) { const el = $(sel); if (el) el.hidden = false; }
function hide(sel) { const el = $(sel); if (el) el.hidden = true; }

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function startGame(diffKey) {
  const cfg = DIFFICULTIES[diffKey];
  if (!cfg) return;

  // Reset state
  State.difficulty = diffKey;
  State.rows = cfg.rows;
  State.cols = cfg.cols;
  State.totalMines = cfg.mines;
  State.grid = makeEmptyGrid(cfg.rows, cfg.cols);
  State.firstClick = true;
  State.isGameOver = false;
  State.isVictory = false;
  State.score = 0;
  State.streak = 0;
  State.flagsPlaced = 0;
  State.revealedCount = 0;
  State.elapsed = 0;
  State.lastTarget = null;
  stopTimer();

  // UI
  hide('#screen-start');
  hide('#screen-victory');
  hide('#screen-defeat');
  $('#hud').hidden = false;
  $('#game-area').hidden = false;
  $('#hud-diff-label').textContent = cfg.label;
  addScore(0);
  updateStreak();
  updateMines();
  updateTime();
  updateBestScore();
  $('#ops-log-list').innerHTML = '';
  addOpsLog(rand(OPS_MESSAGES.start));

  buildBoard();
}

function restartGame() {
  if (!State.difficulty) return;
  startGame(State.difficulty);
}

function backToMenu() {
  stopTimer();
  hide('#hud');
  hide('#game-area');
  hide('#screen-victory');
  hide('#screen-defeat');
  show('#screen-start');
  // Reset seleção
  $$('.diff-card').forEach(c => c.classList.remove('selected'));
  $('#btn-start').disabled = true;
  $('#btn-start .btn-launch-label').textContent = 'SELECIONE UMA MISSÃO';
}

function triggerDefeat(r, c) {
  State.isGameOver = true;
  stopTimer();
  const cell = State.grid[r][c];
  const target = cell.target || TARGETS[0];
  State.lastTarget = target;

  // Efeitos imediatos
  SFX.explosion();
  screenShake();
  flashRed();
  revealAllMines();
  addOpsLog(rand(OPS_MESSAGES.defeat), 'danger');
  addOpsLog(target.line, 'danger');

  // Aplica penalidades por marcações erradas (se houver)
  let wrongFlags = 0;
  for (let rr = 0; rr < State.rows; rr++) {
    for (let cc = 0; cc < State.cols; cc++) {
      const x = State.grid[rr][cc];
      if (x.flagged && !x.mine) wrongFlags++;
    }
  }
  if (wrongFlags > 0) addScore(wrongFlags * POINTS.wrongFlag);

  // Modal de derrota — mostrado após o flash.
  // IMPORTANTE: torna o overlay visível ANTES de disparar a animação,
  // senão a animação roda enquanto display: none e nunca aparece.
  setTimeout(() => {
    $('#defeat-title').textContent = DEFEAT_TITLES[target.id] || 'MINA DIPLOMÁTICA ATIVADA';
    $('#defeat-desc').textContent = DEFEAT_DESCS[target.id] || '';
    $('#defeat-revealed').textContent = State.revealedCount.toLocaleString('pt-BR');
    $('#defeat-score').textContent = State.score.toLocaleString('pt-BR');
    $('#defeat-time').textContent = formatTimeStamp();
    show('#screen-defeat');
    requestAnimationFrame(() => requestAnimationFrame(() => showBoomScene(target)));
  }, 700);
}

function triggerVictory() {
  State.isGameOver = true;
  State.isVictory = true;
  stopTimer();

  const cfg = DIFFICULTIES[State.difficulty];

  // Bônus de vitória
  addScore(POINTS.victoryBase * cfg.multiplier);

  // Bônus por minas marcadas corretamente
  let correctFlags = 0;
  for (let r = 0; r < State.rows; r++) {
    for (let c = 0; c < State.cols; c++) {
      const x = State.grid[r][c];
      if (x.flagged && x.mine) correctFlags++;
    }
  }
  if (correctFlags > 0) addScore(correctFlags * POINTS.flagCorrect);

  // Bônus por tempo (até 300s = 5min)
  if (State.elapsed < 300) {
    addScore((300 - State.elapsed) * POINTS.timeBonus);
  }

  SFX.victory();
  addOpsLog(rand(OPS_MESSAGES.victory), 'success');

  const isNewRecord = saveBestScore(State.difficulty, State.score);

  setTimeout(() => {
    $('#victory-score').textContent = State.score.toLocaleString('pt-BR');
    $('#victory-time').textContent = formatTimeStamp();
    $('#victory-streak').textContent = String(State.streak);
    $('#screen-victory .victory-desc').textContent = rand(VICTORY_DESCS) +
      (isNewRecord ? ' ★ NOVO RECORDE PESSOAL ★' : '');
    show('#screen-victory');
    updateBestScore();
  }, 500);
}


/* ===========================================================
 * §11  INIT
 * ========================================================== */

function init() {
  // Cards de dificuldade
  let selectedDiff = null;
  $$('.diff-card').forEach(card => {
    card.addEventListener('click', () => {
      $$('.diff-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedDiff = card.dataset.difficulty;
      const cfg = DIFFICULTIES[selectedDiff];
      $('#btn-start').disabled = false;
      $('#btn-start .btn-launch-label').textContent = `INICIAR OPERAÇÃO — ${cfg.label}`;
    });
  });

  // Botão lançar operação
  $('#btn-start').addEventListener('click', () => {
    if (selectedDiff) startGame(selectedDiff);
  });

  // Tabuleiro
  $('#board').addEventListener('click', onBoardClick);
  $('#board').addEventListener('contextmenu', onBoardContextMenu);

  // HUD
  $('#btn-restart').addEventListener('click', restartGame);
  $('#btn-menu').addEventListener('click', backToMenu);

  // Modais
  $('#btn-victory-replay').addEventListener('click', restartGame);
  $('#btn-victory-menu').addEventListener('click', backToMenu);
  $('#btn-defeat-replay').addEventListener('click', restartGame);
  $('#btn-defeat-menu').addEventListener('click', backToMenu);

  // Tecla R reinicia
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('resize', onResize);

  // Fallback de imagens — se uma das fotos dos políticos falhar ao pré-carregar,
  // substituímos por um placeholder SVG para o efeito de explosão.
  preloadTargets();
}

function preloadTargets() {
  TARGETS.forEach(t => {
    const img = new Image();
    img.onerror = () => {
      console.warn(`[Estreito] Imagem ${t.src} não encontrada — usando placeholder.`);
      t.src = "data:image/svg+xml;utf8," + encodeURIComponent(
        `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'>
          <rect width='200' height='200' fill='%231a2940'/>
          <circle cx='100' cy='80' r='40' fill='%23ffb000'/>
          <rect x='50' y='130' width='100' height='60' rx='8' fill='%23ffb000'/>
          <text x='100' y='110' text-anchor='middle' font-family='Georgia' font-size='14' fill='%23061018' font-weight='bold'>${t.id.toUpperCase()}</text>
        </svg>`
      );
    };
    img.src = t.src;
  });
}

// Inicia quando o DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
