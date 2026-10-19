import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {Chess} from 'chess.js';
import {piecePositions} from './piece-positions.mjs';
import {startStockfish} from './helpers/stockfish.mjs';
import {verifyBrilliantCandidate,detectSacrificeCandidate,completeRootLine} from '../src/tactics.js';
import {classifyBrilliantMove,AUTOMATIC_BRILLIANT_ENABLED} from '../src/brilliantRules.js';
import {playUci,materialCp} from '../src/sacrificeMaterial.js';

const additionalNegatives=[
 {id:'exposed-unmoved-rook-blunder',fen:'6kb/8/8/8/8/8/1B6/R3K3 w Q - 0 1',move:'Ba3',accept:'Bxa1'},
 {id:'defended-pawn-quiet-development',moves:'d4 d5 c4 e6 Nc3 Nf6',move:'e3',accept:'dxc4',continuation:'Bxc4'},
 {id:'already-won-queen-offer',fen:'5r1k/6pp/4Q2N/8/8/8/8/6K1 w - - 0 1',move:'Qg8+',accept:'Rxg8',continuation:'Nf7#'},
 {id:'non-sacrificing-mate',moves:'e4 e5 Qh5 Nc6 Bc4 Nf6',move:'Qxf7#'},
];

test('historical piece sacrifices and additional false-positive protections',{timeout:900000},async t=>{
 const engine=await startStockfish(),results=[];
 try{
  for(const fixture of piecePositions)await t.test(fixture.id,{timeout:240000},async()=>{
   const game=new Chess();game.loadPgn(readFileSync(new URL('games/'+fixture.file,import.meta.url),'utf8'));
   const history=game.history();assert.equal(history[fixture.ply],fixture.move,'exact historical move and ply');
   while(game.history().length>fixture.ply)game.undo();
   const beforeFen=game.fen(),baseline=materialCp(game,game.turn()),move=game.move(fixture.move),afterFen=game.fen();
   assert.equal(move.piece,fixture.piece);assert.equal(detectSacrificeCandidate(game,move),true);
   const verification=await verifyBrilliantCandidate({chess:game,beforeFen,move,evaluatePosition:engine.evaluate,depth:18});
   const decision=classifyBrilliantMove({baseGrade:'best',verification,rating:1500});
   assert.equal(verification.verified,true);assert.equal(verification.isSacrifice,true);
   assert.equal(verification.qualityVerified,true);assert.equal(verification.deepCpGap,0);
   assert.ok(verification.deepAfter>=-100);assert.ok(verification.worstAcceptedCp>=-100);
   assert.ok(verification.materialCostCp>=75);
   for(const line of verification.rootCandidates)assert.equal(completeRootLine(line,beforeFen,18),true);
   // Replay every local material branch recorded as the evidence trace.
   for(const line of verification.acceptedLines){
    const replay=new Chess(afterFen);playUci(replay,line.captureUci);
    for(const [i,uci] of line.materialContinuation.entries()){
     playUci(replay,uci);assert.equal(replay.fen(),line.materialTrace[i].fen);
    }
   }
   // Full PGN and an explicit legal acceptance continuation are independently replayed.
   game.move(fixture.accept);const acceptedFen=game.fen();
   for(const san of fixture.continuation.split(' '))game.move(san);
   const recoveredCp=materialCp(game,move.color);
   if(fixture.id==='opera-queen')assert.equal(game.isCheckmate(),true);
   // Recognition must succeed; final eligibility still requires unambiguous
   // non-sacrificing alternative evidence, not merely the historical reputation.
   if(['opera-rook','fischer-exchange'].includes(fixture.id)){
    assert.equal(decision.eligible,false);assert.equal(verification.counterfactual.verified,false);
    assert.match(verification.counterfactual.reason,/persistent unrelated offer/);
   }else assert.equal(decision.eligible,true);
   assert.equal(AUTOMATIC_BRILLIANT_ENABLED,false);
   results.push({id:fixture.id,kind:'sound-piece-sacrifice',source:fixture.file,ply:fixture.ply,beforeFen,afterFen,move:move.san,acceptedFen,continuationFen:game.fen(),baselineMaterialCp:baseline,materialAfterContinuationCp:recoveredCp,verification,decision});
   console.log(JSON.stringify({id:fixture.id,piece:move.piece,beforeCp:verification.beforeCp,playedCp:verification.playedCp,gap:verification.deepCpGap,acceptedCp:verification.worstAcceptedCp,cost:verification.materialCostCp,eligible:decision.eligible,counterfactual:verification.counterfactual.reason}));
  });
  for(const fixture of additionalNegatives)await t.test(fixture.id,{timeout:180000},async()=>{
   const game=new Chess(fixture.fen);for(const san of (fixture.moves||'').split(' ').filter(Boolean))game.move(san);
   const beforeFen=game.fen(),root=await engine.evaluate(beforeFen,18),move=game.move(fixture.move),afterFen=game.fen();
   const verification=await verifyBrilliantCandidate({chess:game,beforeFen,move,evaluatePosition:engine.evaluate,depth:18});
   const decision=classifyBrilliantMove({baseGrade:'best',verification,rating:1500});
   assert.equal(decision.eligible,false);assert.equal(AUTOMATIC_BRILLIANT_ENABLED,false);
   if(fixture.id==='exposed-unmoved-rook-blunder'){
    assert.equal(verification.isSacrifice,true);assert.ok(verification.acceptedLines.some(line=>line.discovered && line.newlyExposed));
    assert.ok(!verification.qualityVerified || verification.deepCpGap>35 || verification.deepAfter < -100);
   }
   if(fixture.id==='defended-pawn-quiet-development')assert.equal(verification.isSacrifice,false);
   if(fixture.id==='already-won-queen-offer'){
    assert.equal(verification.isSacrifice,true);assert.equal(verification.qualityVerified,true);
    assert.equal(decision.counterfactualVerified,true);assert.equal(decision.alreadyCompletelyWinning,true);
   }
   if(fixture.id==='non-sacrificing-mate'){
    assert.equal(game.isCheckmate(),true);assert.equal(root.bestMove,'h5f7');assert.equal(root.mate,1);
    assert.equal(detectSacrificeCandidate(game,move),false);
   }
   if(fixture.accept){game.move(fixture.accept);for(const san of (fixture.continuation||'').split(' ').filter(Boolean))game.move(san);}
   results.push({id:fixture.id,kind:'negative',beforeFen,afterFen,move:move.san,root,verification,decision});
   console.log(JSON.stringify({id:fixture.id,eligible:decision.eligible,reason:decision.reason}));
  });
 }finally{engine.close();if(process.env.CHESS_RECOGNITION_REPORT)writeFileSync(process.env.CHESS_RECOGNITION_REPORT,JSON.stringify({depth:18,results},null,2)+'\n');}
});
