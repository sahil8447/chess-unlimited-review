import {Chess} from 'chess.js';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import os from 'node:os';
import {runV1Review} from '../test/helpers/v1-review.mjs';
import {startTransport} from './engine-transport.mjs';
import {createReport,summarize} from './review-report.mjs';

// Each run has a fresh transport/engine/cache. Execute sequentially, never race engines.
const supplied=readFileSync('test/games/rafael-ayden-2026.pgn','utf8');
const prefix=(pgn,plies)=>{const g=new Chess();g.loadPgn(pgn);while(g.history().length>plies)g.undo();g.header('Result','*','Termination','Benchmark prefix; original game truncated');return g.pgn();};
const cases=[{id:'20',pgn:prefix(supplied,20)},{id:'42',pgn:supplied},{id:'80',pgn:prefix(readFileSync('test/games/fischer-spassky-1972-game6.pgn','utf8'),80)}];
const readOptional=path=>{try{return readFileSync(path,'utf8').trim();}catch{return null;}};
const results=[];
for(const fixture of cases){
 const oldFile=`test/evidence/v1-${fixture.id}.json`,newFile=`test/evidence/v11-${fixture.id}.json`;
 let before;
 if(existsSync(oldFile))before=JSON.parse(readFileSync(oldFile,'utf8'));
 else if(fixture.id==='42' && existsSync('test/evidence/v1-supplied.json'))before=JSON.parse(readFileSync('test/evidence/v1-supplied.json','utf8'));
 else{
  const engine=startTransport({source:'test/helpers/v1-offscreen.txt'}),start=performance.now();
  try{before=await runV1Review(fixture.pgn,engine.evaluate);before.elapsedMs=performance.now()-start;before.transport=engine.metrics;before.summary=summarize(before);writeFileSync(oldFile,JSON.stringify(before,null,2)+'\n');}finally{engine.close();}
 }
 console.log('V1 completed',fixture.id,before.elapsedMs);
 const after=await createReport(fixture.pgn);writeFileSync(newFile,JSON.stringify(after,null,2)+'\n');
 const changed=before.reviewedMoves.flatMap((move,i)=>move.grade!==after.reviewedMoves[i].grade?[{ply:i+1,san:move.san,before:move.grade,after:after.reviewedMoves[i].grade,beforeLoss:move.loss,afterLoss:after.reviewedMoves[i].loss}]:[]);
 const row={id:fixture.id,plies:after.reviewedMoves.length,beforeMs:before.elapsedMs,afterMs:after.elapsedMs,initialAfterMs:after.metrics.initialMs,beforeSearches:before.transport.searches,afterSearches:after.transport.searches,
 beforeRequests:before.transport.requests,afterRequests:after.transport.requests,beforeCacheHitRate:(before.transport.requests-before.transport.searches)/before.transport.requests,afterCacheHitRate:after.transport.cacheHitRate,
 beforeSummary:summarize(before),afterSummary:after.summary,afterPhases:after.metrics,changedGrades:changed};
 results.push(row);console.log(JSON.stringify({id:row.id,before:row.beforeMs,after:row.afterMs,initial:row.initialAfterMs,searches:[row.beforeSearches,row.afterSearches]}));
 writeFileSync('test/evidence/benchmarks.json',JSON.stringify({scope:'Cold sequential single samples, same actual WASM/offscreen transport; 20/80 are explicitly unfinished legal PGN prefixes, 42 is complete supplied game. No laptop extrapolation.',environment:{platform:os.platform(),node:process.version,cpu:os.cpus()[0].model,logicalCpus:os.cpus().length,cpuQuota:readOptional('/sys/fs/cgroup/cpu.max'),memoryLimitBytes:readOptional('/sys/fs/cgroup/memory.max'),hostMemoryBytes:os.totalmem()},results},null,2)+'\n');
}
