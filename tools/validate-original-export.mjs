import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {Chess} from 'chess.js';
import {createReport} from './review-report.mjs';
import {startTransport} from './engine-transport.mjs';
import {validateReviewExport,redactReviewExport} from '../src/reviewExport.js';
import {evaluationChance} from '../src/evaluation.js';
import {calculateAccuracyDetails,calculateReviewedMoveAccuracy,winChance} from '../src/grading.js';
import {classifyMove,classifyTacticalMove} from '../test/helpers/v11/grading.js';
import {verifyBrilliantCandidate} from '../src/tactics.js';
import {classifyBrilliantMove,AUTOMATIC_BRILLIANT_ENABLED} from '../src/brilliantRules.js';
const [input,output='test/evidence/original-export']=process.argv.slice(2);
if(!input)throw Error('Usage: node tools/validate-original-export.mjs ORIGINAL.json [output-directory]');
const bytes=readFileSync(input),original=JSON.parse(bytes),validation=validateReviewExport(original);
if(!validation.valid)throw Error(validation.errors.join('\n'));
mkdirSync(output,{recursive:true});
const source={kind:'actual-user-upload',sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length};
const save=(name,data)=>writeFileSync(join(output,name+'.json'),JSON.stringify(data,null,2)+'\n');
const game=new Chess();game.loadPgn(original.pgn);const history=game.history({verbose:true});
const replayed=original.reviewedMoves.map((row,index)=>{
 let grade=classifyMove({beforeCp:row.beforePlayerCp,afterCp:row.afterPlayerCp,bestMovePlayed:row.bestMovePlayed}).grade;
 grade=classifyTacticalMove({baseGrade:grade,bestMovePlayed:row.bestMovePlayed,beforeCp:row.beforePlayerCp,afterCp:row.afterPlayerCp,alternativeLoss:row.alternativeLoss});
 if(row.missDiagnostic)grade='miss';if(row.book&&['best','excellent','good'].includes(grade))grade='book';
 return {ply:index+1,san:row.san,originalGrade:row.grade,replayedGrade:grade,agrees:grade===row.grade,accuracy:calculateReviewedMoveAccuracy(row)};
});
const baseline=JSON.parse(readFileSync(join(output,'before-42.json')));
const baselineMismatches=original.reviewedMoves.flatMap((row,i)=>['grade','beforePlayerCp','afterPlayerCp','depth','cpLoss','loss'].filter(k=>row[k]!==baseline.grades[i][k]).map(field=>({ply:i+1,field,original:row[field],baseline:baseline.grades[i][field]})));
const legacyAccuracy=Object.fromEntries(['w','b'].map(color=>[color,calculateAccuracyDetails(original.reviewedMoves,color)]));
const engine=startTransport(),snapshots=[];
try{
 const g6=history[7],searches=engine.metrics.searches;
 const corrected=await verifyBrilliantCandidate({beforeFen:g6.before,chess:new Chess(g6.after),move:g6,evaluatePosition:engine.evaluate,depth:18});
 const g6Evidence={source,original:original.reviewedMoves[7].brilliantEvidence,corrected,decision:classifyBrilliantMove({baseGrade:original.reviewedMoves[7].grade,verification:corrected,rating:Number(original.headers.BlackElo)}),searches:engine.metrics.searches-searches};
 save('g6',g6Evidence);
 const report=await createReport(original.pgn,{audits:true,onInitial:r=>snapshots.push({state:r.lifecycle.state,metrics:r.metrics,complete:r.complete})},engine);
 const freshValidation=validateReviewExport(report);for(const [i,row]of report.reviewedMoves.entries())if(row.qualityEvidence && (row.bestMove!==row.qualityEvidence.bestMove||row.bestVariation.join(' ')!==row.qualityEvidence.rootBestLine.pv.join(' ')))throw Error('Quality/display mismatch at ply '+(i+1));if(!freshValidation.valid)throw Error(freshValidation.errors.join('\n'));
 save('fresh-report',{...redactReviewExport(report),artifactKind:'new-engine-review-of-original-export-pgn',source,validation:freshValidation,transport:report.transport,elapsedMs:report.elapsedMs,measurementScope:report.measurementScope});
 const beforeWarm=structuredClone(engine.metrics),warm=await createReport(original.pgn,{audits:true},engine);
 const warmTransport=Object.fromEntries(['requests','searches','engineMs','requestMs','workerStarts'].map(k=>[k,engine.metrics[k]-beforeWarm[k]]));
 const allMoves=original.reviewedMoves.map((old,index)=>{
  const row=report.reviewedMoves[index];
  return {ply:index+1,color:old.color,san:old.san,uci:old.uci,beforeFen:old.beforeFen,afterFen:old.afterFen,
   original:{grade:old.grade,qualitySource:old.qualitySource,depth:old.depth,beforeCp:old.beforePlayerCp,afterCp:old.afterPlayerCp,loss:old.loss,cpLoss:old.cpLoss,bestMate:old.bestMate,playedMate:old.playedMate,accuracy:old.accuracyContribution,brilliantDiagnostic:old.brilliantDiagnostic},
   fresh:{grade:row.grade,qualitySource:row.qualitySource,depth:row.depth,beforeEvaluation:row.beforeEvaluation,afterEvaluation:row.afterEvaluation,mateEvidence:row.mateEvidence,loss:row.loss,cpLoss:row.cpLoss,accuracy:row.accuracyContribution,brilliantDiagnostic:row.brilliantDiagnostic},
   accuracyDifference:row.accuracyContribution-old.accuracyContribution,legacyWinChanceBefore:winChance(old.beforePlayerCp),legacyWinChanceAfter:winChance(old.afterPlayerCp)};
 });
 const projected=report.reviewedMoves.map(row=>({...row,beforeEvaluation:undefined,afterEvaluation:undefined,positionBeforeEvaluation:undefined,positionAfterEvaluation:undefined,
  beforePlayerCp:row.beforePlayerCp??(evaluationChance(row.beforeEvaluation)>.5?10000:-10000),afterPlayerCp:row.afterPlayerCp??(evaluationChance(row.afterEvaluation)>.5?10000:-10000),
  positionBeforeWhiteCp:row.positionBeforeWhiteCp??(evaluationChance(row.positionBeforeEvaluation)>.5?10000:-10000),positionAfterWhiteCp:row.positionAfterWhiteCp??(evaluationChance(row.positionAfterEvaluation)>.5?10000:-10000)}));
 const accuracy=Object.fromEntries(['w','b'].map(color=>{
  const prior=legacyAccuracy[color],current=calculateAccuracyDetails(report.reviewedMoves,color),rows=allMoves.filter(r=>r.color===color);
  return [color,{original:prior,fresh:current,typedVsLegacySentinelProjection:current.value-calculateAccuracyDetails(projected,color).value,arithmeticOriginal:rows.reduce((s,r)=>s+r.original.accuracy,0)/rows.length,arithmeticFresh:rows.reduce((s,r)=>s+r.fresh.accuracy,0)/rows.length,largestContributionChanges:rows.slice().sort((a,b)=>Math.abs(b.accuracyDifference)-Math.abs(a.accuracyDifference)).slice(0,6).map(r=>({ply:r.ply,san:r.san,before:r.original.accuracy,after:r.fresh.accuracy,difference:r.accuracyDifference})),originalLosingPositionMoves:rows.filter(r=>r.legacyWinChanceBefore<.05).map(r=>({ply:r.ply,san:r.san,chanceBefore:r.legacyWinChanceBefore,chanceAfter:r.legacyWinChanceAfter,accuracy:r.original.accuracy})),chessComReference:color==='w'?44:66.8,referenceScope:'User-reported aggregate only; no per-move reference evidence. No coefficient tuning.'}];
 }));
 save('comparison',{source,baselineMismatches,validation,freshValidation,automaticBrilliantEnabled:AUTOMATIC_BRILLIANT_ENABLED,classificationReplay:replayed,accuracy,moves:allMoves,
  originalTiming:{complete:original.complete,metrics:original.metrics,requestsNotReportedAsCacheHits:original.metrics.requests-original.metrics.transportCacheHits,completedAuditRecords:original.reviewedMoves.filter(r=>r.brilliantEvidence).length,note:'Legacy live snapshot: total wall duration and final search count cannot be recovered. 79 requests minus 54 transport hits implies 25 uncached completed/requested jobs, not necessarily 25 finished searches. audits=2 but only one stored result; cannot assume optional diagnostics had completed.'},
  freshTiming:{elapsedMs:report.elapsedMs,metrics:report.metrics,transport:report.transport,snapshots},warmTiming:{elapsedMs:warm.elapsedMs,transport:warmTransport,accuracy:[warm.whiteAccuracy,warm.blackAccuracy],sameGrades:JSON.stringify(warm.reviewedMoves.map(r=>r.grade))===JSON.stringify(report.reviewedMoves.map(r=>r.grade))}});
 console.log(JSON.stringify({source,validation,freshValidation,classificationMismatches:replayed.filter(r=>!r.agrees),accuracy:[report.whiteAccuracy,report.blackAccuracy],elapsedMs:report.elapsedMs,searches:report.transport.searches,warmMs:warm.elapsedMs,warmTransport,g6Eligible:g6Evidence.decision.eligible}));
}finally{engine.close();}
