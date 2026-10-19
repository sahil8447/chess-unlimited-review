import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Chess} from 'chess.js';
import {validateReviewExport} from '../src/reviewExport.js';
import {calculateAccuracyDetails} from '../src/grading.js';
import {verifyBrilliantCandidate} from '../src/tactics.js';
import {classifyBrilliantMove,AUTOMATIC_BRILLIANT_ENABLED} from '../src/brilliantRules.js';
const original=JSON.parse(readFileSync('test/fixtures/original-chrome-export.json'));
test('actual Chrome export provenance and all 42 original accuracy contributions are retained',()=>{
 assert.equal(original.fixtureSource.kind,'user-supplied-review-export');assert.equal(original.fixtureSource.sha256,'17f398739365e6c73b07c9efe0cf9b282fbc295a678fc84ffb501f99955c9aba');
 const v=validateReviewExport(original);assert.equal(v.valid,true,v.errors.join(';'));assert.equal(v.game.plies,42);assert.equal(v.game.checkmate,true);assert.equal(v.warnings.length,6);
 for(const [color,expected] of [['w',68.34474981611713],['b',68.84142934672248]]){const d=calculateAccuracyDetails(original.reviewedMoves,color);assert.equal(d.contributions.length,21);assert.ok(Math.abs(d.value-expected)<1e-10);}
 assert.equal(original.complete,false);assert.equal(original.metrics.totalMs,0);assert.equal(original.metrics.requests,79);assert.equal(original.metrics.audits,2);assert.equal(original.reviewedMoves.filter(r=>r.brilliantEvidence).length,1);
});
test('actual g6 diagnostic false positive is rejected without any engine request',async()=>{
 const row=original.reviewedMoves[7];assert.equal(row.san,'g6');assert.equal(row.brilliantEvidence.decision.eligible,true);
 const game=new Chess();game.loadPgn(original.pgn);const move=game.history({verbose:true})[7];
 const v=await verifyBrilliantCandidate({beforeFen:row.beforeFen,chess:new Chess(row.afterFen),move,depth:18,evaluatePosition:()=>{assert.fail('unrelated threat requires no engine search');}});
 const decision=classifyBrilliantMove({baseGrade:row.grade,verification:v,rating:1101});assert.equal(v.isSacrifice,false);assert.equal(decision.eligible,false);assert.equal(AUTOMATIC_BRILLIANT_ENABLED,false);
 const pawn=v.acceptedLines.find(l=>l.captureUci==='h5c5');assert.equal(pawn.causality.kind,'pre-existing-unrelated-threat');assert.equal(pawn.materialCostCp,0);
});
test('import rejects corrupted graph positions, scores, mate signs and missing typed graph evidence',()=>{
 const typed=JSON.parse(readFileSync('test/evidence/v12/final-report.json'));
 for(const [source,mutate] of [
  [original,r=>r.graphData.pop()],[original,r=>r.graphData[3].whiteCp+=1],[original,r=>r.graphData[3].ply=2],
  [typed,r=>r.graphData[39].evaluation.moves*=-1],[typed,r=>delete r.graphData[39].evaluation],
  [typed,r=>{r.reviewedMoves[41].positionAfterEvaluation.outcome=1;r.graphData[42].evaluation.outcome=1;}],
 ]){const r=structuredClone(source);mutate(r);assert.equal(validateReviewExport(r).valid,false);}
});
test('import rejects altered derived losses, legal choices, PVs, aggregate scores and timing counters',()=>{
 for(const mutate of [r=>r.reviewedMoves[38].cpLoss=0,r=>r.reviewedMoves[38].loss=0,r=>r.reviewedMoves[0].legalChoices=1,
  r=>r.reviewedMoves[0].bestVariation=['a1a8'],r=>r.reviewedMoves[0].bestMovePlayed=false,r=>r.whiteAccuracy=null,
  r=>r.reviewedMoves[38].evaluation=0,r=>r.metrics.requests=-1,r=>r.metrics.transportCacheHits=80,r=>r.metrics.fetchMs=-1,
  r=>r.reviewedMoves[7].brilliantEvidence.verification.rootCandidates[0].pv=['a1a8'],
  r=>r.reviewedMoves[7].brilliantEvidence.verification.acceptedLines[0].captureUci='a1a8']){
  const r=structuredClone(original);mutate(r);assert.equal(validateReviewExport(r).valid,false);
 }
});

