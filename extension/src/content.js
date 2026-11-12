// Chess Analyzer Pro Downloader - adds a "download PGN" button to finished Chess.com games.
// Copyright (C) 2026 Chess Analyzer Pro contributors. Licensed under GPL-3.0-or-later.
import { buildPgn, fileName, isFinished } from './pgn.js';

const BTN_ID = 'cap-download-btn';
const msg = (k) => chrome.i18n.getMessage(k) || k;

// Recognise the game pages of Chess.com and return { type, id }.
function gameFromUrl(href) {
  const p = new URL(href).pathname;
  let m = p.match(/\/(?:analysis\/)?game\/(live|daily)\/(\d+)/) || p.match(/\/(live|daily)\/game\/(\d+)/);
  if (m) return { type: m[1], id: m[2] };
  m = p.match(/\/(?:analysis\/)?game\/(\d+)/);
  if (m) return { type: 'live', id: m[1] };
  return null;
}

async function getJson(url, opts) {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error('http ' + res.status);
  return res.json();
}

async function fetchGame(ref) {
  const types = ref.type === 'live' ? ['live', 'daily'] : ['daily', 'live'];
  let lastErr;
  for (const t of types) {
    try {
      const data = await getJson(`https://www.chess.com/callback/${t}/game/${ref.id}`, { credentials: 'include' });
      if (data && data.game) return { game: data.game, players: data.players, type: t };
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error('not found');
}

// The public archive holds the complete PGN (with clock times) of finished games.
async function fetchArchivePgn(game, ref, type) {
  const h = game.pgnHeaders || {};
  const months = new Set();
  if (game.endTime) {
    const d = new Date(game.endTime * 1000);
    months.add(`${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  const dm = /^(\d{4})\.(\d{2})/.exec(h.Date || '');
  if (dm) months.add(`${dm[1]}/${dm[2]}`);
  for (const month of months) {
    for (const user of [h.White, h.Black]) {
      if (!user) continue;
      try {
        const name = encodeURIComponent(String(user).toLowerCase());
        const data = await getJson(`https://api.chess.com/pub/player/${name}/games/${month}`);
        const hit = (data.games || []).find((g) => g.url && g.url.endsWith(`/${type}/${ref.id}`));
        if (hit && hit.pgn) return hit.pgn.trim() + '\n';
      } catch (_) {
        /* try the next source */
      }
    }
  }
  return null;
}

// Adds a [Name "value"] tag at the end of the PGN header section.
function addTag(pgn, name, value) {
  if (new RegExp(`^\\[${name}\\s`, 'm').test(pgn)) return pgn;
  const i = pgn.search(/\n\s*\n/);
  const tag = `[${name} "${value}"]`;
  return i < 0 ? `${tag}\n${pgn}` : `${pgn.slice(0, i)}\n${tag}${pgn.slice(i)}`;
}

function save(text, name) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/x-chess-pgn' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

let noteTimer;
function setState(btn, state, text) {
  btn.dataset.state = state;
  btn.querySelector('.cap-label').textContent = text;
  clearTimeout(noteTimer);
  if (state !== 'idle' && state !== 'busy') noteTimer = setTimeout(() => setState(btn, 'idle', msg('btnDownload')), 6000);
}

async function onClick(btn) {
  if (btn.dataset.state === 'busy') return;
  const ref = gameFromUrl(location.href);
  if (!ref) return;
  setState(btn, 'busy', msg('btnWorking'));
  try {
    const { game, players, type } = await fetchGame(ref);
    // Never export a game that is still being played.
    if (!isFinished(game)) {
      setState(btn, 'warn', msg('errUnfinished'));
      return;
    }
    const link = `https://www.chess.com/game/${type}/${ref.id}`;
    let pgn = await fetchArchivePgn(game, ref, type);
    if (!pgn) pgn = buildPgn(game, link);
    // The side shown at the bottom on Chess.com (your side when it is your game),
    // so Chess Analyzer Pro opens the board the same way round.
    const bottom = players && players.bottom && players.bottom.color;
    if (bottom === 'white' || bottom === 'black') pgn = addTag(pgn, 'Orientation', bottom);
    save(pgn,fileName(game.pgnHeaders || {}, ref.id));
    setState(btn, 'done', msg('btnDone'));
  } catch (err) {
    setState(btn, 'error', msg('errFailed'));
  }
}

function ensureButton() {
  const ref = gameFromUrl(location.href);
  let btn = document.getElementById(BTN_ID);
  if (!ref) {
    if (btn) btn.remove();
    return;
  }
  if (btn) return;
  btn = document.createElement('button');
  btn.id = BTN_ID;
  btn.type = 'button';
  btn.dataset.state = 'idle';
  btn.dir = chrome.i18n.getMessage('@@bidi_dir') || 'ltr';
  btn.title = msg('btnTitle');
  const icon = document.createElement('img');
  icon.src = chrome.runtime.getURL('icons/icon48.png');
  icon.alt = '';
  const label = document.createElement('span');
  label.className = 'cap-label';
  label.textContent = msg('btnDownload');
  btn.append(icon, label);
  btn.addEventListener('click', () => onClick(btn));
  document.body.appendChild(btn);
}

// Chess.com is a single-page app, so keep checking which page is shown.
ensureButton();
setInterval(ensureButton, 1000);
