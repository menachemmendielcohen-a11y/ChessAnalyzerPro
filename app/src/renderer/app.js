// Chess Analyzer Pro - renderer (board, navigation, analysis loop, free analysis).
// Copyright (C) 2026 Chess Analyzer Pro contributors. Licensed under GPL-3.0-or-later.
import { Chess } from 'chess.js';
import { CLASSES, splitGames, readHeaders, loadGame, terminalEval, normalizeEval, classifyMove, summarize, evalText, phaseAccuracy, estimateRating, accuracyClass, openingName } from './analysis.js';
import { STRINGS, SYMBOLS } from './i18n.js';

const $ = (id) => document.getElementById(id);
const api = window.cap;
const ARROW_COLORS = ['var(--a1)', 'var(--a2)', 'var(--a3)'];

const state = {
  lang: localStorage.getItem('lang') === 'en' ? 'en' : 'he',
  game: null,
  ply: 0,
  evals: [],
  results: [],
  flipped: false,
  showArrows: true,
  showBadges: true,
  runId: 0,
  analyzed: 0,
  done: false,
  engine: 'starting',
  // Free analysis: moves the user plays on the board from game position `base`.
  vr: null, // { base, moves: [], evals: [], results: [], idx }
  sel: null, // { from, targets: Map<square, moves[]> }
  retry: null, // { k, color, shown } - "find a better move" exercise for game move k
  auto: null, // autoplay timer
  sound: localStorage.getItem('sound') !== 'off',
};
const KEY = new Set(['brilliant', 'great', 'miss', 'mistake', 'blunder']);
const BAD = new Set(['inaccuracy', 'mistake', 'blunder', 'miss']);
let lineToken = 0; // cancels a running "show follow-up"

/* ---------- sounds (generated, no audio files) ---------- */
let audioCtx = null;
function playSound(move) {
  if (!state.sound || !move) return;
  try {
    audioCtx = audioCtx || new AudioContext();
    const ctx = audioCtx;
    const now = ctx.currentTime;
    const tone = (freq, start, dur, vol, type = 'triangle') => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, now + start);
      o.frequency.exponentialRampToValueAtTime(freq * 0.55, now + start + dur);
      g.gain.setValueAtTime(vol, now + start);
      g.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
      o.connect(g).connect(ctx.destination);
      o.start(now + start);
      o.stop(now + start + dur + 0.02);
    };
    if (/#/.test(move.san)) {
      tone(660, 0, 0.12, 0.25);
      tone(880, 0.12, 0.25, 0.25);
    } else if (/\+/.test(move.san)) {
      tone(740, 0, 0.09, 0.2);
      tone(520, 0.07, 0.12, 0.2);
    } else if (move.captured) {
      tone(240, 0, 0.11, 0.35, 'square');
      tone(160, 0.03, 0.1, 0.25);
    } else tone(340, 0, 0.08, 0.3);
  } catch (_) {
    /* audio not available */
  }
}
function playTone(ok) {
  if (!state.sound) return;
  try {
    audioCtx = audioCtx || new AudioContext();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    const t = audioCtx.currentTime;
    o.frequency.setValueAtTime(ok ? 520 : 300, t);
    o.frequency.linearRampToValueAtTime(ok ? 880 : 200, t + 0.2);
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(g).connect(audioCtx.destination);
    o.start(t);
    o.stop(t + 0.32);
  } catch (_) {
    /* audio not available */
  }
}

let toastTimer;
function toast(text, kind) {
  const el = $('toast');
  el.textContent = text;
  el.className = 'toast ' + (kind || '');
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 2200);
}

const T = () => STRINGS[state.lang];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ico = (cls, extra = '') => `<span class="ico k-${cls} ${extra}">${SYMBOLS[cls]}</span>`;
const inVar = () => !!state.vr && state.vr.idx > 0;

// What is shown on the board right now: a game position or a free-analysis position.
function view() {
  if (inVar()) {
    const v = state.vr;
    const m = v.moves[v.idx - 1];
    return { fen: m.fenAfter, last: m, ev: v.evals[v.idx] || null, res: v.results[v.idx - 1] || null, plyNo: v.base + v.idx };
  }
  const g = state.game;
  return { fen: g.fens[state.ply], last: state.ply > 0 ? g.moves[state.ply - 1] : null, ev: state.evals[state.ply], res: state.ply > 0 ? state.results[state.ply - 1] : null, plyNo: state.ply };
}

/* ---------- engine (shared by the game analysis and free analysis) ---------- */
let evalCache = new Map(); // fen -> Promise<eval|null>

function analyzeFen(fen) {
  if (evalCache.has(fen)) return evalCache.get(fen);
  const depth = parseInt($('depthSel').value, 10) || 16;
  const p = (async () => {
    const term = terminalEval(fen);
    if (term) return term;
    for (let attempt = 0; attempt < 3; attempt++) {
      const raw = await api.analyze(fen, depth, 3);
      const ev = normalizeEval(fen, raw);
      if (ev) return ev;
      if (!raw.aborted) break;
    }
    return { terminal: false, score: { cp: 0 }, wp: 50, lines: [] };
  })();
  evalCache.set(fen, p);
  p.catch(() => evalCache.delete(fen));
  return p;
}

/* ---------- language ---------- */
function applyLang() {
  const t = T();
  document.documentElement.lang = state.lang;
  document.documentElement.dir = t.dir;
  document.querySelectorAll('[data-t]').forEach((el) => (el.textContent = t[el.dataset.t]));
  document.querySelectorAll('[data-title]').forEach((el) => (el.title = t[el.dataset.title]));
  $('langBtn').textContent = state.lang === 'he' ? 'English' : 'עברית';
  document.querySelector('.side').dir = t.dir;
  $('varBar').dir = t.dir;
  renderEngineStatus();
  if (state.game) renderAll();
}

function renderEngineStatus() {
  const t = T();
  const el = $('engineStatus');
  el.classList.toggle('ok', state.engine === 'ok');
  el.classList.toggle('bad', state.engine === 'bad');
  $('engineText').textContent =
    state.engine === 'ok' ? `${t.engineReady} · ${state.engineName}` : state.engine === 'bad' ? t.engineError : t.engineStarting;
}

