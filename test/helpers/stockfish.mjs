import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';

// Real shipped engine; one outstanding UCI search, bounded by a timeout.
export async function startStockfish() {
  const child = spawn(process.execPath, ['engine/stockfish-19-lite-single.js'], {stdio:['pipe','pipe','pipe']});
  const lines = createInterface({input:child.stdout});
  let pending;
  let stderr = '';
  child.stderr.on('data', data => { stderr = (stderr + data).slice(-2000); });
  const command = (text, done) => new Promise((resolve,reject) => {
    if (pending) return reject(new Error('Concurrent UCI command'));
    const timer = setTimeout(() => {
      pending = null;
      child.kill();
      reject(new Error(`UCI timeout: ${text}; ${stderr}`));
    }, 120000);
    pending = {output:[], done, resolve, reject, timer};
    child.stdin.write(text + '\n');
  });
  const fail = error => {if(pending){clearTimeout(pending.timer);pending.reject(error);pending=null;}};
  child.on('error',fail);
  child.on('exit', code => fail(new Error(`Stockfish exited ${code}: ${stderr}`)));
  lines.on('line', line => {
    if (!pending) return;
    pending.output.push(line);
    if (pending.done(line)) {
      const job = pending;pending = null;clearTimeout(job.timer);job.resolve(job.output);
    }
  });
  await command('uci', line => line === 'uciok');
  await command('isready', line => line === 'readyok');
  const cache = new Map();
  async function evaluate(fen, depth = 18, options = {}) {
    const searchmoves = Array.isArray(options) ? options : options.searchmoves || [];
    const key = JSON.stringify([fen,depth,searchmoves,options.multiPV ?? (searchmoves.length ? Math.min(searchmoves.length,3) : 3)]);
    if (cache.has(key)) return cache.get(key);
    // Reset hash for reproducible independent fixtures, without mixing baselines.
    await command('ucinewgame\nisready', line => line === 'readyok');
    const count = options.multiPV ?? (searchmoves.length ? Math.min(searchmoves.length,3) : 3);
    const output = await command(`setoption name MultiPV value ${count}\nposition fen ${fen}\ngo depth ${depth}${searchmoves.length ? ' searchmoves '+searchmoves.join(' ') : ''}`, line => line.startsWith('bestmove'));
    const candidates = new Map();
    for (const line of output) {
      const match = line.match(/\bdepth (\d+).*?\bmultipv (\d+).*?\bscore (cp|mate) (-?\d+).*?\bpv (.+)$/);
      if (!match || Number(match[1]) !== depth) continue;
      const pv = match[5].trim().split(/\s+/);
      const rank = Number(match[2]);
      candidates.set(rank,{depth,rank,move:pv[0],pv,bound:/\b(?:upperbound|lowerbound)\b/.test(line),scoreCp:match[3]==='cp'?Number(match[4]):null,mate:match[3]==='mate'?Number(match[4]):null});
    }
    const all = [...candidates.values()].sort((a,b)=>a.rank-b.rank), primary=all[0];
    if (!primary || primary.bound) throw new Error('Incomplete engine result');
    const result={depth,bestMove:output.at(-1).split(/\s+/)[1],score:primary.scoreCp,mate:primary.mate,candidates:all,pv:primary.pv};
    cache.set(key,result);return result;
  }
  return {evaluate,close(){child.kill();lines.close();}};
}
