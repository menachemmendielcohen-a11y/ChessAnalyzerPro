// Chess Analyzer Pro - PGN loading and move classification.
// Copyright (C) 2026 Chess Analyzer Pro contributors. Licensed under GPL-3.0-or-later.
import { Chess } from 'chess.js';

export const CLASSES = ['brilliant', 'great', 'best', 'good', 'inaccuracy', 'mistake', 'blunder', 'miss'];

const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };

// Win probability (0-100) for White from an engine score given from White's point of view.
export function winPct(score) {
  if (!score) return 50;
  if (score.mate != null) return score.mate > 0 ? 100 : 0;
  const cp = Math.max(-1000, Math.min(1000, score.cp || 0));
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
}

export function evalText(score) {
  if (!score) return '';
  if (score.text) return score.text;
  if (score.mate != null) return (score.mate > 0 ? '+' : '-') + 'M' + Math.abs(score.mate);
  const v = (score.cp || 0) / 100;
  return (v > 0 ? '+' : '') + v.toFixed(1);
}

// Split a PGN file that may contain several games.
export function splitGames(text) {
  const clean = text.replace(/\r\n?/g, '\n').trim();
  if (!clean) return [];
  const parts = clean.split(/\n(?=\[Event\s)/g).map((s) => s.trim()).filter(Boolean);
  return parts.length ? parts : [clean];
}

export function readHeaders(pgn) {
  const h = {};
  const re = /^\[(\w+)\s+"((?:[^"\\]|\\.)*)"\]\s*$/gm;
  let m;
  while ((m = re.exec(pgn))) h[m[1]] = m[2];
  return h;
}

// Load one game. Throws an Error whose message is an i18n key when the game cannot be used.
export function loadGame(pgn) {
  const headers = readHeaders(pgn);
  const chess = new Chess();
  try {
    chess.loadPgn(pgn);
  } catch (err) {
    throw new Error('errBadPgn');
  }
  const hist = chess.history({ verbose: true });
  if (!hist.length) throw new Error('errNoMoves');

  const result = headers.Result || '*';
  // Analysis is meant for finished games only - never for a game still being played.
  if (!/^(1-0|0-1|1\/2-1\/2)$/.test(result) && !chess.isGameOver()) throw new Error('errUnfinished');

  const moves = hist.map((m) => ({
    san: m.san,
    uci: m.from + m.to + (m.promotion || ''),
    from: m.from,
    to: m.to,
    color: m.color,
    piece: m.piece,
    captured: m.captured || null,
    promotion: m.promotion || null,
    fenBefore: m.before,
    fenAfter: m.after,
  }));
  const fens = [moves[0].fenBefore, ...moves.map((m) => m.fenAfter)];

  // Clock times from {[%clk h:mm:ss]} comments, and the time spent on each move.
  const clk = new Map();
  for (const c of chess.getComments ? chess.getComments() : []) {
    const m = /\[%clk\s+(\d+):(\d+):(\d+(?:\.\d+)?)\]/.exec(c.comment || '');
    if (m) clk.set(c.fen, +m[1] * 3600 + +m[2] * 60 + +m[3]);
  }
  const tc = /^(\d+)(?:\+(\d+(?:\.\d+)?))?$/.exec(headers.TimeControl || '');
  const startClock = tc ? +tc[1] : null;
  const inc = tc && tc[2] ? +tc[2] : 0;
  const last = { w: startClock, b: startClock };
  moves.forEach((m) => {
    const v = clk.get(m.fenAfter);
    m.clock = v == null ? null : v;
    if (v != null && last[m.color] != null) m.spent = Math.max(0, last[m.color] - v + inc);
    if (v != null) last[m.color] = v;
  });
  const hasClocks = moves.some((m) => m.clock != null);
  return { headers, moves, fens, result, hasClocks, startClock };
}

// Evaluation for a position where the game is over (no engine needed). Returns null otherwise.
export function terminalEval(fen) {
  const c = new Chess(fen);
  if (c.isCheckmate()) {
    const whiteWon = c.turn() === 'b';
    return { terminal: true, score: { mate: whiteWon ? 1 : -1, text: whiteWon ? '1-0' : '0-1' }, wp: whiteWon ? 100 : 0, lines: [] };
  }
  if (c.isDraw() || c.isStalemate()) {
    return { terminal: true, score: { cp: 0, text: '½-½' }, wp: 50, lines: [] };
  }
  return null;
}

