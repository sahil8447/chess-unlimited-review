import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {Chess} from 'chess.js';
import {runReview} from '../src/reviewEngine.js';
import {GRADES,calculateAccuracyDetails} from '../src/grading.js';
import {startTransport} from './engine-transport.mjs';

export function summarize(report){
 const counts={w:{},b:{}};for(const move of report.reviewedMoves)counts[move.color][move.grade]=(counts[move.color][move.grade]||0)+1;
 return {plies:report.reviewedMoves.length,counts,accuracy:{w:report.whiteAccuracy,b:report.blackAccuracy}};
}
export function compareReference(report,reference){
 const summary=summarize(report),output={kind:reference.moves?'per-move':'aggregate-only',summary,referenceCounts:reference.counts||null,accuracyDifference:{}};
 for(const color of ['w','b'])if(Number.isFinite(reference.accuracy?.[color]))output.accuracyDifference[color]=summary.accuracy[color]-reference.accuracy[color];
 if(reference.counts)output.referencePlyTotals=Object.fromEntries(['w','b'].map(c=>[c,Object.values(reference.counts[c]||{}).reduce((a,b)=>a+b,0)]));
 if(reference.counts)output.countDifferences=Object.fromEntries(['w','b'].map(c=>[c,Object.fromEntries([...new Set([...Object.keys(summary.counts[c]),...Object.keys(reference.counts[c]||{})])].map(grade=>[grade,(summary.counts[c][grade]||0)-(reference.counts[c]?.[grade]||0)]))]));
 if(reference.moves){
  if(!reference.pgnSha256 && !reference.initialFen)throw Error('Per-move reference needs a PGN fingerprint or initial FEN');
  if(reference.initialFen && reference.initialFen!==report.identity.initialFen)throw Error('Reference starting position differs');
  if(reference.moves.length!==report.reviewedMoves.length)throw Error('Reference ply count differs');
  if(reference.pgnSha256 && reference.pgnSha256!==report.identity.pgnSha256)throw Error('Reference PGN fingerprint differs');
  const confusion={},disagreements=[];let agreed=0,falseMiss=0;
  reference.moves.forEach((expected,i)=>{const actual=report.reviewedMoves[i];
   if(!GRADES[expected.grade])throw Error(`Unknown reference grade at ply ${i+1}`);
   if(!expected.uci || expected.uci!==actual.uci)throw Error(`Reference move identity differs at ply ${i+1}`);
   const key=expected.grade+' → '+actual.grade;confusion[key]=(confusion[key]||0)+1;
   if(expected.grade===actual.grade)agreed++;else disagreements.push({ply:i+1,san:actual.san,expected:expected.grade,actual:actual.grade});
   if(actual.grade==='miss'&&expected.grade!=='miss')falseMiss++;
  });output.agreement=agreed/reference.moves.length;output.confusionMatrix=confusion;output.disagreements=disagreements;output.falseMiss=falseMiss;
  output.mistakeBlunderDisagreements=disagreements.filter(d=>['mistake','blunder'].includes(d.expected)||['mistake','blunder'].includes(d.actual));
 }
 return output;
}
export async function createReport(pgn,options={},transport=null){
 const engine=transport||startTransport();const wallStart=performance.now();
 try{
  const report=await runReview(pgn,engine.evaluate,options);const game=new Chess();game.loadPgn(pgn);
  report.identity={pgnSha256:createHash('sha256').update(pgn).digest('hex'),plies:game.history().length,initialFen:report.reviewedMoves[0].beforeFen,finalFen:game.fen(),checkmate:game.isCheckmate(),result:game.header().Result||'*'};
  report.accuracyDetails={w:calculateAccuracyDetails(report.reviewedMoves,'w'),b:calculateAccuracyDetails(report.reviewedMoves,'b')};
  for(const color of ['w','b'])for(const item of report.accuracyDetails[color]?.contributions||[])report.reviewedMoves[item.index].accuracyWeight=item.weight;
  report.transport={...engine.metrics,byDepth:{...engine.metrics.byDepth}};report.transport.cacheHits=engine.metrics.requests-engine.metrics.searches;
  report.transport.cacheHitRate=engine.metrics.requests ? report.transport.cacheHits/engine.metrics.requests:0;
  report.transport.averageRequestMs=engine.metrics.requestMs/Math.max(1,engine.metrics.requests);
  report.elapsedMs=performance.now()-wallStart;report.summary=summarize(report);
  report.measurementScope={transport:'Actual offscreen.js with Node Worker IPC around shipped Stockfish WASM',pgnFetchMs:null,renderMs:null,reason:'CLI uses a local PGN and no DOM. Browser records these separately.'};
  return report;
 }finally{if(!transport)engine.close();}
}
export function toCsv(report){
 const keys=['number','color','san','uci','initialGrade','grade','beforePlayerCp','afterPlayerCp','cpLoss','loss','accuracyContribution','accuracyWeight','depth','afterDepth','deepVerified','bestMove','qualitySource','brilliantDiagnostic'];
 const quote=value=>'"'+String(value??'').replaceAll('"','""')+'"';
 return [keys.join(','),...report.reviewedMoves.map(row=>keys.map(key=>quote(row[key])).join(','))].join('\n')+'\n';
}
if(process.argv[1] && import.meta.url===new URL(process.argv[1],'file:').href){
 const args=process.argv.slice(2),input=args[0];if(!input)throw Error('Usage: node tools/review-report.mjs game.pgn report.json [--csv report.csv] [--reference reference.json] [--audits] [--no-book] [--base-depth 12] [--critical-depth 18]');
 const value=flag=>args[args.indexOf(flag)+1];
 const report=await createReport(readFileSync(input,'utf8'),{audits:args.includes('--audits'),book:!args.includes('--no-book'),...(args.includes('--base-depth')?{baseDepth:Number(value('--base-depth'))}:{}),...(args.includes('--critical-depth')?{criticalDepth:Number(value('--critical-depth'))}:{})});
 if(args.includes('--reference'))report.comparison=compareReference(report,JSON.parse(readFileSync(value('--reference'),'utf8')));
 writeFileSync(args[1]||'review-report.json',JSON.stringify(report,null,2)+'\n');if(args.includes('--csv'))writeFileSync(value('--csv'),toCsv(report));
 console.log(JSON.stringify({summary:report.summary,metrics:report.metrics,transport:report.transport}));
}