/* ---------- loading ---------- */
function showError(key) {
  const t = T();
  const el = $('welcomeError');
  el.textContent = t[key] || t.errBadPgn;
  el.hidden = false;
  if (state.game) openModal(`<p>${esc(el.textContent)}</p>`);
}

function handleFile(file) {
  if (!file) return;
  if (file.error || typeof file.text !== 'string') return showError('errRead');
  const games = splitGames(file.text);
  if (!games.length) return showError('errBadPgn');
  if (games.length === 1) return startGame(games[0]);
  const t = T();
  const items = games
    .slice(0, 200)
    .map((g, i) => {
      const h = readHeaders(g);
      return `<button class="btn" data-game="${i}">${esc(h.White || '?')} – ${esc(h.Black || '?')} <small>${esc(h.Date || '')} · ${esc(h.Result || '*')} · ${esc(h.Event || '')}</small></button>`;
    })
    .join('');
  openModal(`<h3>${esc(t.pickGame)}</h3><div class="game-pick">${items}</div>`);
  $('modalBody').querySelectorAll('[data-game]').forEach((b) =>
    b.addEventListener('click', () => {
      closeModal();
      startGame(games[+b.dataset.game]);
    })
  );
}

function resetAnalysis() {
  stopAuto();
  lineToken++;
  state.retry = null;
  state.runId++;
  api.stop();
  evalCache = new Map();
  state.evals = new Array(state.game.fens.length).fill(null);
  state.results = new Array(state.game.moves.length).fill(null);
  state.analyzed = 0;
  state.done = false;
  state.vr = null;
  state.sel = null;
}

function startGame(pgn) {
  let game;
  try {
    game = loadGame(pgn);
  } catch (err) {
    return showError(err.message);
  }
  state.game = game;
  state.ply = 0;
  // Show the board from the side of the player who downloaded the game (set by the extension).
  state.flipped = /^b/i.test(game.headers.Orientation || '');
  marks.clear();
  resetAnalysis();
  $('welcomeError').hidden = true;
  $('welcome').hidden = true;
  $('workspace').hidden = false;
  $('openBtn').hidden = false;
  buildMoveList();
  renderAll();
  runAnalysis();
}

/* ---------- game analysis ---------- */
async function runAnalysis() {
  const id = state.runId;
  const game = state.game;
  for (let i = 0; i < game.fens.length; i++) {
    let ev;
    try {
      ev = await analyzeFen(game.fens[i]);
    } catch (_) {
      if (id !== state.runId) return;
      state.engine = 'bad';
      renderEngineStatus();
      return;
    }
    if (id !== state.runId) return;
    state.evals[i] = ev;
    if (i > 0) state.results[i - 1] = classifyMove(game, i - 1, state.evals, state.results);
    state.analyzed = i + 1;
    updateMoveIcon(i - 1);
    renderProgress();
    renderSummary();
    if (!inVar() && Math.abs(i - state.ply) <= 1) renderPosition();
    if (state.vr && i === state.vr.base) analyzeVariation();
  }
  state.done = true;
  renderAll();
}

/* ---------- free analysis ---------- */
async function analyzeVariation() {
  const v = state.vr;
  if (!v) return;
  const id = state.runId;
  try {
    if (!v.evals[0]) {
      v.evals[0] = await analyzeFen(state.game.fens[v.base]);
      if (state.vr !== v || id !== state.runId) return;
    }
    const vgame = { moves: v.moves };
    for (let i = 1; i <= v.moves.length; i++) {
      if (state.vr !== v || id !== state.runId) return;
      if (!v.evals[i]) {
        const fen = v.moves[i - 1].fenAfter;
        const ev = await analyzeFen(fen);
        if (state.vr !== v || id !== state.runId) return;
        if (!v.moves[i - 1] || v.moves[i - 1].fenAfter !== fen) return; // line changed meanwhile
        v.evals[i] = ev;
      }
      if (!v.results[i - 1]) v.results[i - 1] = classifyMove(vgame, i - 1, v.evals, v.results);
      if (v.idx >= i - 1 && v.idx <= i + 1) renderPosition();
      else renderVarBar();
    }
  } catch (_) {
    /* engine unavailable - the status line already says so */
  }
}

function playMove(m) {
  if (state.retry) return checkRetry(m);
  playSound(m);
  const g = state.game;
  const uci = m.from + m.to + (m.promotion || '');
  state.sel = null;
  const mv = {
    san: m.san, uci, from: m.from, to: m.to, color: m.color, piece: m.piece,
    captured: m.captured || null, promotion: m.promotion || null, fenBefore: m.before, fenAfter: m.after,
  };
  if (!inVar()) {
    // Same move as in the game: just step forward.
    if (state.ply < g.moves.length && g.moves[state.ply].uci === uci) {
      state.vr = null;
      return go(state.ply + 1);
    }
    state.vr = { base: state.ply, moves: [], evals: [state.evals[state.ply] || null], results: [], idx: 0 };
  }
  const v = state.vr;
  if (v.idx < v.moves.length && v.moves[v.idx].uci === uci) {
    v.idx++;
    return renderPosition();
  }
  v.moves.length = v.idx;
  v.evals.length = v.idx + 1;
  v.results.length = v.idx;
  v.moves.push(mv);
  v.idx++;
  renderPosition();
  analyzeVariation();
}

function startRetry() {
  const k = state.ply - 1;
  if (k < 0 || !state.evals[k] || !state.results[k]) return;
  stopAuto();
  lineToken++;
  state.vr = null;
  state.sel = null;
  state.ply = k;
  state.retry = { k, color: state.game.moves[k].color, shown: false };
  renderPosition();
}

function checkRetry(m) {
  const r = state.retry;
  const ev = state.evals[r.k];
  const uci = m.from + m.to + (m.promotion || '');
  const mine = (wp) => (r.color === 'w' ? wp : 100 - wp);
  const line = ev.lines.find((l) => l.uci === uci);
  const played = state.game.moves[r.k].uci;
  const ok = uci !== played && !!line && mine(ev.lines[0].wp) - mine(line.wp) < 5;
  state.sel = null;
  if (!ok) {
    playTone(false);
    toast(T().retryBad.replace('{san}', m.san), 'bad');
    renderBoard();
    return;
  }
  playTone(true);
  toast(T().retryOk.replace('{san}', m.san), 'ok');
  state.retry = null;
  playMove(m);
}