function pvToSan(fen, pv, max = 8) {
  const c = new Chess(fen);
  const out = [];
  for (const uci of pv.slice(0, max)) {
    try {
      const m = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
      out.push(m.san);
    } catch (_) {
      break;
    }
  }
  return out;
}

// Convert raw engine output (side-to-move scores) into White-relative evaluation.
export function normalizeEval(fen, raw) {
  const sign = fen.split(' ')[1] === 'w' ? 1 : -1;
  const lines = (raw.lines || [])
    .filter((l) => l.pv && l.pv.length)
    .map((l) => {
      const score = l.mate != null ? { mate: l.mate * sign } : { cp: (l.cp || 0) * sign };
      // "mate 0" never appears with a pv; a positive side-to-move mate means that side wins.
      const san = pvToSan(fen, l.pv);
      return { uci: l.pv[0], pv: l.pv.slice(0, 12), score, wp: winPct(score), san, depth: l.depth };
    })
    .filter((l) => l.san.length);
  if (!lines.length) return null;
  return { terminal: false, score: lines[0].score, wp: lines[0].wp, lines };
}

// Did the mover leave real material hanging on the destination square?
function isSacrifice(move) {
  const moved = VAL[move.promotion || move.piece];
  if (moved < 3 || move.piece === 'k') return false;
  const captured = move.captured ? VAL[move.captured] : 0;
  let c;
  try {
    c = new Chess(move.fenAfter);
  } catch (_) {
    return false;
  }
  const caps = c.moves({ verbose: true }).filter((m) => m.to === move.to);
  if (!caps.length) return false;
  const minAtt = Math.min(...caps.map((m) => VAL[m.piece]));
  let defended = false;
  try {
    defended = c.attackers(move.to, move.color).length > 0;
  } catch (_) {
    defended = false;
  }
  if (!defended) return moved - captured >= 2;
  return moved - captured - (minAtt >= 100 ? 0 : minAtt) >= 2;
}

// Classify move k (played from position k, reaching position k+1).
export function classifyMove(game, k, evals, prevResults) {
  const move = game.moves[k];
  const before = evals[k];
  const after = evals[k + 1];
  if (!before || !after) return null;

  const mine = (wp) => (move.color === 'w' ? wp : 100 - wp);
  const best = before.lines[0] || null;
  const second = before.lines[1] || null;
  const wpBefore = mine(before.wp);
  const wpAfter = mine(after.wp);
  const isBest = !!best && best.uci === move.uci;
  const loss = isBest ? 0 : Math.max(0, wpBefore - wpAfter);
  const prev = k > 0 ? prevResults[k - 1] : null;
  const recapture = k > 0 && !!move.captured && !!game.moves[k - 1].captured && game.moves[k - 1].to === move.to;

  const res = {
    cls: 'good',
    loss,
    wpBefore,
    wpAfter,
    isBest,
    bestSan: best ? best.san[0] : null,
    bestUci: best ? best.uci : null,
    reason: 'good',
    accuracy: isBest ? 100 : Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * loss) - 3.1669)),
  };

  if (isBest || (loss < 0.4 && before.lines.some((l) => l.uci === move.uci))) {
    res.cls = 'best';
    res.reason = 'best';
    const gap = second ? wpBefore - mine(second.wp) : 0;
    const matesNow = !!best && best.score.mate != null && (move.color === 'w' ? best.score.mate > 0 : best.score.mate < 0);
    const secondWp = second ? mine(second.wp) : 0;
    if (!recapture && wpAfter >= 45 && (wpBefore <= 97 || matesNow) && isSacrifice(move)) {
      res.cls = 'brilliant';
      res.reason = 'brilliant';
    } else if (!recapture && second && gap >= 15 && secondWp < 75 && wpAfter >= 25) {
      res.cls = 'great';
      res.reason = wpAfter >= 60 ? 'greatWin' : 'greatHold';
    }
    return res;
  }

  if (loss < 5) return res;

  const bestMates = best && best.score.mate != null && (move.color === 'w' ? best.score.mate > 0 : best.score.mate < 0);
  const afterMates = after.score.mate != null && (move.color === 'w' ? after.score.mate > 0 : after.score.mate < 0);
  const opponentErred = !!prev && (prev.cls === 'mistake' || prev.cls === 'blunder' || prev.cls === 'miss' || prev.loss >= 10);

  if (bestMates && !afterMates && wpAfter >= 50 && loss >= 5) {
    res.cls = 'miss';
    res.reason = 'missMate';
  } else if (opponentErred && loss >= 10 && wpBefore >= 55 && wpAfter >= 40) {
    res.cls = 'miss';
    res.reason = 'miss';
  } else if (loss < 10) {
    res.cls = 'inaccuracy';
    res.reason = 'inaccuracy';
  } else if (loss < 20) {
    res.cls = 'mistake';
    res.reason = 'mistake';
  } else {
    res.cls = 'blunder';
    res.reason = afterMates === false && after.score.mate != null ? 'blunderMate' : 'blunder';
  }
  return res;
}

