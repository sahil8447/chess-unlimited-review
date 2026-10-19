import {test} from 'node:test';
import assert from 'node:assert/strict';
import {compareReference,summarize,toCsv} from '../tools/review-report.mjs';
const report={identity:{pgnSha256:'abc',initialFen:'start'},reviewedMoves:[{number:1,color:'w',san:'e4',uci:'e2e4',grade:'mistake'},{number:1,color:'b',san:'c5',uci:'c7c5',grade:'miss'}],whiteAccuracy:60,blackAccuracy:70};
test('aggregate comparison never invents agreement or false Miss ground truth',()=>{
 const r=compareReference(report,{accuracy:{w:44,b:66.8},counts:{w:{best:1},b:{}}});assert.equal(r.kind,'aggregate-only');assert.equal(r.agreement,undefined);assert.equal(r.falseMiss,undefined);assert.equal(r.referencePlyTotals.b,0);assert.equal(r.accuracyDifference.w,16);
});
test('per-move reference requires verified identity and produces confusion matrix',()=>{
 const reference={pgnSha256:'abc',moves:[{uci:'e2e4',grade:'blunder'},{uci:'c7c5',grade:'good'}]};
 const r=compareReference(report,reference);assert.equal(r.agreement,0);assert.equal(r.falseMiss,1);assert.equal(r.confusionMatrix['blunder → mistake'],1);assert.equal(r.mistakeBlunderDisagreements.length,1);
 assert.throws(()=>compareReference(report,{...reference,pgnSha256:'different'}),/fingerprint/);
 assert.throws(()=>compareReference(report,{moves:reference.moves}),/fingerprint/);
 assert.throws(()=>compareReference(report,{...reference,moves:[reference.moves[1],reference.moves[0]]}),/identity/);
});
test('CSV preserves explicit fields and escapes quoted SAN while counts include each move once',()=>{
 assert.equal(summarize(report).plies,2);assert.equal(summarize(report).counts.b.miss,1);assert.match(toCsv(report),/accuracyWeight/);assert.match(toCsv({...report,reviewedMoves:[{san:'"example"'}]}),/""example""/);
});
