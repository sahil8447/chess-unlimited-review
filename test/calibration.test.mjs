import {test} from 'node:test';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {Chess} from 'chess.js';
import {calibrationPositions} from './calibration-positions.mjs';
import {startStockfish} from './helpers/stockfish.mjs';
import {verifyBrilliantCandidate,materialBalance,scoreForMover,detectSacrificeCandidate} from '../src/tactics.js';
import {classifyBrilliantMove,AUTOMATIC_BRILLIANT_ENABLED} from '../src/brilliantRules.js';

test('depth-18 sacrifice calibration corpus',{timeout:900000},async t=>{
 const engine=await startStockfish(),results=[];
 const moverCp=(result,turn,mover)=>scoreForMover(result,turn,mover);
 try{for(const fixture of calibrationPositions)await t.test(fixture.id,{timeout:180000},async()=>{
  const game=new Chess(fixture.fen);
  for(const san of (fixture.moves||'').split(' ').filter(Boolean))game.move(san);
  const beforeFen=game.fen(),mover=game.turn(),baseline=materialBalance(game,mover);
  const move=game.move(fixture.move),afterFen=game.fen(),uci=move.from+move.to+(move.promotion||'');
  const root=await engine.evaluate(beforeFen,18),child=await engine.evaluate(afterFen,18);
  const verification=await verifyBrilliantCandidate({chess:game,beforeFen,move,evaluatePosition:engine.evaluate,depth:18});
  const decision=classifyBrilliantMove({baseGrade:'best',verification,rating:1500});
  let accepted,acceptanceFen,continuationFen,materialInvestment;
  if(fixture.accept){
   game.move(fixture.accept);acceptanceFen=game.fen();accepted=await engine.evaluate(acceptanceFen,18);
   for(const san of (fixture.continuation||'').split(' ').filter(Boolean))game.move(san);
   continuationFen=game.fen();materialInvestment=Math.round((baseline-materialBalance(game,mover))*100);
  }
  // An independent paired search diagnoses omitted/inferior moves even when
  // the detector never selects them. Both scores share root/depth/search.
  const pair=await engine.evaluate(beforeFen,18,{searchmoves:[...new Set([root.bestMove,uci])]});
  const best=pair.candidates.find(c=>c.rank===1),played=pair.candidates.find(c=>c.move===uci);
  assert.ok(played && !played.bound,'played move has complete root evidence');
  const pairedGap=best.scoreCp!=null && played.scoreCp!=null ? Math.max(0,best.scoreCp-played.scoreCp):null;
  const playedCp=moverCp(child,new Chess(afterFen).turn(),mover);
  const acceptedCp=accepted ? moverCp(accepted,new Chess(acceptanceFen).turn(),mover):null;
  const row={id:fixture.id,kind:fixture.kind,description:fixture.description,beforeFen,move:move.san,afterFen,acceptanceFen,continuationFen,
   rootCp:root.score,rootMate:root.mate,pairedCandidates:pair.candidates,pairedGap,playedCp,acceptedCp,materialInvestment,verification,decision};
  results.push(row);
  console.log(JSON.stringify({id:fixture.id,rootCp:root.score,pairedGap,playedCp,acceptedCp,materialInvestment,eligible:decision.eligible,reason:decision.reason}));
  if(fixture.kind==='sound'){
   assert.equal(root.mate,null,'not a forced win before the offer');assert.ok(root.score<450,'not already overwhelmingly winning');
   assert.ok(playedCp>=-100,'engine verifies sound play against best defense');
   assert.ok(acceptedCp>=-100,'engine verifies compensation if accepted');
   assert.ok(materialInvestment>=75,'legal continuation verifies a real material investment');
   assert.ok(pairedGap<=22,'same-root evidence establishes near-best play, not a proprietary label');
   assert.equal(detectSacrificeCandidate(new Chess(afterFen),move),true);
   assert.equal(verification.isSacrifice,true);
   assert.equal(decision.eligible,true,'all six sound near-best offers now recognized');
  }else{
   assert.equal(decision.eligible,false,'negative must never pass eligibility');
   if(fixture.id==='hung-queen'||fixture.id==='hung-rook')assert.ok(acceptedCp < -100,'uncompensated loss verified');
   if(fixture.id==='winning-rook-blunder'){
    assert.ok(root.score>=450 || root.mate>0,'winning initial position verified');
    assert.ok(pairedGap>35 || (best.mate>0 && (played.mate==null || played.mate>best.mate+1)),'inferiority verified in the same root search');
   }
  }
  assert.equal(AUTOMATIC_BRILLIANT_ENABLED,false);
 });}finally{
  engine.close();
  // Only the explicit reporting invocation writes a report. Normal tests do
  // not overwrite checked-in calibration evidence with a partial run.
  if(process.env.CHESS_CALIBRATION_REPORT)writeFileSync(process.env.CHESS_CALIBRATION_REPORT,JSON.stringify({depth:18,results},null,2)+'\n');
 }
});
