import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Chess} from 'chess.js';
import {runReview} from '../src/reviewEngine.js';
import {rootQuality} from '../src/reviewEvidence.js';
import {lookupBook} from '../src/openingBook.js';
import {calculateAccuracy,calculateAccuracyDetails} from '../src/grading.js';
import {detectMissedOpportunity} from '../src/missDetection.js';
const uci=m=>m.from+m.to+(m.promotion||'');
const engine=async(fen,depth,options={})=>{
 const g=new Chess(fen),legal=g.moves({verbose:true}).map(uci),pool=options.searchmoves||legal;
 const lines=pool.slice(0,options.multiPV||3).map((move,i)=>({rank:i+1,depth,move,pv:[move],scoreCp:-i*20,mate:null}));
 return {depth,bestMove:lines[0].move,score:0,mate:null,pv:lines[0].pv,candidates:lines};
};
test('supplied game is 42 legal plies, matches final FEN and ends in mate',()=>{
 const g=new Chess();g.loadPgn(readFileSync('test/games/rafael-ayden-2026.pgn','utf8'));
 assert.equal(g.history().length,42);assert.equal(g.fen(),g.header().CurrentPosition);assert.equal(g.isCheckmate(),true);
});
test('Book requires exact sourced position/move and does not guess beyond coverage',()=>{
 const g=new Chess();assert.ok(lookupBook(g.fen(),'e2e4'));assert.equal(lookupBook(g.fen(),'e2e5'),null);
 g.move('e4');g.move('c5');assert.ok(lookupBook(g.fen(),'f1c4'));
 const custom=new Chess('7k/8/8/8/8/8/p7/7K b - - 0 23');assert.equal(lookupBook(custom.fen(),'a2a1q'),null);
});
test('same-root evidence prevents best move horizon drift from causing a loss',()=>{
 const g=new Chess(),move=g.move('e4');const root={depth:18,bestMove:'e2e4',candidates:[{depth:18,rank:1,move:'e2e4',pv:['e2e4'],scoreCp:80,mate:null}]};
 const q=rootQuality(root,move,18);assert.equal(q.beforeCp,q.afterCp);assert.equal(rootQuality({...root,depth:17},move,18),null);
 assert.equal(rootQuality({...root,candidates:[{...root.candidates[0],bound:true}]},move,18),null);
});
for(const pgn of ['1. f3 e5 2. g4 Qh4# 0-1','1. Nf3 Nf6 2. Ng1 Ng8 3. Nf3 Nf6 4. Ng1 Ng8 1/2-1/2','1. e4 e5 2. Nf3 Nc6 *','[SetUp "1"]\n[FEN "7k/8/8/8/8/8/p7/7K b - - 0 23"]\n\n23... a1=Q+ *'])test(`pipeline retains counts, bounds and deterministic grades: ${pgn.slice(0,25)}`,async()=>{
 const a=await runReview(pgn,engine),b=await runReview(pgn,engine);const g=new Chess();g.loadPgn(pgn);
 assert.equal(a.reviewedMoves.length,g.history().length);assert.equal(a.graphData.length,g.history().length+1);
 assert.deepEqual(a.reviewedMoves,b.reviewedMoves);for(const n of [a.whiteAccuracy,a.blackAccuracy])assert.ok(n===null||(n>=0&&n<=100));
 assert.ok(a.reviewedMoves.every(m=>m.grade && m.grade!=='brilliant'));assert.equal(a.metrics.audits,0);
});
test('optional book presentation does not change accuracy contributions',async()=>{
 const a=await runReview('1. e4 c5 2. Bc4 *',engine),b=await runReview('1. e4 c5 2. Bc4 *',engine,{book:false});
 assert.equal(a.whiteAccuracy,b.whiteAccuracy);assert.equal(a.blackAccuracy,b.blackAccuracy);assert.equal(a.reviewedMoves[0].grade,'book');
});
test('initial review arrives before deep verification; cancel prevents subsequent jobs',async()=>{
 const signal=new AbortController();let requests=0,initial=false;
 await assert.rejects(runReview('1. e4 e5 *',async(...args)=>{requests++;return engine(...args);},{signal:signal.signal,onInitial:()=>{initial=true;signal.abort();}}),{name:'AbortError'});
 assert.equal(initial,true);assert.equal(requests,3);
});
test('bound/partial base evidence is rejected rather than published as accurate',async()=>{
 await assert.rejects(runReview('1. e4 *',async(...args)=>({...await engine(...args),candidates:[]})),/Incomplete/);
});
test('accuracy exposes all contributions, weights and harmonic aggregation',()=>{
 const moves=[{color:'w',beforePlayerCp:0,afterPlayerCp:-300},{color:'b',beforePlayerCp:300,afterPlayerCp:300}];
 const details=calculateAccuracyDetails(moves,'w');assert.equal(details.value,calculateAccuracy(moves,'w'));assert.equal(details.contributions.length,1);assert.ok(details.harmonicMean<100);
});
const missArgs=(fen,pv)=>({beforeFen:fen,bestVariation:pv,bestMovePlayed:false,beforePlayerCp:500,afterPlayerCp:0,color:'w',evidence:{root:{depth:18,bestMove:pv[0],pv,candidates:[{rank:1,depth:18,move:pv[0],pv,scoreCp:500,mate:null}]},quality:{source:'same-root',depth:18,beforeCp:500,afterCp:0}}});
test('Miss preserves a settled queen-winning tactic and fails closed on missing evidence',()=>{
 const args=missArgs('4k3/8/8/8/8/8/q7/R3K3 w Q - 0 1',['a1a2','e8e7','a2a7']);
 assert.equal(detectMissedOpportunity(args).grade,'miss');assert.equal(detectMissedOpportunity({...args,evidence:null}),null);
 assert.equal(detectMissedOpportunity({...args,beforePlayerCp:-500,afterPlayerCp:-900}),null);
});
test('Miss rejects a temporary bishop gain at a truncated recapture boundary',()=>{
 const args=missArgs('4k3/8/8/8/br6/8/8/R3K3 w Q - 0 1',['e1f1','e8f8','a1a4']);
 assert.equal(detectMissedOpportunity(args),null);
});
test('Miss rejects a quiet one-pawn PV swing, shallow roots and illegal distant tails',()=>{
 const args=missArgs('4k3/8/8/8/8/8/p7/R3K3 w Q - 0 1',['a1a2','e8e7','a2a7']);assert.equal(detectMissedOpportunity(args),null);
 const real=missArgs('4k3/8/8/8/8/8/q7/R3K3 w Q - 0 1',['a1a2','e8e7','a2a7']);real.evidence.root.depth=12;assert.equal(detectMissedOpportunity(real),null);
});