// Accuracy and per-class counts for both players.
export function summarize(game, results) {
  const out = { w: { counts: {}, accuracy: null }, b: { counts: {}, accuracy: null } };
  for (const side of ['w', 'b']) {
    CLASSES.forEach((c) => (out[side].counts[c] = 0));
    const accs = [];
    game.moves.forEach((m, i) => {
      const r = results[i];
      if (m.color !== side || !r) return;
      out[side].counts[r.cls]++;
      accs.push(r.accuracy);
    });
    if (accs.length) {
      const mean = accs.reduce((a, b) => a + b, 0) / accs.length;
      const harmonic = accs.length / accs.reduce((a, b) => a + 1 / Math.max(b, 1), 0);
      out[side].accuracy = (mean + harmonic) / 2;
    }
  }
  return out;
}

/* ---------- review extras (do not affect move classification) ---------- */
const PIECE_VAL = { q: 9, r: 5, b: 3, n: 3 };

// Game phase of a position: opening (first 10 moves), endgame (little material left) or middlegame.
export function phaseOf(fen, plyNo) {
  let material = 0;
  for (const ch of fen.split(' ')[0]) {
    const v = PIECE_VAL[ch.toLowerCase()];
    if (v) material += v;
  }
  if (material <= 26) return 'endgame';
  if (plyNo <= 20) return 'opening';
  return 'middlegame';
}

function combinedAccuracy(accs) {
  if (!accs.length) return null;
  const mean = accs.reduce((a, b) => a + b, 0) / accs.length;
  const harmonic = accs.length / accs.reduce((a, b) => a + 1 / Math.max(b, 1), 0);
  return (mean + harmonic) / 2;
}

// Accuracy of each player in each phase of the game.
export function phaseAccuracy(game, results) {
  const out = { w: {}, b: {} };
  for (const side of ['w', 'b']) {
    for (const ph of ['opening', 'middlegame', 'endgame']) {
      const accs = [];
      game.moves.forEach((m, i) => {
        const r = results[i];
        if (m.color === side && r && phaseOf(m.fenBefore, i + 1) === ph) accs.push(r.accuracy);
      });
      out[side][ph] = combinedAccuracy(accs);
    }
  }
  return out;
}

// Rough performance rating estimated from accuracy (an estimate, not an official rating).
const RATING_CURVE = [[0, 100], [40, 250], [50, 400], [60, 700], [70, 1000], [75, 1250], [80, 1500], [85, 1800], [90, 2150], [93, 2400], [96, 2700], [98, 2900], [100, 3100]];
export function estimateRating(acc) {
  if (acc == null) return null;
  for (let i = 1; i < RATING_CURVE.length; i++) {
    const [a1, r1] = RATING_CURVE[i];
    if (acc <= a1) {
      const [a0, r0] = RATING_CURVE[i - 1];
      return Math.round((r0 + ((acc - a0) / (a1 - a0)) * (r1 - r0)) / 50) * 50;
    }
  }
  return 3100;
}

// Icon class for a phase accuracy, used only for display.
export function accuracyClass(acc) {
  if (acc == null) return null;
  if (acc >= 90) return 'best';
  if (acc >= 80) return 'good';
  if (acc >= 65) return 'inaccuracy';
  if (acc >= 50) return 'mistake';
  return 'blunder';
}

// Opening name from the PGN headers (Chess.com puts it in ECOUrl).
export function openingName(headers) {
  if (headers.Opening) return headers.Opening;
  const url = headers.ECOUrl || '';
  const slug = url.split('/openings/')[1];
  if (!slug) return null;
  const words = [];
  for (const w of decodeURIComponent(slug).split('-')) {
    if (/^\d/.test(w)) break;
    words.push(w);
  }
  return words.join(' ') || null;
}