function cancelRetry() {
  if (!state.retry) return;
  const k = state.retry.k;
  state.retry = null;
  state.ply = k + 1;
}

// Plays the engine's best line from the shown position, one move at a time.
async function showLine() {
  const ev = view().ev;
  if (!ev || !ev.lines.length || !ev.lines[0].pv) return;
  stopAuto();
  const token = ++lineToken;
  const pv = ev.lines[0].pv.slice(0, 8);
  for (const uci of pv) {
    if (token !== lineToken) return;
    let m;
    try {
      m = new Chess(view().fen).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    } catch (_) {
      return;
    }
    playMove(m);
    await new Promise((res) => setTimeout(res, 750));
  }
}

function stopAuto() {
  if (state.auto) clearInterval(state.auto);
  state.auto = null;
  $('autoBtn').classList.remove('on');
  $('autoBtn').textContent = '⏵';
}

function toggleAuto() {
  if (state.auto) return stopAuto();
  if (!state.game) return;
  cancelRetry();
  $('autoBtn').classList.add('on');
  $('autoBtn').textContent = '⏸';
  const tick = () => {
    const atEnd = inVar() ? state.vr.idx >= state.vr.moves.length : state.ply >= state.game.moves.length;
    if (atEnd) return stopAuto();
    step(1, true);
  };
  tick();
  state.auto = setInterval(tick, 1300);
}

function exitVariation() {
  state.vr = null;
  state.sel = null;
}

/* ---------- board ---------- */
function sqXY(sq) {
  let x = sq.charCodeAt(0) - 97;
  let y = 8 - parseInt(sq[1], 10);
  if (state.flipped) {
    x = 7 - x;
    y = 7 - y;
  }
  return [x, y];
}

function squareAt(clientX, clientY) {
  const r = $('board').getBoundingClientRect();
  const vx = Math.floor(((clientX - r.left) / r.width) * 8);
  const vy = Math.floor(((clientY - r.top) / r.height) * 8);
  if (vx < 0 || vx > 7 || vy < 0 || vy > 7) return null;
  const x = state.flipped ? 7 - vx : vx;
  const y = state.flipped ? 7 - vy : vy;
  return 'abcdefgh'[x] + (8 - y);
}

function renderBoard() {
  const vw = view();
  const rows = vw.fen.split(' ')[0].split('/');
  const turn = vw.fen.split(' ')[1];
  const grid = [];
  for (const r of rows) {
    const row = [];
    for (const ch of r) {
      if (/\d/.test(ch)) for (let i = 0; i < +ch; i++) row.push(null);
      else row.push(ch);
    }
    grid.push(row);
  }
  const last = vw.last;
  const sel = state.sel;
  let html = '';
  for (let vy = 0; vy < 8; vy++) {
    for (let vx = 0; vx < 8; vx++) {
      const x = state.flipped ? 7 - vx : vx;
      const y = state.flipped ? 7 - vy : vy;
      const name = 'abcdefgh'[x] + (8 - y);
      const p = grid[y][x];
      const color = p ? (p === p.toUpperCase() ? 'w' : 'b') : null;
      const img = p ? `background-image:url(pieces/${color}${p.toUpperCase()}.svg)` : '';
      let cls = (x + y) % 2 ? 'dark' : 'light';
      if (last && (last.from === name || last.to === name)) cls += ' last';
      if (color === turn) cls += ' mine';
      if (sel && sel.from === name) cls += ' sel';
      if (sel && sel.targets.has(name)) cls += p ? ' cap' : ' dot';
      if (sel && sel.lifted && sel.from === name) cls += ' lifted';
      let coords = '';
      if (vy === 7) coords += `<span class="coord file">${name[0]}</span>`;
      if (vx === 0) coords += `<span class="coord rank">${name[1]}</span>`;
      html += `<div class="sq ${cls}" data-sq="${name}" style="${img}">${coords}</div>`;
    }
  }
  $('board').innerHTML = html;
  document.querySelector('.board-wrap').classList.toggle('in-var', inVar());
  document.querySelector('.board-wrap').classList.toggle('in-retry', !!state.retry);
}

// SVG for one arrow on the 8x8 board. Knight jumps are drawn as an L, like on chess sites.
function arrowSvg(from, to, color, width, opacity, marker) {
  const [x1, y1] = sqXY(from);
  const [x2, y2] = sqXY(to);
  const dx = x2 - x1;
  const dy = y2 - y1;
  const knight = (Math.abs(dx) === 1 && Math.abs(dy) === 2) || (Math.abs(dx) === 2 && Math.abs(dy) === 1);
  const style = `fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity}" marker-end="url(#${marker})"`;
  if (knight) {
    // Go along the long side first, then turn.
    const cx = Math.abs(dy) === 2 ? x1 : x2;
    const cy = Math.abs(dy) === 2 ? y2 : y1;
    const lx = Math.sign(x2 - cx);
    const ly = Math.sign(y2 - cy);
    const sx = x1 + 0.5 + Math.sign(cx - x1) * 0.28;
    const sy = y1 + 0.5 + Math.sign(cy - y1) * 0.28;
    const ex = x2 + 0.5 - lx * 0.3;
    const ey = y2 + 0.5 - ly * 0.3;
    return `<path d="M${sx},${sy} L${cx + 0.5},${cy + 0.5} L${ex},${ey}" ${style}/>`;
  }
  const len = Math.hypot(dx, dy) || 1;
  const sx = x1 + 0.5 + (dx / len) * 0.28;
  const sy = y1 + 0.5 + (dy / len) * 0.28;
  const ex = x2 + 0.5 - (dx / len) * 0.3;
  const ey = y2 + 0.5 - (dy / len) * 0.3;
  return `<path d="M${sx},${sy} L${ex},${ey}" ${style}/>`;
}

const MARK_COLORS = { orange: '#f0a332', green: '#5fae3e', blue: '#3b82f6', red: '#e2453c' };
function markerDefs(colors) {
  return Object.entries(colors)
    .map(([id, c]) => `<marker id="${id}" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="3.2" markerHeight="3.2" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="${c}"/></marker>`)
    .join('');
}

