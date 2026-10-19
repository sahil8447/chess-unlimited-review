import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {readFileSync} from 'node:fs';
import {findMaterialOffers,inspectMaterialOffer} from '../src/sacrificeMaterial.js';
import {detectSacrificeCandidate} from '../src/tactics.js';
import {runReview} from '../src/reviewEngine.js';
function atPly(ply){const g=new Chess();g.loadPgn(readFileSync('test/games/rafael-ayden-2026.pgn','utf8'));while(g.history().length>ply)g.undo();const move=g.undo(),before=new Chess(g.fen());g.move(move);return {chess:g,before,move};}
test('4...g6 cannot claim causality for the pre-existing c5 pawn threat',()=>{
 const p=atPly(8),capture=findMaterialOffers(p.chess,p.move).find(m=>m.san==='Qxc5');assert.ok(capture);assert.equal(p.before.isCheck(),true);
 const offer=inspectMaterialOffer({...p,capture});assert.equal(offer.isSacrifice,false);assert.equal(detectSacrificeCandidate(p.chess,p.move),false);
 assert.equal(offer.causality.beforeCapturable,true);assert.equal(offer.causality.supported,false);
});
const engine=async(fen,depth,options={})=>{const g=new Chess(fen),moves=options.searchmoves||g.moves({verbose:true}).map(m=>m.from+m.to+(m.promotion||''));const candidates=moves.slice(0,options.multiPV||3).map((move,i)=>({rank:i+1,depth,move,pv:[move],scoreCp:-i*10,mate:null}));return {depth,score:0,mate:null,bestMove:candidates[0].move,pv:candidates[0].pv,candidates};};
test('initial snapshots have elapsed time and do not mutate after finalization',async()=>{
 let initial,captured;const report=await runReview('1. e4 e5 *',engine,{onInitial:r=>{initial=r;captured=JSON.stringify(r);}});
 assert.ok(initial.metrics.totalMs>0);assert.equal(JSON.stringify(initial),captured);
 assert.equal(initial.complete,false);assert.equal(report.complete,true);assert.ok(report.metrics.totalMs>=initial.metrics.totalMs);
});
test('optional audit snapshot is clearly verification-complete but not final',async()=>{
 const snapshots=[];const report=await runReview('1. e4 e5 *',engine,{audits:true,onInitial:r=>snapshots.push(r)});
 assert.equal(snapshots[0].lifecycle.state,'initial-ready');assert.equal(snapshots[1].lifecycle.state,'diagnostics-running');
 assert.equal(report.lifecycle.state,'complete');assert.equal(report.lifecycle.fullGameImported,false);assert.equal(report.lifecycle.finalAnalysisComplete,true);
});
test('an arbitrary quiet move cannot turn a pre-existing rook threat into a sacrifice',()=>{
 const chess=new Chess('6kb/8/8/8/8/8/4P3/R3K3 w Q - 0 1'),before=new Chess(chess.fen()),move=chess.move('e3');
 const capture=findMaterialOffers(chess,move).find(c=>c.to==='a1'),offer=inspectMaterialOffer({before,chess,move,capture});
 assert.equal(offer.causality.kind,'pre-existing-unrelated-threat');assert.equal(offer.isSacrifice,false);assert.equal(offer.causality.beforeCostCp,500);
});
test('legal before/after capture comparison recognizes an unpinning offer despite geometric attack',()=>{
 const chess=new Chess('4k3/4b3/8/8/1B6/8/8/4R1K1 w - - 0 1'),before=new Chess(chess.fen()),move=chess.move('Rd1');
 assert.equal(before.isAttacked('b4','b'),true);
 const capture=findMaterialOffers(chess,move).find(c=>c.to==='b4'),offer=inspectMaterialOffer({before,chess,move,capture});
 assert.equal(offer.causality.kind,'new-legal-offer');assert.equal(offer.newlyExposed,true);assert.equal(offer.isSacrifice,true);
});
test('a color-mirrored voluntary development gambit preserves causality without a named-move exception',()=>{
 const original=new Chess();for(const m of ['d4','Nf6','c4','e6','Nf3','d5'])original.move(m);
 const fields=original.fen().split(' ');fields[0]=fields[0].split('/').reverse().map(row=>row.replace(/[a-zA-Z]/g,c=>c===c.toLowerCase()?c.toUpperCase():c.toLowerCase())).join('/');fields[1]='b';fields[3]='-';
 const chess=new Chess(fields.join(' ')),before=new Chess(chess.fen()),move=chess.move('g6');
 const capture=findMaterialOffers(chess,move).find(c=>c.to==='c5'),offer=inspectMaterialOffer({before,chess,move,capture});
 assert.equal(offer.causality.kind,'maintained-development-gambit');assert.equal(offer.isSacrifice,true);assert.equal(offer.causality.beforeCapturable,true);
});
