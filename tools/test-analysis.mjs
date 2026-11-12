// Headless check: analyse a sample game with the bundled Stockfish and print classifications.
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const { Engine } = require('../app/src/engine.js');
const A = await import('../app/src/renderer/analysis.js');

const pgn = `[Event "Paris"]
[White "Morphy"]
[Black "Duke Karl / Count Isouard"]
[Date "1858.??.??"]
[Result "1-0"]

1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7
8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7
14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0`;

const game = A.loadGame(pgn);
const engine = new Engine(path.join(here, '../app/engine/stockfish.exe'));
console.log(await engine.start());
const evals = [];
const results = [];
const t0 = Date.now();
for (let i = 0; i < game.fens.length; i++) {
  evals[i] = A.terminalEval(game.fens[i]) || A.normalizeEval(game.fens[i], await engine.analyze(game.fens[i], { depth: 16, multipv: 3, movetime: 1200 }));
  if (i > 0) {
    const r = (results[i - 1] = A.classifyMove(game, i - 1, evals, results));
    console.log(Date.now() - t0, String(i).padStart(2), game.moves[i - 1].san.padEnd(7), r.cls.padEnd(11), 'loss', r.loss.toFixed(1).padStart(5), 'best', r.bestSan, '| eval', A.evalText(evals[i].score), 'd', evals[i].lines[0]?.depth);
  }
}
console.log('ms', Date.now() - t0, JSON.stringify(A.summarize(game, results)));
try { A.loadGame('[Result "*"]\n\n1. e4 e5 *'); console.log('FAIL: unfinished accepted'); } catch (e) { console.log('unfinished ->', e.message); }
engine.quit();