function renderArrows() {
  let ev = view().ev;
  if (state.retry) ev = state.retry.shown && ev ? { lines: ev.lines.slice(0, 1) } : null;
  let svg = '';
  if (state.showArrows && ev && ev.lines.length) {
    svg += `<defs>${markerDefs({ ah0: 'var(--a1)', ah1: 'var(--a2)', ah2: 'var(--a3)' })}</defs>`;
    // Draw the weakest first so the best move stays on top.
    for (let i = Math.min(2, ev.lines.length - 1); i >= 0; i--) {
      const uci = ev.lines[i].uci;
      svg += arrowSvg(uci.slice(0, 2), uci.slice(2, 4), ARROW_COLORS[i], [0.2, 0.16, 0.13][i], [0.9, 0.8, 0.75][i], 'ah' + i);
    }
  }
  $('arrows').innerHTML = svg;
  renderMarks();
}

/* ---------- your own arrows and marked squares (right mouse button) ---------- */
// Kept per position: they come back when you return to the same position.
const marks = new Map(); // fen -> { arrows: Map<'e2e4', color>, squares: Map<'e4', color> }
let annot = null; // right-button drag in progress: { from, color, to }

function marksFor(fen, create) {
  const key = fen.split(' ').slice(0, 4).join(' ');
  if (!marks.has(key) && create) marks.set(key, { arrows: new Map(), squares: new Map() });
  return marks.get(key);
}

function markColor(e) {
  if (e.shiftKey) return 'green';
  if (e.ctrlKey) return 'blue';
  if (e.altKey) return 'red';
  return null; // default: orange arrows, red squares
}

function renderMarks() {
  const m = marksFor(view().fen, false);
  let svg = `<defs>${markerDefs(Object.fromEntries(Object.entries(MARK_COLORS).map(([k, c]) => ['mk-' + k, c])))}</defs>`;
  if (m) {
    for (const [sq, c] of m.squares) {
      const [x, y] = sqXY(sq);
      svg += `<rect x="${x}" y="${y}" width="1" height="1" fill="${MARK_COLORS[c]}" opacity=".55"/>`;
    }
    for (const [k, c] of m.arrows) svg += arrowSvg(k.slice(0, 2), k.slice(2, 4), MARK_COLORS[c], 0.18, 0.85, 'mk-' + c);
  }
  if (annot && annot.to && annot.to !== annot.from) {
    const c = annot.color || 'orange';
    svg += arrowSvg(annot.from, annot.to, MARK_COLORS[c], 0.18, 0.6, 'mk-' + c);
  }
  $('marks').innerHTML = svg;
}

function clearMarks() {
  const key = view().fen.split(' ').slice(0, 4).join(' ');
  if (marks.delete(key)) renderMarks();
}

function startAnnot(e) {
  const sq = squareAt(e.clientX, e.clientY);
  if (!sq) return;
  annot = { from: sq, to: sq, color: markColor(e) };
}

function moveAnnot(e) {
  const sq = squareAt(e.clientX, e.clientY);
  if (sq && sq !== annot.to) {
    annot.to = sq;
    renderMarks();
  }
}

function endAnnot(e) {
  const a = annot;
  annot = null;
  const to = squareAt(e.clientX, e.clientY) || a.to;
  const m = marksFor(view().fen, true);
  if (to === a.from) {
    const c = a.color || 'red';
    if (m.squares.get(to) === c) m.squares.delete(to);
    else m.squares.set(to, c);
  } else {
    const k = a.from + to;
    const c = a.color || 'orange';
    if (m.arrows.get(k) === c) m.arrows.delete(k);
    else m.arrows.set(k, c);
  }
  renderMarks();
}

function renderBadge() {
  const layer = $('badgeLayer');
  layer.innerHTML = '';
  const vw = view();
  if (!state.showBadges || !vw.last || !vw.res || state.retry) return;
  const r = vw.res;
  const [x, y] = sqXY(vw.last.to);
  const el = document.createElement('div');
  el.className = `board-badge k-${r.cls}`;
  el.textContent = SYMBOLS[r.cls];
  el.title = T().cls[r.cls];
  // Next to the piece: top-right corner of its square, kept inside the board.
  el.style.left = `${Math.min(97.4, (x + 0.9) * 12.5)}%`;
  el.style.top = `${Math.max(2.6, (y + 0.1) * 12.5)}%`;
  layer.appendChild(el);
}

function renderEvalBar() {
  const ev = view().ev;
  const bar = $('evalbar');
  bar.classList.toggle('flipped', state.flipped);
  const wp = ev ? ev.wp : 50;
  $('evalWhite').style.height = `${Math.max(3, Math.min(97, wp))}%`;
  const num = $('evalNum');
  num.textContent = ev ? evalText(ev.score).replace(/^[+-]/, '') : '';
  num.className = 'evalbar-num ' + (wp >= 50 ? 'w' : 'b');
}

