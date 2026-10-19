import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {normalizeEvaluation,evaluationCp,evaluationChance,formatEvaluation} from '../src/evaluation.js';
import {classifyMove,calculateReviewedMoveAccuracy} from '../src/grading.js';
import {generateMoveExplanation} from '../src/moveExplanation.js';
const cp=n=>({kind:'cp',cp:n}),mate=n=>({kind:'mate',moves:n});
test('mate, draw, terminal and unknown normalization never fabricate centipawns',()=>{
 assert.deepEqual(normalizeEvaluation({score:null,mate:3,depth:18},{turn:'b',pov:'w'}),{kind:'mate',moves:-3,depth:18});
 assert.equal(evaluationCp(mate(-3)),null);assert.equal(evaluationChance(mate(-3)),0);assert.equal(formatEvaluation(mate(3)),'+M3');
 assert.equal(normalizeEvaluation({score:30,mate:2}).kind,'unknown');assert.equal(normalizeEvaluation({mate:0}).kind,'unknown');
 assert.equal(normalizeEvaluation({score:10000,mate:null}).kind,'cp','real cp 10000 is not silently reinterpreted as mate');
 assert.equal(normalizeEvaluation({mate:-1},{turn:'w',pov:'b',terminal:true}).outcome,1);
 assert.equal(normalizeEvaluation({score:0},{terminal:true}).kind,'draw');
});
test('verified finite loss to mate differs from already-forced loss and forced defense',()=>{
 const args={beforeEvaluation:cp(-1003),afterEvaluation:mate(-2),bestMovePlayed:false,qualityVerified:true,legalChoices:34};
 const transition=classifyMove(args);assert.equal(transition.grade,'mistake');assert.equal(transition.mateEvidence.kind,'allows-forced-mate');
 const already=classifyMove({...args,beforeEvaluation:mate(-5)});assert.equal(already.grade,'good');assert.equal(already.loss,0);assert.equal(already.mateEvidence.kind,'shortens-existing-mate');
 const forced=classifyMove({...args,beforeEvaluation:mate(-2),afterEvaluation:mate(-1),legalChoices:1});assert.equal(forced.grade,'best');assert.equal(forced.mateEvidence.forced,true);
 const balanced=classifyMove({...args,beforeEvaluation:cp(0)});assert.equal(balanced.grade,'blunder');
});
test('giving up a forced win and delivering checkmate retain explicit outcomes',()=>{
 const missed=classifyMove({beforeEvaluation:mate(3),afterEvaluation:cp(-100),qualityVerified:true,bestMovePlayed:false});assert.equal(missed.mateEvidence.kind,'misses-forced-mate');assert.equal(missed.grade,'blunder');
 const delivered=classifyMove({beforeEvaluation:mate(1),afterEvaluation:{kind:'checkmate',outcome:1},qualityVerified:true,bestMovePlayed:false});assert.equal(delivered.grade,'best');assert.equal(delivered.mateEvidence.kind,'delivers-checkmate');
 assert.ok(calculateReviewedMoveAccuracy({beforeEvaluation:mate(-3),afterEvaluation:mate(-1)})>99.99);
});
test('mate explanation cannot describe a forced loss as a stable ordinary position',()=>{
 const g=new Chess('7k/8/5KQ1/8/8/8/8/8 w - - 0 1'),beforeFen=g.fen(),move=g.move('Qg7#');
 assert.match(generateMoveExplanation({move,beforeFen,afterFen:g.fen(),grade:'best'}),/checkmate/);
 const p=new Chess();p.move('e4');const m=p.history({verbose:true})[0];
 const text=generateMoveExplanation({move:m,beforeFen:m.before,afterFen:m.after,grade:'good',beforeEvaluation:mate(-3),afterEvaluation:mate(-1),mateEvidence:{kind:'shortens-existing-mate',forced:false}});
 assert.match(text,/already subject to forced mate/);assert.doesNotMatch(text,/stable|8997|10000/);
});
test('malformed typed states fail closed rather than implying a known mate or draw',()=>{
 for(const state of [{kind:'mate',moves:0},{kind:'mate',moves:'unknown'},{kind:'mate',moves:2,cp:100},{kind:'checkmate',outcome:0},{kind:'draw',cp:100},{kind:'cp',cp:NaN}]){assert.equal(evaluationChance(state),null);assert.equal(formatEvaluation(state),'Unknown');}
});
test('mate ordering and Great alternatives compare explicit outcomes, not centipawn sentinels',async()=>{
 const {compareEvaluations}=await import('../src/evaluation.js');const {calculateAlternativeLoss}=await import('../src/grading.js');
 assert.ok(compareEvaluations(mate(2),cp(100000))>0);assert.ok(compareEvaluations(mate(-5),mate(-2))>0);assert.ok(compareEvaluations(cp(-100000),mate(-2))>0);
 assert.equal(calculateAlternativeLoss([{rank:1,depth:18,mate:2,scoreCp:null},{rank:2,depth:18,mate:-2,scoreCp:null}]),1);
});
