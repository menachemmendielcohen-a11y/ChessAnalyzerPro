// Chess Analyzer Pro - UCI bridge to the bundled Stockfish engine.
// Copyright (C) 2026 Chess Analyzer Pro contributors. Licensed under GPL-3.0-or-later.
'use strict';

const { spawn } = require('child_process');
const os = require('os');

class Engine {
  constructor(exePath) {
    this.exePath = exePath;
    this.proc = null;
    this.buffer = '';
    this.name = 'Stockfish';
    this.ready = null;
    this.current = null; // { lines: Map, resolve }
    this.queue = Promise.resolve();
    this.waiters = [];
  }

  start() {
    if (this.ready) return this.ready;
    this.ready = new Promise((resolve, reject) => {
      try {
        this.proc = spawn(this.exePath, [], { windowsHide: true, stdio: ['pipe', 'pipe', 'ignore'] });
      } catch (err) {
        reject(err);
        return;
      }
      this.proc.on('error', (err) => {
        this.ready = null;
        reject(err);
      });
      this.proc.on('exit', () => {
        this.proc = null;
        this.ready = null;
        if (this.current) {
          this.current.resolve({ lines: [], aborted: true });
          this.current = null;
        }
      });
      this.proc.stdout.setEncoding('utf8');
      this.proc.stdout.on('data', (chunk) => this.onData(chunk));

      const threads = Math.max(1, Math.min(8, os.cpus().length - 1));
      this.send('uci');
      this.waitFor('uciok')
        .then(() => {
          this.send(`setoption name Threads value ${threads}`);
          this.send('setoption name Hash value 256');
          this.send('setoption name UCI_ShowWDL value false');
          this.send('isready');
          return this.waitFor('readyok');
        })
        .then(() => resolve({ name: this.name, threads }))
        .catch(reject);
    });
    return this.ready;
  }

  send(cmd) {
    if (this.proc && this.proc.stdin.writable) this.proc.stdin.write(cmd + '\n');
  }

  waitFor(token) {
    return new Promise((resolve) => this.waiters.push({ token, resolve }));
  }

  onData(chunk) {
    this.buffer += chunk;
    let idx;
    while ((idx = this.buffer.indexOf('\n')) >= 0) {
      const line = this.buffer.slice(0, idx).trim();
      this.buffer = this.buffer.slice(idx + 1);
      if (line) this.onLine(line);
    }
  }

  onLine(line) {
    if (line.startsWith('id name ')) this.name = line.slice(8);

    for (let i = 0; i < this.waiters.length; i++) {
      if (line === this.waiters[i].token) {
        const w = this.waiters.splice(i, 1)[0];
        w.resolve();
        break;
      }
    }

    const cur = this.current;
    if (!cur) return;

    if (line.startsWith('info ') && line.includes(' score ')) {
      const t = line.split(/\s+/);
      const get = (key) => {
        const i = t.indexOf(key);
        return i >= 0 ? t[i + 1] : undefined;
      };
      // Ignore bound-only updates; they are not exact scores.
      if (t.includes('lowerbound') || t.includes('upperbound')) return;
      const si = t.indexOf('score');
      const kind = t[si + 1];
      const val = parseInt(t[si + 2], 10);
      const pvIdx = t.indexOf('pv');
      const pv = pvIdx >= 0 ? t.slice(pvIdx + 1) : [];
      const multipv = parseInt(get('multipv') || '1', 10);
      const depth = parseInt(get('depth') || '0', 10);
      if (!pv.length && depth > 0) return;
      cur.lines.set(multipv, {
        multipv,
        depth,
        cp: kind === 'cp' ? val : null,
        mate: kind === 'mate' ? val : null,
        pv,
      });
    } else if (line.startsWith('bestmove')) {
      this.current = null;
      const lines = [...cur.lines.values()].sort((a, b) => a.multipv - b.multipv);
      cur.resolve({ lines, aborted: cur.aborted === true });
    }
  }

  // Analyse one position. Scores are from the side-to-move's point of view.
  analyze(fen, { depth = 16, multipv = 3, movetime = 1200 } = {}) {
    const run = async () => {
      await this.start();
      return new Promise((resolve) => {
        this.current = { lines: new Map(), resolve };
        this.send(`setoption name MultiPV value ${multipv}`);
        this.send(`position fen ${fen}`);
        this.send(`go depth ${depth} movetime ${movetime}`);
      });
    };
    const p = this.queue.then(run, run);
    this.queue = p.catch(() => {});
    return p;
  }

  stop() {
    if (this.current) {
      this.current.aborted = true;
      this.send('stop');
    }
  }

  quit() {
    if (this.proc) {
      this.send('quit');
      const proc = this.proc;
      setTimeout(() => {
        try {
          proc.kill();
        } catch (_) {
          /* already gone */
        }
      }, 500);
    }
  }
}

module.exports = { Engine };
