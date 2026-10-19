import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateReviewExport,redactReviewExport} from '../src/reviewExport.js';
import {snapshotReview} from '../src/reviewSnapshot.js';
import {runReview} from '../src/reviewEngine.js';
import {Chess} from 'chess.js';
const fixture=JSON.parse(readFileSync('test/fixtures/rafael-ayden-v11-reproduction.json'));
test('available fixture is explicitly a repository reproduction, not a claimed missing browser upload',()=>{
 assert.equal(fixture.fixtureSource.kind,'repository-report-not-uploaded-browser-export');const v=validateReviewExport(fixture);assert.equal(v.valid,true);assert.equal(v.game.plies,42);assert.equal(v.game.whitePlies,21);assert.equal(v.game.blackPlies,21);assert.equal(v.game.checkmate,true);assert.equal(v.game.result,'0-1');assert.ok(v.warnings.some(w=>w.includes('sentinel')));
 assert.equal(fixture.whiteAccuracy,68.34474981611713);assert.equal(fixture.blackAccuracy,68.84142934672248);
});
test('import validator rejects move, board, result and fabricated final-time mutations',()=>{
 for(const mutate of [r=>r.reviewedMoves[0].color='b',r=>r.reviewedMoves[0].afterFen=r.reviewedMoves[0].beforeFen,r=>r.headers.Result='1-0',r=>{r.complete=true;r.metrics.totalMs=0;}]){
  const r=structuredClone(fixture);mutate(r);assert.equal(validateReviewExport(r).valid,false);
 }
});
test('sanitization excludes unnecessary identity, URL and arbitrary top-level personal fields',()=>{
 const r=structuredClone(fixture);r.headers.White='Private name';r.pgn=r.pgn.replace('White player','Private name');r.secretEmail='private@example.test';r.headers.WhiteUrl='https://private.example/';
 const clean=redactReviewExport(r),serialized=JSON.stringify(clean);assert.doesNotMatch(serialized,/Private name|private@example|private\.example|secretEmail/);assert.equal(validateReviewExport(clean).valid,true);
});
test('snapshot lifecycle and metrics cannot mutate through another report reference',()=>{
 const base={headers:{Result:'0-1'},reviewedMoves:[{san:'mate'}],metrics:{totalMs:0,requests:1,errors:[]}};
 const initial=snapshotReview(base,{state:'initial-ready',elapsedMs:10});base.metrics.requests=100;base.reviewedMoves[0].san='changed';
 assert.equal(initial.metrics.requests,1);assert.equal(initial.reviewedMoves[0].san,'mate');assert.equal(initial.complete,false);assert.equal(initial.lifecycle.fullGameImported,true);
 const canceled=snapshotReview(base,{state:'canceled',elapsedMs:20});assert.equal(canceled.complete,false);assert.equal(canceled.lifecycle.finalAnalysisComplete,false);
 const final=snapshotReview(base,{state:'complete',elapsedMs:30});assert.equal(final.complete,true);assert.equal(final.metrics.totalMs,30);
});
test('canceling a pipeline emits a non-final canceled lifecycle and stops subsequent jobs',async()=>{
 const controller=new AbortController();let requests=0,state;
 const engine=async(fen,depth)=>{requests++;const g=new Chess(fen),m=g.moves({verbose:true})[0],uci=m.from+m.to;return {depth,bestMove:uci,score:0,mate:null,pv:[uci],candidates:[{depth,rank:1,move:uci,pv:[uci],scoreCp:0}]};};
 await assert.rejects(runReview('1. e4 e5 *',engine,{signal:controller.signal,onInitial:()=>controller.abort(),onState:r=>state=r}),{name:'AbortError'});
 assert.equal(state.lifecycle.state,'canceled');assert.equal(state.complete,false);assert.ok(state.metrics.totalMs>0);assert.equal(requests,3);
});
test('new actual-engine reproduction validates all 42 typed records and final mate handling',()=>{
 const r=JSON.parse(readFileSync('test/evidence/v12/final-report.json'));
 const validation=validateReviewExport(r);assert.equal(validation.valid,true,validation.errors.join('; '));assert.equal(validation.warnings.length,0);
 assert.equal(r.complete,true);assert.ok(r.metrics.totalMs>0);assert.equal(r.lifecycle.finalAnalysisComplete,true);
 assert.equal(r.reviewedMoves[38].san,'Kh3');assert.equal(r.reviewedMoves[38].grade,'mistake');assert.equal(r.reviewedMoves[38].cpLoss,null);
 assert.equal(r.reviewedMoves[40].mateEvidence.kind,'already-forced-loss');assert.equal(r.reviewedMoves[41].mateEvidence.kind,'delivers-checkmate');
 const bad=structuredClone(r),row=bad.reviewedMoves.find(m=>Number.isFinite(m.positionBeforeCp)&&m.positionBeforeCp!==0);row.positionBeforeCp=-row.positionBeforeCp;assert.equal(validateReviewExport(bad).valid,false);
});
test('canceling optional diagnostics preserves completed critical-verification status',()=>{
 const r=snapshotReview({headers:{Result:'0-1'},reviewedMoves:[{san:'move'}],metrics:{errors:[]}},{state:'diagnostics-running',elapsedMs:50});
 const canceled=snapshotReview(r,{state:'canceled',elapsedMs:60});assert.equal(canceled.complete,false);assert.equal(canceled.lifecycle.criticalVerificationComplete,true);assert.equal(canceled.lifecycle.finalAnalysisComplete,false);
});
test('base engine failure emits failed lifecycle instead of a fabricated final review',async()=>{
 let failed;await assert.rejects(runReview('1. e4 *',async()=>{throw Error('engine unavailable');},{onState:r=>failed=r}),/unavailable/);
 assert.equal(failed.lifecycle.state,'failed');assert.equal(failed.complete,false);assert.equal(failed.lifecycle.initialAnalysisComplete,false);assert.ok(failed.metrics.totalMs>0);
});