function fmtClock(sec) {
  if (sec == null) return '';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const ss = sec < 20 ? s.toFixed(1).padStart(4, '0') : String(Math.floor(s)).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

// Clock of a player in the shown game position (the last value at or before it).
function clockAt(color) {
  const g = state.game;
  if (!g.hasClocks) return null;
  for (let i = state.ply - 1; i >= 0; i--) if (g.moves[i].color === color && g.moves[i].clock != null) return g.moves[i].clock;
  return g.startClock;
}

function renderClocks() {
  if (!state.game) return;
  for (const [id, c] of [['clockTop', state.flipped ? 'w' : 'b'], ['clockBottom', state.flipped ? 'b' : 'w']]) {
    const el = $(id);
    if (!el) continue;
    const v = clockAt(c);
    el.textContent = fmtClock(v);
    el.hidden = v == null;
    const turn = state.game.fens[state.ply].split(' ')[1];
    el.classList.toggle('run', turn === c && state.ply < state.game.moves.length);
  }
}

function renderPlayers() {
  const h = state.game.headers;
  const t = T();
  const row = (c) => {
    const name = c === 'w' ? h.White : h.Black;
    const elo = c === 'w' ? h.WhiteElo : h.BlackElo;
    return `<span class="chip ${c}"></span><span>${esc(name || (c === 'w' ? t.white : t.black))}</span>${elo ? `<span class="elo">(${esc(elo)})</span>` : ''}`;
  };
  $('playerTop').innerHTML = row(state.flipped ? 'w' : 'b') + `<span class="res">${esc(state.game.result.replace(/1\/2/g, '½'))}</span><span class="clock" id="clockTop" hidden></span>`;
  $('playerBottom').innerHTML = row(state.flipped ? 'b' : 'w') + `<span class="clock" id="clockBottom" hidden></span>`;
  renderClocks();
  $('accWName').textContent = h.White || t.white;
  $('accBName').textContent = h.Black || t.black;
}

/* ---------- side panel ---------- */
function renderProgress() {
  const t = T();
  const total = state.game.fens.length;
  const pct = Math.round((state.analyzed / total) * 100);
  const done = state.analyzed >= total;
  $('progress').classList.toggle('done', done);
  $('progressText').textContent = done ? `✓ ${t.analysisDone}` : t.analyzing;
  $('progressPct').textContent = done ? '' : `${pct}%`;
  $('progressFill').style.width = `${pct}%`;
}

function renderSummary() {
  const t = T();
  const s = summarize(state.game, state.results);
  $('accW').textContent = s.w.accuracy == null ? '–' : s.w.accuracy.toFixed(1) + '%';
  $('accB').textContent = s.b.accuracy == null ? '–' : s.b.accuracy.toFixed(1) + '%';
  $('counts').innerHTML = CLASSES.map((c) => {
    const n = (v) => `<span class="n${v ? ` t-${c}` : ' zero'}">${v}</span>`;
    return `${n(s.w.counts[c])}<span class="lbl">${ico(c)}<span>${esc(t.cls[c])}</span></span>${n(s.b.counts[c])}`;
  }).join('');
  renderReviewExtra(s);
  renderGraph();
}

function renderReviewExtra(s) {
  const t = T();
  const g = state.game;
  const ph = phaseAccuracy(g, state.results);
  const op = openingName(g.headers);
  const eco = g.headers.ECO && g.headers.ECO !== '?' ? g.headers.ECO : '';
  let html = '';
  const det = gameDetails(g.headers);
  if (det) html += `<div class="rh">${esc(t.details)}</div><div class="rl" style="grid-column:1/-1">${esc(det)}</div>`;
  if (op || eco) html += `<div class="rh">${esc(t.openingLbl)}</div><div class="rl" style="grid-column:1/-1">${esc([eco, op].filter(Boolean).join(' · '))}</div>`;
  const rate = (side) => {
    const r = estimateRating(s[side].accuracy);
    return `<span class="rc"><span class="rate ${side}">${r == null ? '–' : r}</span></span>`;
  };
  html += `<div class="rh">${esc(t.estRating)}</div>${rate('w')}<span class="rl"></span>${rate('b')}<div class="note">${esc(t.estNote)}</div>`;
  html += `<div class="rh">${esc(t.phases)}</div>`;
  for (const p of ['opening', 'middlegame', 'endgame']) {
    const cell = (side) => {
      const a = ph[side][p];
      const c = accuracyClass(a);
      return `<span class="rc">${c ? `<span title="${a.toFixed(1)}%">${ico(c)}</span>` : '<span class="n zero">–</span>'}</span>`;
    };
    html += `${cell('w')}<span class="rl">${esc(t.ph[p])}</span>${cell('b')}`;
  }
  const keys = g.moves.filter((_m, i) => state.results[i] && KEY.has(state.results[i].cls)).length;
  html += `<div class="keynav"><button class="btn" data-key="-1" title="${esc(t.keyPrev)}">◀</button><span class="kc">${esc(t.keyMoments)}: ${keys}</span><button class="btn" data-key="1" title="${esc(t.keyNext)}">▶</button></div>`;
  $('reviewExtra').innerHTML = html;
}

function gameDetails(h) {
  const t = T();
  const parts = [];
  const d = /^(\d{4})\.(\d{2})\.(\d{2})/.exec(h.Date || h.UTCDate || '');
  if (d) parts.push(`${d[3]}.${d[2]}.${d[1]}`);
  const tc = /^(\d+)(?:\+(\d+(?:\.\d+)?))?$/.exec(h.TimeControl || '');
  if (tc) {
    const base = +tc[1];
    const inc = tc[2] ? +tc[2] : 0;
    const mins = base >= 60 ? `${+(base / 60).toFixed(1)} ${t.minutes}` : `${base} ${t.seconds}`;
    parts.push(inc ? `${mins} + ${inc}` : mins);
  } else if (/^1\/\d+$/.test(h.TimeControl || '')) parts.push(`${+h.TimeControl.split('/')[1] / 86400} ${t.daysPerMove}`);
  if (h.Termination) parts.push(h.Termination);
  return parts.join(' · ');
}

function jumpKey(dir) {
  const g = state.game;
  if (!g) return;
  const from = state.ply;
  const idx = [];
  g.moves.forEach((_m, i) => {
    if (state.results[i] && KEY.has(state.results[i].cls)) idx.push(i + 1);
  });
  const target = dir > 0 ? idx.find((p) => p > from) : [...idx].reverse().find((p) => p < from);
  if (target != null) go(target);
}

function renderGraph() {
  const n = state.game.fens.length;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const ev = state.evals[i];
    if (!ev) break;
    pts.push([(i / Math.max(1, n - 1)) * 100, 30 - (ev.wp / 100) * 30]);
  }
  let svg = '';
  if (pts.length > 1) {
    const d = pts.map((p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' L');
    const lastX = pts[pts.length - 1][0].toFixed(2);
    svg += `<path d="M0,30 L${d} L${lastX},30 Z" fill="#f1f1f1"/>`;
  }
  svg += `<line x1="0" y1="15" x2="100" y2="15" stroke="#888" stroke-width="0.25" stroke-dasharray="1 1"/>`;
  const cx = (state.ply / Math.max(1, n - 1)) * 100;
  svg += `<line x1="${cx}" y1="0" x2="${cx}" y2="30" stroke="var(--a2)" stroke-width="0.7"/>`;
  $('graph').innerHTML = svg;
}

function moveNum(plyNo, color) {
  return `${Math.ceil(plyNo / 2)}${color === 'w' ? '.' : '…'}`;
}

function renderQuality() {
  const t = T();
  const el = $('quality');
  const vw = view();
  if (state.retry) {
    const side = state.retry.color === 'w' ? t.white : t.black;
    el.innerHTML = `<div class="q-head">${ico('mistake')}<span>${esc(t.retryPrompt.replace('{side}', side))}</span></div><div class="q-text">${esc(t.retryHidden)}</div>` +
      `<div class="q-actions"><button class="btn" data-act="solution">💡 ${esc(t.showSolution)}</button><button class="btn" data-act="cancel">${esc(t.cancel)}</button></div>`;
    return;
  }
  if (!vw.last) {
    el.innerHTML = `<div class="q-head">${esc(t.startPos)}</div><div class="q-text">${esc(t.startPosText)}</div><div class="q-actions"><button class="btn start" data-act="start">▶ ${esc(t.startReview)}</button>${vw.ev && vw.ev.lines.length ? `<button class="btn" data-act="line">⤳ ${esc(t.showLine)}</button>` : ''}</div>`;
    return;
  }
  const m = vw.last;
  const r = vw.res;
  const num = moveNum(vw.plyNo, m.color);
  const tag = inVar() ? `<span class="t-great" style="font-size:12px">· ${esc(t.varTitle)}</span>` : '';
  if (!r) {
    el.innerHTML = `<div class="q-head"><span class="q-san">${num} ${esc(m.san)}</span>${tag}</div><div class="q-text">${esc(t.waiting)}</div>`;
    return;
  }
  const text = t.reason[r.reason].replace('{b}', Math.round(r.wpBefore)).replace('{a}', Math.round(r.wpAfter));
  const showBest = !r.isBest && r.bestSan && r.cls !== 'best';
  el.innerHTML =
    `<div class="q-head">${ico(r.cls)}<span class="q-san">${num} ${esc(m.san)}</span><span class="t-${r.cls}">${esc(t.cls[r.cls])}</span>${tag}</div>` +
    `<div class="q-text">${esc(text)}</div>` +
    (showBest ? `<div class="q-best">${esc(t.betterWas)}: <b>${esc(r.bestSan)}</b></div>` : '') +
    `<div class="q-actions">${!inVar() && BAD.has(r.cls) && state.evals[state.ply - 1] ? `<button class="btn retry" data-act="retry">↻ ${esc(t.retry)}</button>` : ''}${vw.ev && vw.ev.lines.length ? `<button class="btn" data-act="line">⤳ ${esc(t.showLine)}</button>` : ''}</div>`;
}

function renderLines() {
  const t = T();
  const ev = view().ev;
  const el = $('lines');
  if (state.retry) {
    el.innerHTML = `<div class="empty">${esc(t.retryHidden)}</div>`;
    return;
  }
  if (!ev) {
    el.innerHTML = `<div class="empty">${esc(t.analyzing)}</div>`;
    return;
  }
  if (!ev.lines.length) {
    el.innerHTML = `<div class="empty">${esc(t.gameOver)}${ev.score.text ? ' · ' + esc(ev.score.text) : ''}</div>`;
    return;
  }
  el.innerHTML = ev.lines
    .slice(0, 3)
    .map((l, i) => {
      const pos = l.wp >= 50;
      const rest = l.san.slice(1).join(' ');
      return `<div class="line"><span class="sw" style="background:${ARROW_COLORS[i]}"></span><span class="ev ${pos ? 'pos' : 'neg'}">${esc(evalText(l.score))}</span><span class="pv"><b>${esc(l.san[0])}</b> ${esc(rest)}</span></div>`;
    })
    .join('');
}

function renderVarBar() {
  const t = T();
  const bar = $('varBar');
  if (state.retry) {
    const side = state.retry.color === 'w' ? t.white : t.black;
    bar.innerHTML = `<span class="rt">↻ ${esc(t.retryPrompt.replace('{side}', side))}</span><button class="btn" data-act="solution">💡 ${esc(t.showSolution)}</button><button class="btn" data-act="cancel">${esc(t.cancel)}</button>`;
    return;
  }
  const v = state.vr;
  if (!v || !v.moves.length) {
    bar.innerHTML = `<p class="hint">♟ ${esc(t.varHint)}<br>🖱 ${esc(t.marksHint)}</p>`;
    return;
  }
  const chips = v.moves
    .map((m, i) => {
      const r = v.results[i];
      const icon = r ? ico(r.cls) : '<span class="ico pending"></span>';
      const num = i === 0 || m.color === 'w' ? moveNum(v.base + i + 1, m.color) + ' ' : '';
      return `<span class="vm${i + 1 === v.idx ? ' cur' : ''}" data-v="${i + 1}">${icon}${esc(num + m.san)}</span>`;
    })
    .join('');
  bar.innerHTML = `<span class="vt">${esc(t.varTitle)}:</span>${chips}<button class="btn" id="backBtn">↩ ${esc(t.backToGame)}</button>`;
}

function buildMoveList() {
  const moves = state.game.moves;
  let html = '';
  const startsBlack = moves[0].color === 'b';
  const firstNum = parseInt(state.game.fens[0].split(' ')[5], 10) || 1;
  let i = 0;
  let num = firstNum;
  if (startsBlack) {
    html += `<span class="num">${num}.</span><span></span>${mvHtml(0)}`;
    i = 1;
    num++;
  }
  for (; i < moves.length; i += 2, num++) {
    html += `<span class="num">${num}.</span>${mvHtml(i)}${i + 1 < moves.length ? mvHtml(i + 1) : '<span></span>'}`;
  }
  $('movelist').innerHTML = html;
}

function mvHtml(i) {
  const m = state.game.moves[i];
  const spent = m.spent != null ? `<span class="spent">${m.spent < 10 ? m.spent.toFixed(1) : Math.round(m.spent)}s</span>` : '';
  return `<span class="mv" data-i="${i}"><span class="ico pending" data-ico="${i}"></span><span>${esc(m.san)}</span>${spent}</span>`;
}

function updateMoveIcon(i) {
  if (i < 0) return;
  const r = state.results[i];
  const el = $('movelist').querySelector(`[data-ico="${i}"]`);
  if (!el || !r) return;
  el.className = `ico k-${r.cls}`;
  el.textContent = SYMBOLS[r.cls];
  el.title = T().cls[r.cls];
}

function renderMoveCursor() {
  const list = $('movelist');
  list.querySelectorAll('.mv.cur').forEach((e) => e.classList.remove('cur'));
  if (state.ply > 0) {
    const el = list.querySelector(`.mv[data-i="${state.ply - 1}"]`);
    if (el) {
      el.classList.add('cur');
      const top = el.offsetTop - list.offsetTop;
      if (top < list.scrollTop) list.scrollTop = top - 4;
      else if (top + el.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = top + el.offsetHeight - list.clientHeight + 4;
    }
  } else {
    list.scrollTop = 0;
  }
}

function renderPosition() {
  renderClocks();
  renderBoard();
  renderArrows();
  renderBadge();
  renderEvalBar();
  renderQuality();
  renderLines();
  renderMoveCursor();
  renderGraph();
  renderVarBar();
}

function renderAll() {
  renderPlayers();
  renderProgress();
  renderSummary();
  state.game.moves.forEach((_m, i) => updateMoveIcon(i));
  renderPosition();
}

/* ---------- navigation ---------- */
function go(ply, keepAuto) {
  if (!state.game) return;
  if (!keepAuto) stopAuto();
  lineToken++;
  const hadRetry = !!state.retry;
  state.retry = null;
  const p = Math.max(0, Math.min(state.game.moves.length, ply));
  const wasVar = !!state.vr;
  state.sel = null;
  state.vr = null;
  if (p === state.ply && !wasVar && !hadRetry) return;
  if (p === state.ply + 1 && !wasVar) playSound(state.game.moves[p - 1]);
  state.ply = p;
  renderPosition();
}

function step(d, keepAuto) {
  if (!state.game) return;
  if (!keepAuto) stopAuto();
  if (state.retry) {
    cancelRetry();
    if (d < 0) return renderPosition();
  }
  lineToken++;
  const v = state.vr;
  if (v && (v.idx > 0 || d > 0) && v.moves.length) {
    const idx = v.idx + d;
    if (idx <= 0) {
      state.vr = null;
      state.sel = null;
      return renderPosition();
    }
    if (idx > v.idx && idx <= v.moves.length) playSound(v.moves[idx - 1]);
    v.idx = Math.min(v.moves.length, idx);
    state.sel = null;
    return renderPosition();
  }
  go(state.ply + d, keepAuto);
}

function goVarIdx(idx) {
  if (!state.vr) return;
  state.vr.idx = Math.max(0, Math.min(state.vr.moves.length, idx));
  state.sel = null;
  renderPosition();
}

/* ---------- moving pieces on the board ---------- */
const PROMO = ['q', 'r', 'b', 'n'];

function legalFrom(sq) {
  const c = new Chess(view().fen);
  const p = c.get(sq);
  if (!p || p.color !== c.turn()) return null;
  const targets = new Map();
  for (const m of c.moves({ square: sq, verbose: true })) {
    if (!targets.has(m.to)) targets.set(m.to, []);
    targets.get(m.to).push(m);
  }
  return targets.size ? { from: sq, targets, color: p.color, type: p.type } : null;
}

function choosePromotion(color) {
  return new Promise((resolve) => {
    const t = T();
    openModal(
      `<h3>${esc(t.promote)}</h3><div class="promo">${PROMO.map((p) => `<button class="btn" data-p="${p}"><img src="pieces/${color}${p.toUpperCase()}.svg" alt="${p}"></button>`).join('')}</div>`
    );
    const done = (p) => {
      pendingPromo = null;
      closeModal();
      resolve(p);
    };
    $('modalBody').querySelectorAll('[data-p]').forEach((b) => b.addEventListener('click', () => done(b.dataset.p)));
    // Closing the dialog any other way cancels the move.
    pendingPromo = () => resolve(null);
  });
}
let pendingPromo = null;

async function tryMove(to) {
  const sel = state.sel;
  if (!sel || !sel.targets.has(to)) return false;
  const opts = sel.targets.get(to);
  let m = opts[0];
  if (opts.length > 1 || m.promotion) {
    const p = await choosePromotion(sel.color);
    if (!p) {
      state.sel = null;
      renderBoard();
      return true;
    }
    m = opts.find((o) => o.promotion === p) || opts[0];
  }
  playMove(m);
  return true;
}

let drag = null; // { from, el, moved, startX, startY }

function onBoardDown(e) {
  if (!state.game) return;
  if (e.button === 2) {
    e.preventDefault();
    startAnnot(e);
    return;
  }
  if (e.button !== 0) return;
  clearMarks();
  const sq = squareAt(e.clientX, e.clientY);
  if (!sq) return;
  e.preventDefault();
  if (state.sel && state.sel.targets.has(sq)) {
    tryMove(sq);
    return;
  }
  const sel = legalFrom(sq);
  if (!sel) {
    if (state.sel) {
      state.sel = null;
      renderBoard();
    }
    return;
  }
  const reselect = state.sel && state.sel.from === sq;
  state.sel = sel;
  const wrap = document.querySelector('.board-wrap');
  const r = wrap.getBoundingClientRect();
  const img = document.createElement('img');
  img.className = 'drag-piece';
  img.src = `pieces/${sel.color}${sel.type.toUpperCase()}.svg`;
  img.style.left = `${e.clientX - r.left}px`;
  img.style.top = `${e.clientY - r.top}px`;
  img.hidden = true;
  wrap.appendChild(img);
  drag = { from: sq, el: img, moved: false, startX: e.clientX, startY: e.clientY, reselect };
  renderBoard();
}

function onPointerMove(e) {
  if (annot) return moveAnnot(e);
  if (!drag) return;
  if (!drag.moved && Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) < 4) return;
  if (!drag.moved) {
    drag.moved = true;
    drag.el.hidden = false;
    if (state.sel) state.sel.lifted = true;
    renderBoard();
  }
  const r = document.querySelector('.board-wrap').getBoundingClientRect();
  drag.el.style.left = `${e.clientX - r.left}px`;
  drag.el.style.top = `${e.clientY - r.top}px`;
}

async function onPointerUp(e) {
  if (annot && e.button === 2) return endAnnot(e);
  if (!drag) return;
  const d = drag;
  drag = null;
  d.el.remove();
  if (state.sel) state.sel.lifted = false;
  if (!d.moved) {
    // A click on the already-selected piece deselects it; otherwise keep it selected.
    if (d.reselect) state.sel = null;
    renderBoard();
    return;
  }
  const to = squareAt(e.clientX, e.clientY);
  if (to && to !== d.from && (await tryMove(to))) return;
  state.sel = null;
  renderBoard();
}

/* ---------- modal ---------- */
function openModal(html) {
  $('modalBody').innerHTML = html;
  $('modal').hidden = false;
}
function closeModal() {
  $('modal').hidden = true;
  if (pendingPromo) {
    const p = pendingPromo;
    pendingPromo = null;
    p(null);
  }
}

/* ---------- events ---------- */
async function chooseFile() {
  handleFile(await api.chooseFile());
}

$('chooseBtn').addEventListener('click', chooseFile);
$('openBtn').addEventListener('click', chooseFile);
$('firstBtn').addEventListener('click', () => go(0));
$('prevBtn').addEventListener('click', () => step(-1));
$('nextBtn').addEventListener('click', () => step(1));
$('lastBtn').addEventListener('click', () => (inVar() ? goVarIdx(state.vr.moves.length) : go(state.game.moves.length)));
$('flipBtn').addEventListener('click', () => {
  state.flipped = !state.flipped;
  renderPlayers();
  renderPosition();
});
$('arrowsChk').addEventListener('change', (e) => {
  state.showArrows = e.target.checked;
  renderArrows();
});
$('badgesChk').addEventListener('change', (e) => {
  state.showBadges = e.target.checked;
  renderBadge();
});
$('movelist').addEventListener('click', (e) => {
  const el = e.target.closest('.mv');
  if (el) go(+el.dataset.i + 1);
});
$('varBar').addEventListener('click', (e) => {
  if (e.target.closest('#backBtn')) {
    state.vr = null;
    state.sel = null;
    return renderPosition();
  }
  if (e.target.closest('[data-act]')) return onAction(e.target.closest('[data-act]').dataset.act);
  const el = e.target.closest('.vm');
  if (el) goVarIdx(+el.dataset.v);
});
$('graph').addEventListener('click', (e) => {
  const r = $('graph').getBoundingClientRect();
  go(Math.round(((e.clientX - r.left) / r.width) * state.game.moves.length));
});
$('board').addEventListener('contextmenu', (e) => e.preventDefault());
$('board').addEventListener('pointerdown', (e) => {
  stopAuto();
  lineToken++;
  onBoardDown(e);
});
function onAction(act) {
  if (act === 'retry') startRetry();
  else if (act === 'line') showLine();
  else if (act === 'start') {
    const first = state.game.moves.findIndex((_m, i) => state.results[i] && KEY.has(state.results[i].cls));
    go(first >= 0 ? first + 1 : 1);
  } else if (act === 'cancel') {
    cancelRetry();
    renderPosition();
  } else if (act === 'solution' && state.retry) {
    state.retry.shown = true;
    const best = state.evals[state.retry.k].lines[0];
    toast(T().solutionIs.replace('{san}', best.san[0]), 'ok');
    renderArrows();
  }
}
$('quality').addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]');
  if (b) onAction(b.dataset.act);
});
$('reviewExtra').addEventListener('click', (e) => {
  const b = e.target.closest('[data-key]');
  if (b) jumpKey(+b.dataset.key);
});
$('autoBtn').addEventListener('click', toggleAuto);
$('soundChk').checked = state.sound;
$('soundChk').addEventListener('change', (e) => {
  state.sound = e.target.checked;
  localStorage.setItem('sound', state.sound ? 'on' : 'off');
});
window.addEventListener('pointermove', onPointerMove);
window.addEventListener('pointerup', onPointerUp);
$('langBtn').addEventListener('click', () => {
  state.lang = state.lang === 'he' ? 'en' : 'he';
  localStorage.setItem('lang', state.lang);
  applyLang();
});
$('aboutBtn').addEventListener('click', () => {
  const t = T();
  openModal(
    `<h3>Chess Analyzer Pro ${esc(state.version || '')}</h3><p>${esc(t.aboutText)}</p><p>${esc(t.aboutNote)}</p><p dir="ltr">Engine: ${esc(state.engineName || 'Stockfish')} · License: GPL-3.0-or-later</p>`
  );
});
$('modalClose').addEventListener('click', closeModal);
$('modal').addEventListener('click', (e) => {
  if (e.target === $('modal')) closeModal();
});
$('depthSel').addEventListener('change', () => {
  if (!state.game) return;
  // Re-run the analysis of the current game at the new depth.
  resetAnalysis();
  buildMoveList();
  renderAll();
  runAnalysis();
});

