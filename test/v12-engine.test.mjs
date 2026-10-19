import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Chess} from 'chess.js';
import {startStockfish} from './helpers/stockfish.mjs';
import {verifyBrilliantCandidate} from '../src/tactics.js';
import {classifyBrilliantMove,AUTOMATIC_BRILLIANT_ENABLED} from '../src/brilliantRules.js';
import {rootQuality} from '../src/reviewEvidence.js';
import {classifyMove} from '../src/grading.js';

test('engine-backed g6 rejection and mate alternatives from the supplied game',{timeout:240000},async()=>{
 const game=new Chess();game.loadPgn(readFileSync('test/games/rafael-ayden-2026.pgn','utf8'));const moves=game.history({verbose:true});
 const engine=await startStockfish();try{
  let calls=0;const move=moves[7],v=await verifyBrilliantCandidate({chess:new Chess(move.after),beforeFen:move.before,move,evaluatePosition:async(...args)=>{calls++;return engine.evaluate(...args);},depth:18});
  assert.equal(v.isSacrifice,false);assert.equal(classifyBrilliantMove({baseGrade:'best',verification:v,rating:1101}).eligible,false);assert.equal(calls,0,'causality precheck avoids speculative searches');assert.equal(AUTOMATIC_BRILLIANT_ENABLED,false);
  const kh3=moves[38],root=await engine.evaluate(kh3.before,18),playedUci=kh3.from+kh3.to;
  const pair=await engine.evaluate(kh3.before,18,{searchmoves:[root.bestMove,playedUci],multiPV:2});
  const q=rootQuality(pair,kh3,18);assert.ok(q);assert.equal(root.mate,null);assert.equal(q.beforeEvaluation.kind,'cp');assert.equal(q.afterEvaluation.kind,'mate');assert.ok(q.afterEvaluation.moves<0);
  const deeper=await engine.evaluate(kh3.before,20,{multiPV:1});assert.equal(deeper.mate,null,'no forced mate found for the best alternative at depth 20');
  const grade=classifyMove({beforeEvaluation:q.beforeEvaluation,afterEvaluation:q.afterEvaluation,qualityVerified:true,bestMovePlayed:false,legalChoices:new Chess(kh3.before).moves().length});assert.equal(grade.grade,'mistake');
  const kg4=moves[40],choices=new Chess(kg4.before).moves();assert.equal(choices.length,2);
  const lost=await engine.evaluate(kg4.before,18);assert.ok(lost.candidates.every(line=>line.mate<0));assert.equal(lost.mate,-1);
 }finally{engine.close();}
});
