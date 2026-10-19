import {test} from 'node:test';
import assert from 'node:assert/strict';
import {startStockfish} from './helpers/stockfish.mjs';
import {readFileSync} from 'node:fs';
import {Chess} from 'chess.js';
import {verifyBrilliantCandidate} from '../src/tactics.js';
import {classifyBrilliantMove} from '../src/brilliantRules.js';

test('Stockfish 19 Lite depth-18 Rxd7 benchmark',{timeout:240000},async()=>{
 const engine=await startStockfish();
 try {
 const evaluatePosition=engine.evaluate;
 const game=new Chess();game.loadPgn(readFileSync(new URL('rxd7.pgn',import.meta.url),'utf8'));
 const move=game.undo(),beforeFen=game.fen();game.move(move);
 assert.equal(move.san,'Rxd7+');
 const v=await verifyBrilliantCandidate({chess:game,beforeFen,move,evaluatePosition,depth:18});
 const decision=classifyBrilliantMove({baseGrade:'inaccuracy',verification:v,rating:1037});
 console.log(JSON.stringify({verification:v,decision},null,2));
 assert.equal(v.verified,true);assert.equal(v.forcingCompensation,true);assert.equal(v.rootBestMove,'d1d7');
 assert.equal(v.qualityVerified,true);assert.equal(v.deepCpGap,0);
 assert.equal(decision.counterfactualVerified,true);assert.equal(decision.alreadyCompletelyWinning,false);
 assert.ok(decision.alternativeUpperBoundCp<450);assert.equal(decision.eligible,true);
 assert.equal(decision.grade,'inaccuracy','diagnostics never overwrite the shallow grade');
 const mating=new Chess('5r1k/6pp/4Q2N/8/8/8/8/6K1 w - - 0 1');
 const matingBefore=mating.fen(), sacrifice=mating.move('Qg8+');
 const mateAudit=await verifyBrilliantCandidate({chess:mating,beforeFen:matingBefore,move:sacrifice,evaluatePosition,depth:18});
 assert.equal(mateAudit.isSacrifice,true);assert.equal(mateAudit.worstAcceptedCp,10000);
 const mateDecision=classifyBrilliantMove({baseGrade:'best',verification:mateAudit,rating:1500});
 assert.equal(mateDecision.eligible,false);assert.equal(mateDecision.alreadyCompletelyWinning,true);
 console.log('Smothered-mate queen sacrifice: material offer and forced mate verified');
 }finally{engine.close();}
});