document.addEventListener('keydown', (e) => {
  if (!state.game || !$('modal').hidden) {
    if (e.key === 'Escape') closeModal();
    return;
  }
  if (e.target.tagName === 'SELECT') return;
  const k = e.key;
  if (k === 'ArrowLeft') step(-1);
  else if (k === 'ArrowRight') step(1);
  else if (k === 'Home' || k === 'ArrowUp') go(0);
  else if (k === 'End' || k === 'ArrowDown') go(state.game.moves.length);
  else if (k === 'Escape' && (state.vr || state.sel || state.retry)) {
    cancelRetry();
    state.vr = null;
    state.sel = null;
    renderPosition();
  } else if (k === ' ') toggleAuto(); else if (k === 'f' || k === 'F') $('flipBtn').click();
  else return;
  e.preventDefault();
});

// Drag & drop of a PGN file anywhere in the window.
const dz = $('dropZone');
window.addEventListener('dragover', (e) => {
  e.preventDefault();
  dz.classList.add('drag');
});
window.addEventListener('dragleave', () => dz.classList.remove('drag'));
window.addEventListener('drop', async (e) => {
  e.preventDefault();
  dz.classList.remove('drag');
  const f = e.dataTransfer.files && e.dataTransfer.files[0];
  if (!f) return;
  try {
    handleFile({ name: f.name, text: await f.text() });
  } catch (_) {
    showError('errRead');
  }
});

/* ---------- start ---------- */
applyLang();
api.onFileOpened(handleFile);
api.engineInfo().then((info) => {
  state.engine = info.ok ? 'ok' : 'bad';
  state.engineName = info.name;
  state.version = info.version;
  renderEngineStatus();
});
api.pendingFile().then(handleFile);
