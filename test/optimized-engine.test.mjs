import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createReport} from '../tools/review-report.mjs';
test('actual optimized offscreen/WASM pipeline reviews checkmate without automatic badges',{timeout:180000},async()=>{
 const report=await createReport('1. f3 e5 2. g4 Qh4# 0-1',{book:false});
 assert.equal(report.reviewedMoves.length,4);assert.equal(report.identity.checkmate,true);
 assert.equal(report.reviewedMoves.at(-1).grade,'best');assert.equal(report.reviewedMoves.at(-1).loss,0);
 assert.ok(report.reviewedMoves.every(m=>m.grade!=='brilliant'));assert.equal(report.transport.workerStarts,1);
 assert.ok(report.transport.searches>0);assert.equal(report.metrics.audits,0);assert.ok(report.metrics.initialMs<report.metrics.totalMs);
 assert.ok(report.whiteAccuracy>=0&&report.whiteAccuracy<=100);assert.ok(report.blackAccuracy>=0&&report.blackAccuracy<=100);
});
test('actual WASM handles drawn, resigned and custom promotion review fixtures',{timeout:240000},async t=>{
 for(const fixture of [
  {id:'repetition draw',pgn:'[Result "1/2-1/2"]\n\n1. Nf3 Nf6 2. Ng1 Ng8 3. Nf3 Nf6 4. Ng1 Ng8 1/2-1/2',plies:8},
  {id:'declared resignation fixture',pgn:'[Result "0-1"]\n[Termination "resignation"]\n\n1. f3 e5 2. g4 0-1',plies:3},
  {id:'custom promotion',pgn:'[SetUp "1"]\n[FEN "7k/8/8/8/8/8/p7/7K b - - 0 23"]\n\n23... a1=Q+ *',plies:1}
 ])await t.test(fixture.id,async()=>{
  const report=await createReport(fixture.pgn);assert.equal(report.reviewedMoves.length,fixture.plies);
  assert.ok(report.reviewedMoves.every(m=>m.grade!=='brilliant'));assert.equal(report.metrics.errors.length,0);
  for(const score of [report.whiteAccuracy,report.blackAccuracy])assert.ok(score===null||score>=0&&score<=100);
  if(fixture.id==='repetition draw')assert.equal(report.graphData.at(-1).whiteCp,0);
  if(fixture.id==='custom promotion'){assert.equal(report.reviewedMoves[0].number,23);assert.equal(report.performance.b.rating,null);}
 });
});
