import {readFileSync,writeFileSync} from 'node:fs';
import {createReport,compareReference,toCsv,summarize} from './review-report.mjs';
import {startTransport} from './engine-transport.mjs';
const engine=startTransport(),pgn=readFileSync('test/games/rafael-ayden-2026.pgn','utf8');
try{
 const first=await createReport(pgn,{},engine);
 first.comparison=compareReference(first,JSON.parse(readFileSync('test/evidence/screenshot-reference.json','utf8')));
 writeFileSync('test/evidence/v11-supplied.json',JSON.stringify(first,null,2)+'\n');writeFileSync('test/evidence/v11-supplied.csv',toCsv(first));
 const previous={...engine.metrics},warm=await createReport(pgn,{},engine);
 const metrics=Object.fromEntries(['requests','searches','workerStarts','initializationMs','engineMs','requestMs'].map(key=>[key,engine.metrics[key]-previous[key]]));
 metrics.cacheHits=metrics.requests-metrics.searches;metrics.cacheHitRate=metrics.cacheHits/metrics.requests;
 const result={scope:'Same actual worker and bounded cache, second review of identical supplied game',firstMs:first.elapsedMs,warmMs:warm.elapsedMs,warmInitialMs:warm.metrics.initialMs,metrics,identicalGrades:first.reviewedMoves.every((m,i)=>m.grade===warm.reviewedMoves[i].grade),identicalAccuracy:first.whiteAccuracy===warm.whiteAccuracy&&first.blackAccuracy===warm.blackAccuracy,summary:summarize(warm)};
 writeFileSync('test/evidence/warm-cache.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{engine.close();}
