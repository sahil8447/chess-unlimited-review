import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Chess} from 'chess.js';
import {analyzeCounterfactual} from '../src/tactics.js';
import {uciOf} from '../src/sacrificeMaterial.js';
const line=(move,rank,scoreCp,patch={})=>({move,rank,scoreCp,depth:18,pv:[move],mate:null,...patch});
function rxd7(){const g=new Chess();g.loadPgn(readFileSync('test/rxd7.pgn','utf8'));const move=g.undo();return {before:g,move,depth:18,root:{depth:18,bestMove:'d1d7',scoreCp:1003,candidates:[line('d1d7',1,1003),line('g7f7',2,169)]},evaluatePosition:async()=>{throw Error('Unneeded search');}};}
test('large root evaluation from the sacrifice does not prove an already-won alternative',async()=>{
 const result=await analyzeCounterfactual(rxd7());assert.equal(result.verified,true);assert.equal(result.alreadyCompletelyWinning,false);
 assert.equal(result.bestNonSacrificingMove,'g7f7');assert.equal(result.bestNonSacrificingCp,169);assert.equal(result.allAlternativesCovered,true);
});
test('a strong non-sacrificing alternative preserves already-winning rejection',async()=>{
 const args=rxd7();args.root.candidates[1].scoreCp=950;
 const result=await analyzeCounterfactual(args);assert.equal(result.verified,true);assert.equal(result.alreadyCompletelyWinning,true);
});
for(const kind of ['missing','wrong depth','bound','illegal PV'])test(`counterfactual rejects ${kind} alternative evidence`,async()=>{
 const args=rxd7();
 if(kind==='missing')args.root.candidates.pop();
 if(kind==='wrong depth')args.root.candidates[1].depth=17;
 if(kind==='bound')args.root.candidates[1].bound=true;
 if(kind==='illegal PV')args.root.candidates[1].pv.push('a1a8');
 const result=await analyzeCounterfactual(args);assert.equal(result.verified,false);assert.equal(result.alreadyCompletelyWinning,null);
});
test('sacrificial alternatives are excluded only with sound evidence and complete remaining pools',async()=>{
 const before=new Chess('5r1k/6pp/4Q2N/8/8/8/8/6K1 w - - 0 1');
 const copy=new Chess(before.fen()),move=copy.move('Qd5');let roots=0;
 const root={depth:18,bestMove:'e6d5',scoreCp:1200,candidates:[line('e6d5',1,1200),line('e6g8',2,1000)]};
 const evaluatePosition=async(fen,depth,options)=>{
  if(fen!==before.fen())return {depth,score:1000};
  roots++;assert.equal(options.multiPV,1);
  assert.deepEqual(options.searchmoves,before.moves({verbose:true}).map(uciOf).filter(uci=>!['e6d5','e6g8'].includes(uci)));
  return {depth,score:100,bestMove:'e6e8',candidates:[line('e6e8',1,100)]};
 };
 const result=await analyzeCounterfactual({before,move,root,depth:18,evaluatePosition});
 assert.equal(result.verified,true);assert.equal(result.alreadyCompletelyWinning,false);
 assert.deepEqual(result.excludedSacrifices,['e6g8']);assert.equal(roots,1);assert.equal(result.alternativeUpperBoundCp,100);
});
test('persistent unrelated offers cannot silently remove winning alternatives',async()=>{
 const before=new Chess();before.loadPgn(readFileSync('test/games/morphy-opera.pgn','utf8'));while(before.history().length>24)before.undo();
 const copy=new Chess(before.fen()),move=copy.move('Rxd7');let roots=0;
 const root={depth:18,bestMove:'d1d7',scoreCp:703,candidates:[line('d1d7',1,703),line('d1d5',2,543)]};
 const evaluatePosition=async(fen,depth,options)=>{
  if(fen!==before.fen())return {depth,score:600};
  roots++;assert.equal(options.multiPV,1);
  return {depth,score:495,bestMove:'d1d3',candidates:[line('d1d3',1,495)]};
 };
 const result=await analyzeCounterfactual({before,move,root,depth:18,evaluatePosition});
 assert.equal(result.verified,false);assert.match(result.reason,/persistent unrelated offer/);assert.equal(roots,1);
});
test('counterfactual exclusion budget fails closed instead of assuming unique winning play',async()=>{
 const before=new Chess('5r1k/6pp/4Q2N/8/8/8/8/6K1 w - - 0 1'),copy=new Chess(before.fen()),move=copy.move('Qd5');
 const root={depth:18,bestMove:'e6d5',scoreCp:1200,candidates:[line('e6d5',1,1200),line('e6g8',2,1000)]};
 let roots=0;
 const evaluatePosition=async(fen,depth)=>{
  if(fen!==before.fen())return {depth,score:1000};
  const uci=++roots===1 ? 'e6e8' : 'e6f7';return {depth,score:900,bestMove:uci,candidates:[line(uci,1,900)]};
 };
 const result=await analyzeCounterfactual({before,move,root,depth:18,evaluatePosition});
 assert.equal(result.verified,false);assert.match(result.reason,/budget exceeded/);assert.equal(roots,2);
});
