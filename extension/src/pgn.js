// Chess Analyzer Pro Downloader - building a PGN from Chess.com game data.
// Copyright (C) 2026 Chess Analyzer Pro contributors. Licensed under GPL-3.0-or-later.
import { Chess } from 'chess.js';

const TCN = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!?{~}(^)[_]@#$,./&-*++=';
const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

// Decode Chess.com's compact move list into {from, to, promotion} moves.
export function decodeTcn(s) {
  const moves = [];
  const sq = (i) => 'abcdefgh'[i % 8] + (Math.floor(i / 8) + 1);
  for (let i = 0; i + 1 < s.length; i += 2) {
    const a = TCN.indexOf(s[i]);
    let b = TCN.indexOf(s[i + 1]);
    if (a < 0 || b < 0 || a > 63) throw new Error('unsupported');
    let promotion;
    if (b > 63) {
      promotion = 'qnrbkp'[Math.floor((b - 64) / 3)];
      b = a + (a < 16 ? -8 : 8) + ((b - 1) % 3) - 1;
    }
    moves.push({ from: sq(a), to: sq(b), promotion });
  }
  return moves;
}

// A game counts as finished only when Chess.com says so and a real result exists.
export function isFinished(game) {
  const result = game && game.pgnHeaders && game.pgnHeaders.Result;
  return !!game && game.isFinished === true && /^(1-0|0-1|1\/2-1\/2)$/.test(result || '');
}

export function buildPgn(game, link) {
  const h = { ...game.pgnHeaders };
  Object.keys(h).forEach((k) => {
    if (h[k] == null || h[k] === '') delete h[k];
  });
  const fen = h.FEN && h.FEN !== START ? h.FEN : null;
  delete h.FEN;
  delete h.SetUp;
  const chess = fen ? new Chess(fen) : new Chess();
  for (const m of decodeTcn(game.moveList || '')) chess.move(m);

  const order = ['Event', 'Site', 'Date', 'Round', 'White', 'Black', 'Result'];
  const tags = { Event: 'Chess.com game', Site: 'Chess.com', Date: '????.??.??', Round: '-', White: '?', Black: '?', ...h };
  if (fen) {
    tags.SetUp = '1';
    tags.FEN = fen;
  }
  if (link) tags.Link = link;
  // Make sure a date is always present (taken from the end of the game when missing).
  if ((!tags.Date || tags.Date === '????.??.??') && game.endTime) {
    const d = new Date(game.endTime * 1000);
    tags.Date = `${d.getUTCFullYear()}.${String(d.getUTCMonth() + 1).padStart(2, '0')}.${String(d.getUTCDate()).padStart(2, '0')}`;
  }
  const keys = [...order, ...Object.keys(tags).filter((k) => !order.includes(k))];
  const quote = (v) => String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const head = keys.map((k) => `[${k} "${quote(tags[k])}"]`).join('\n');

  // Remaining clock after every move (Chess.com gives it in tenths of a second).
  const stamps = String(game.moveTimestamps || '').split(',').filter((x) => x !== '').map(Number);
  const clk = (i) => {
    const v = stamps[i];
    if (!Number.isFinite(v)) return '';
    const sec = v / 10;
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = (sec % 60).toFixed(1);
    return ` {[%clk ${h}:${String(m).padStart(2, '0')}:${s.padStart(4, '0')}]}`;
  };

  const sans = chess.history();
  const firstBlack = !!fen && fen.split(' ')[1] === 'b';
  let num = fen ? parseInt(fen.split(' ')[5], 10) || 1 : 1;
  const parts = [];
  sans.forEach((san, i) => {
    const white = firstBlack ? i % 2 === 1 : i % 2 === 0;
    if (white) parts.push(`${num}.`);
    else if (i === 0) parts.push(`${num}...`);
    parts.push(san + clk(i));
    if (!white) num++;
  });
  parts.push(tags.Result);
  // Wrap the move text at ~80 columns as PGN readers expect.
  const lines = [];
  let line = '';
  for (const p of parts) {
    if (line && (line + ' ' + p).length > 80) {
      lines.push(line);
      line = p;
    } else line = line ? line + ' ' + p : p;
  }
  if (line) lines.push(line);
  return `${head}\n\n${lines.join('\n')}\n`;
}

export function fileName(headers, id) {
  const clean = (s) => String(s || 'unknown').replace(/[^\w.-]+/g, '_').slice(0, 40);
  return `${clean(headers.White)}_vs_${clean(headers.Black)}_${clean(headers.Date)}_${id}.pgn`;
}
