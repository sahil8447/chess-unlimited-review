import {readFileSync,writeFileSync} from 'node:fs';
import {Chess} from 'chess.js';
import os from 'node:os';
import {runReview as baseline} from '../test/helpers/v11/reviewEngine.js';
import {runReview} from '../src/reviewEngine.js';
import {startTransport} from './engine-transport.mjs';
const supplied=readFileSync('test/games/rafael-ayden-2026.pgn','utf8');
const prefix=(pgn,plies)=>{const g=new Chess();g.loadPgn(pgn);while(g.history().length>plies)g.undo();g.header('Result','*');return g.pgn();};
const cases=[{id:'20',pgn:prefix(supplied,20)},{id:'42',pgn:supplied},{id:'80',pgn:prefix(readFileSync('test/games/fischer-spassky-1972-game6.pgn','utf8'),80)}];
const mode=process.argv[2]||'after',results=[];
for(const fixture of cases){
 const engine=startTransport({source:mode==='before'?'test/helpers/v11/offscreen.txt':'offscreen.js'});
 const game=new Chess();game.loadPgn(fixture.pgn);game.header('White','White player','Black','Black player');
 const pgn=game.pgn(),started=performance.now();
 try{
  const report=await (mode==='before'?baseline:runReview)(pgn,engine.evaluate);
  const row={id:fixture.id,mode,elapsedMs:performance.now()-started,metrics:report.metrics,transport:engine.metrics,whiteAccuracy:report.whiteAccuracy,blackAccuracy:report.blackAccuracy,grades:report.reviewedMoves.map(m=>({ply:report.reviewedMoves.indexOf(m)+1,san:m.san,color:m.color,grade:m.grade,depth:m.depth,loss:m.loss,cpLoss:m.cpLoss,beforePlayerCp:m.beforePlayerCp,afterPlayerCp:m.afterPlayerCp,beforeEvaluation:m.beforeEvaluation,afterEvaluation:m.afterEvaluation,mateEvidence:m.mateEvidence,accuracyContribution:m.accuracyContribution})),verificationPlan:report.verifications||[]};
  results.push(row);writeFileSync(`test/evidence/v12/${mode}-${fixture.id}.json`,JSON.stringify(row,null,2)+'\n');
  console.log(JSON.stringify({id:fixture.id,elapsedMs:row.elapsedMs,initialMs:report.metrics.initialMs,searches:engine.metrics.searches,cacheHits:engine.metrics.requests-engine.metrics.searches,accuracy:[report.whiteAccuracy,report.blackAccuracy]}));
 }finally{engine.close();}
}
writeFileSync(`test/evidence/v12/${mode}-summary.json`,JSON.stringify({scope:'Cold, sequential single samples; local PGN, no DOM/network; 20/80 legal unfinished prefixes. Actual shipped single-thread WASM.',environment:{cpu:os.cpus()[0].model,node:process.version,platform:os.platform()},results},null,2)+'\n');
