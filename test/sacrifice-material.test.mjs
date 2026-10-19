import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {calibrationPositions} from './calibration-positions.mjs';
import {findMaterialOffers,inspectMaterialOffer,playUci,materialCp,MATERIAL_LIMITS} from '../src/sacrificeMaterial.js';
import {detectSacrificeCandidate} from '../src/tactics.js';
function position(id){const fixture=calibrationPositions.find(f=>f.id===id),chess=new Chess(fixture.fen);for(const san of (fixture.moves||'').split(' ').filter(Boolean))chess.move(san);const before=new Chess(chess.fen()),move=chess.move(fixture.move);return {chess,before,move};}
test('Catalan offers a different pawn while developing',()=>{
 const p=position('catalan-pawn-offer');assert.equal(p.move.to,'g3');assert.equal(detectSacrificeCandidate(p.chess,p.move),true);
 const offers=findMaterialOffers(p.chess,p.move).map(capture=>inspectMaterialOffer({...p,capture}));
 const pawn=offers.find(line=>line.offeredSquare==='c4');assert.ok(pawn);assert.equal(pawn.offeredPiece,'p');
 assert.equal(pawn.discovered,true);assert.equal(pawn.newlyExposed,false);assert.equal(pawn.materialCostCp,100);
});
test('Marshall traces delayed investment through legal exchange moves',()=>{
 const p=position('marshall-attack');const capture=findMaterialOffers(p.chess,p.move).find(c=>c.san==='exd5');
 const line=inspectMaterialOffer({...p,capture});assert.equal(line.immediateCostCp,0);assert.equal(line.delayedCostCp,100);
 assert.equal(line.materialTraceComplete,true);assert.ok(line.materialContinuation.length>=4);
 const replay=new Chess(p.chess.fen());playUci(replay,line.captureUci);
 for(const [i,uci] of line.materialContinuation.entries()){
  playUci(replay,uci);assert.equal(replay.fen(),line.materialTrace[i].fen);assert.equal(materialCp(replay,p.move.color),line.materialTrace[i].materialCp);
 }
 assert.ok(line.exchangeNodes<=MATERIAL_LIMITS.maxExchangeNodes);
 assert.ok(line.materialContinuation.length<=MATERIAL_LIMITS.maxExchangePlies);
});
test('defended unit and normal equal captures are not sacrifices merely because attacked',()=>{
 for(const id of ['ordinary-exchange','ordinary-pawn-capture']){
  const p=position(id);assert.equal(findMaterialOffers(p.chess,p.move).length,0);assert.equal(detectSacrificeCandidate(p.chess,p.move),false);
 }
 // Black can Bxf2+, but White simply recaptures the bishop without an investment.
 const p=position('evans-gambit'),capture=findMaterialOffers(p.chess,p.move).find(c=>c.san==='Bxf2+');
 assert.ok(capture);const line=inspectMaterialOffer({...p,capture});assert.equal(line.isSacrifice,false);
});
test('legally exposed unmoved rook is detected but still requires an engine audit',()=>{
 const diagonal=new Chess('6kb/8/8/8/8/8/1B6/R3K3 w Q - 0 1');
 const before=new Chess(diagonal.fen()),move=diagonal.move('Ba3');
 const capture=findMaterialOffers(diagonal,move).find(c=>c.to==='a1');assert.ok(capture);
 const line=inspectMaterialOffer({before,chess:diagonal,move,capture});
 assert.equal(line.discovered,true);assert.equal(line.newlyExposed,true);assert.equal(line.isSacrifice,true);
 assert.equal(line.materialCostCp,500);
});
test('defended-piece noise does not exhaust the unchanged 12-audit game budget',async()=>{
 const {readFileSync}=await import('node:fs');
 const game=new Chess();game.loadPgn(readFileSync('test/rxd7.pgn','utf8'));
 const replay=new Chess(),candidates=[];
 for(const san of game.history()){
  const move=replay.move(san);if(detectSacrificeCandidate(replay,move))candidates.push(move.san);
 }
 assert.ok(candidates.length<=12);assert.equal(candidates.at(-1),'Rxd7+');
});