test('equal-depth paired evidence excludes old baseline scores',()=>{
 const g=new Chess(),move=g.move('e4');const candidates=[{rank:1,depth:18,move:'d2d4',pv:['d2d4'],scoreCp:20},{rank:2,depth:18,move:'e2e4',pv:['e2e4'],scoreCp:5}];
 const q=rootQuality({depth:18,bestMove:'d2d4',score:500,candidates},move,18);assert.equal(q.beforeCp,20);assert.equal(q.afterCp,5);
});
test('repetition terminal uses game history and is not searched as an ongoing position',async()=>{
 const report=await runReview('1. Nf3 Nf6 2. Ng1 Ng8 3. Nf3 Nf6 4. Ng1 Ng8 1/2-1/2',engine);
 assert.equal(report.graphData.at(-1).whiteCp,0);assert.equal(report.reviewedMoves.at(-1).afterDepth,0);
});
test('Miss rejects material that disappears later in the legal PV after a quiet threat',()=>{
 const args=missArgs('1r2k3/8/8/8/b7/8/8/R3K3 w Q - 0 1',['e1f1','e8f8','a1a4','b8b4','f1g1','b4a4']);
 assert.equal(detectMissedOpportunity(args),null);
});
test('failed critical searches retain labeled estimates and cannot promote tactical grades',async()=>{
 const unreliable=async(fen,depth,options)=>{
  if(depth>=18)throw Error('depth evidence unavailable');
  const result=await engine(fen,depth,options),game=new Chess(fen),score=game.turn()==='b'?300:0;
  return {...result,score,candidates:result.candidates.map(line=>({...line,scoreCp:score}))};
 };
 const report=await runReview('1. e4 e5 1-0',unreliable,{book:false});assert.ok(report.metrics.errors.length>0);
 assert.ok(report.reviewedMoves.every(m=>!['great','miss','brilliant'].includes(m.grade)));
 assert.equal(report.performance.w.rating,null);assert.equal(report.performance.w.reason,'Analysis incomplete');
});
test('a remote terminal flag cannot bypass base evidence validation',async()=>{
 await assert.rejects(runReview('1. e4 *',async()=>({terminal:true,score:0,depth:12,candidates:[]})),/Incomplete/);
});
test('accuracy retains color symmetry with separate actual-position volatility evidence',()=>{
 const moves=[{color:'w',beforePlayerCp:0,afterPlayerCp:-100,positionBeforeWhiteCp:0,positionAfterWhiteCp:-100},{color:'b',beforePlayerCp:100,afterPlayerCp:50,positionBeforeWhiteCp:-100,positionAfterWhiteCp:-50}];
 const mirror=moves.map(m=>({...m,color:m.color==='w'?'b':'w',positionBeforeWhiteCp:-m.positionBeforeWhiteCp,positionAfterWhiteCp:-m.positionAfterWhiteCp}));assert.equal(calculateAccuracy(moves,'w'),calculateAccuracy(mirror,'b'));
});
test('supported alternative depths are explicit and cannot create shallow Miss/Great',async()=>{
 const requested=[];const report=await runReview('1. f3 e5 2. g4 Qh4# 0-1',async(...args)=>{requested.push(args[1]);return engine(...args);},{baseDepth:10,criticalDepth:14,book:false});
 assert.ok(requested.every(depth=>depth===10||depth===14));assert.ok(report.reviewedMoves.every(m=>!['great','miss','brilliant'].includes(m.grade)));
 await assert.rejects(runReview('1. e4 *',engine,{baseDepth:4}),/Unsupported/);
});
test('deep PV reply disagreement triggers bounded same-depth verification of shallow Best',async()=>{
 const start=new Chess().fen(),g=new Chess();g.move('e4');const afterE4=g.fen();g.move('e5');const afterE5=g.fen();
 const line=(move,rank,depth,cp,pv=[move])=>({move,rank,depth,scoreCp:cp,mate:null,pv});
 const evaluator=async(fen,depth)=>{
  let lines;
  if(fen===start)lines=depth===12?[line('d2d4',1,depth,0)]:[line('d2d4',1,depth,0),line('e2e4',2,depth,-300,['e2e4','c7c5'])];
  else if(fen===afterE4)lines=depth===12?[line('e7e5',1,depth,300)]:[line('c7c5',1,depth,300),line('e7e5',2,depth,250)];
  else if(fen===afterE5)lines=[line('g1f3',1,depth,-300)];
  else throw Error('Unexpected position');
  return {depth,bestMove:lines[0].move,score:lines[0].scoreCp,pv:lines[0].pv,candidates:lines};
 };
 const report=await runReview('1. e4 e5 *',evaluator,{book:false});assert.equal(report.metrics.replyChecks,1);assert.equal(report.reviewedMoves[1].depth,18);assert.notEqual(report.reviewedMoves[1].grade,'best');
});