test('paired search reordering keeps best flag, explanation and displayed PV consistent with accepted quality',async()=>{
 const {runReview}=await import('../src/reviewEngine.js');
 const initial=new Chess().fen();
 const engine=async(fen,depth,options)=>{
  const board=new Chess(fen);let moves=options.searchmoves||board.moves({verbose:true}).map(m=>m.from+m.to+(m.promotion||''));
  if(fen===initial)moves=options.searchmoves?['e2e4','d2d4']:['d2d4'];
  const candidates=moves.slice(0,options.multiPV).map((move,i)=>({rank:i+1,depth,move,pv:[move],scoreCp:200-i*10,mate:null}));
  return {depth,bestMove:candidates[0].move,score:candidates[0].scoreCp,mate:null,pv:candidates[0].pv,candidates};
 };
 const report=await runReview('1. e4 e5 *',engine,{book:false});const row=report.reviewedMoves[0];
 assert.equal(row.deepVerified,true);assert.equal(row.qualityEvidence.bestMove,'e2e4');assert.equal(row.bestMove,'e2e4');assert.equal(row.bestMovePlayed,true);assert.equal(row.bestVariation[0],row.bestMove);assert.equal(row.grade,'best');assert.match(row.explanation,/preferred move/);
});

test('fresh review of actual attachment fixes every reported mate and completion defect',()=>{
 const report=JSON.parse(readFileSync('test/evidence/original-export/fresh-report.json'));
 assert.equal(report.source.sha256,original.fixtureSource.sha256);assert.equal(report.artifactKind,'new-engine-review-of-original-export-pgn');
 assert.equal(validateReviewExport(report).valid,true);assert.equal(report.complete,true);assert.equal(report.lifecycle.finalAnalysisComplete,true);assert.ok(report.metrics.totalMs>0);
 for(const row of report.reviewedMoves){if(row.qualityEvidence){assert.equal(row.bestMove,row.qualityEvidence.bestMove);assert.deepEqual(row.bestVariation,row.qualityEvidence.rootBestLine.pv);}assert.notEqual(row.grade,'brilliant');}
 const tail=report.reviewedMoves.slice(-4);
 assert.equal(tail[0].grade,'mistake');assert.equal(tail[0].mateEvidence.kind,'allows-forced-mate');assert.equal(tail[0].afterEvaluation.kind,'mate');assert.ok(tail[0].afterEvaluation.moves<0);
 assert.equal(tail[1].beforeEvaluation.kind,'mate');assert.ok(tail[1].beforeEvaluation.moves>0);
 assert.equal(tail[2].mateEvidence.kind,'already-forced-loss');assert.equal(tail[3].afterEvaluation.kind,'checkmate');assert.equal(tail[3].afterEvaluation.outcome,1);
 for(const row of tail)assert.equal(row.cpLoss,null);
 assert.equal(report.reviewedMoves[30].san,'Qd3');assert.equal(report.reviewedMoves[30].grade,'best');
 const comparison=JSON.parse(readFileSync('test/evidence/original-export/comparison.json'));
 assert.deepEqual(comparison.baselineMismatches,[]);assert.ok(comparison.classificationReplay.every(r=>r.agrees));assert.equal(comparison.automaticBrilliantEnabled,false);
 assert.equal(comparison.warmTiming.sameGrades,true);assert.equal(comparison.warmTiming.transport.searches,0);
});
