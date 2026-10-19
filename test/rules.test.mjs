import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {classifyBrilliantMove, AUTOMATIC_BRILLIANT_ENABLED} from '../src/brilliantRules.js';
import {detectSacrificeCandidate,verifyBrilliantCandidate,scoreForMover} from '../src/tactics.js';
const counterfactual={verified:true,alreadyCompletelyWinning:false,depth:18,allAlternativesCovered:true};
const base={counterfactual,verified:true,isSacrifice:true,sacrificeType:'material',qualityVerified:true,
 beforeCp:30,playedCp:24,deepCpGap:6,deepAfter:24,worstAcceptedCp:10,analysisDepth:18};
const run=(v=base,rating=1037,baseGrade='best')=>classifyBrilliantMove({baseGrade,verification:v,rating});
test('sound near-best sacrifice remains diagnostic',()=>{assert.equal(run().eligible,true);assert.equal(AUTOMATIC_BRILLIANT_ENABLED,false);assert.equal(run().grade,'best');});
for(const [label,patch] of Object.entries({hung:{playedCp:-500,deepAfter:-500},inferior:{deepCpGap:100},winning:{beforeCp:1259,counterfactual:{...counterfactual,alreadyCompletelyWinning:true}},exchange:{isSacrifice:false},missing:{qualityVerified:false},incomplete:{playedCp:null},unsound:{worstAcceptedCp:-300}}))
 test(`reject ${label}`,()=>assert.equal(run({...base,...patch}).eligible,false));
test('rating cannot rescue inferior move',()=>assert.equal(run({...base,deepCpGap:60},700).eligible,false));
test('deep evidence may resolve shallow inaccuracy without awarding badge',()=>{const r=run(base,1037,'inaccuracy');assert.equal(r.eligible,true);assert.equal(r.grade,'inaccuracy');});
test('winning alternatives enforce winning restriction',()=>assert.equal(run({...base,beforeCp:500,counterfactual:{...counterfactual,alreadyCompletelyWinning:true},rootCandidates:[{move:'d8d2',depth:18,scoreCp:480}]}).eligible,false));
test('ordinary pawn capture is not an offer',()=>{const c=new Chess();c.move('e4');c.move('d5');const m=c.move('exd5');assert.equal(detectSacrificeCandidate(c,m),false);});
test('equal exchange cannot pass material gate',async()=>{const c=new Chess('4k3/8/8/8/8/8/r7/R3K3 w Q - 0 1');const m=c.move('Rxa2');assert.equal(detectSacrificeCandidate(c,m),false);});
test('black root score uses mover perspective; child score is inverted',async()=>{
 const c=new Chess('3rk3/8/8/8/8/8/8/3QK3 b - - 0 1');const beforeFen=c.fen();const move=c.move('Rd2');
 const root={bestMove:'d8d2',score:30,depth:18,candidates:[{rank:1,depth:18,move:'d8d2',pv:['d8d2'],scoreCp:30,mate:null}]};
 const v=await verifyBrilliantCandidate({chess:c,beforeFen,move,depth:18,evaluatePosition:async fen=>fen===beforeFen?root:{score:-24,depth:18}});
 assert.equal(v.verified,true);
 assert.equal(v.beforeCp,30); assert.equal(v.playedCp,30); assert.equal(v.deepAfter,24); assert.equal(v.deepCpGap,0);
});

test('centipawn and mate score perspectives',()=>{
 assert.equal(scoreForMover({score:80},'b','w'),-80);
 assert.equal(scoreForMover({score:80},'b','b'),80);
 assert.equal(scoreForMover({mate:3},'w','w'),10000);
 assert.equal(scoreForMover({mate:-3},'b','b'),-10000);
 assert.equal(scoreForMover({},'w','w'),null);
});
test('engine failure rejects candidate',async()=>{
 const c=new Chess('3rk3/8/8/8/8/8/8/3QK3 b - - 0 1');const beforeFen=c.fen(),move=c.move('Rd2');
 const v=await verifyBrilliantCandidate({chess:c,beforeFen,move,evaluatePosition:async()=>{throw new Error('worker unavailable');}});
 assert.equal(v.verified,false);assert.match(v.reason,/worker unavailable/);
});
for(const kind of ['missing PV','unstable depth','bound score']) test(`reject ${kind}`,async()=>{
 const c=new Chess('3rk3/8/8/8/8/8/8/3QK3 b - - 0 1');const beforeFen=c.fen(),move=c.move('Rd2');
 const candidate={rank:1,depth:18,move:'d8d2',pv:['d8d2'],scoreCp:30};
 if(kind==='missing PV') candidate.pv=[];
 if(kind==='unstable depth') candidate.depth=17;
 if(kind==='bound score') candidate.bound=true;
 const v=await verifyBrilliantCandidate({chess:c,beforeFen,move,evaluatePosition:async()=>({score:30,depth:18,bestMove:'d8d2',candidates:[candidate]})});
 assert.equal(v.qualityVerified,false);assert.equal(run(v).eligible,false);
});

test('paired fallback compares both new root scores without mixing old baseline',async()=>{
 const c=new Chess('3rk3/8/8/8/8/8/8/3QK3 b - - 0 1'),beforeFen=c.fen(),move=c.move('Rd2');
 const requests=[];
 const line=(move,rank,score)=>({move,rank,scoreCp:score,depth:18,pv:[move]});
 const evaluatePosition=async(fen,depth,options)=>{
  requests.push({fen,depth,options});
  if(fen!==beforeFen)return {score:-5,depth:18};
  if(!options)return {score:200,depth:18,bestMove:'d8d7',candidates:[line('d8d7',1,200)]};
  assert.deepEqual(options.searchmoves,['d8d7','d8d2']);
  return {score:20,depth:18,bestMove:'d8d7',candidates:[line('d8d7',1,20),line('d8d2',2,5)]};
 };
 const v=await verifyBrilliantCandidate({chess:c,beforeFen,move,evaluatePosition});
 assert.equal(v.qualityVerified,true);assert.equal(v.deepCpGap,15);assert.equal(v.beforeCp,20);
 assert.equal(v.unrestrictedBeforeCp,200);
 assert.equal(requests.filter(r=>r.options).length,1);
});
test('paired fallback cannot erase a full-root already-winning advantage',()=>{
 const v={...base,beforeCp:30,unrestrictedBeforeCp:1000,unrestrictedCandidates:[],counterfactual:{...counterfactual,alreadyCompletelyWinning:true}};
 assert.equal(run(v).eligible,false);assert.equal(run(v).alreadyCompletelyWinning,true);
});

test('missing counterfactual evidence fails closed even for a sound best sacrifice',()=>{
 const result=run({...base,counterfactual:undefined});
 assert.equal(result.eligible,false);assert.equal(result.alreadyCompletelyWinning,null);
 assert.match(result.reason,/Incomplete counterfactual/);
});
test('wrong-depth or partial alternative evidence fails closed',()=>{
 for(const patch of [{depth:17},{allAlternativesCovered:false}])
  assert.equal(run({...base,counterfactual:{...counterfactual,...patch}}).eligible,false);
});
test('unique winning evaluation does not replace material and soundness requirements',()=>{
 const unique={...counterfactual,alternativeUpperBoundCp:0};
 assert.equal(run({...base,beforeCp:10000,playedCp:10000,deepCpGap:0,isSacrifice:false,counterfactual:unique}).eligible,false);
 assert.equal(run({...base,beforeCp:10000,playedCp:10000,deepCpGap:0,worstAcceptedCp:-500,counterfactual:unique}).eligible,false);
});
test('engine error flags cannot be masked by plausible-looking scores',async()=>{
 const c=new Chess('3rk3/8/8/8/8/8/8/3QK3 b - - 0 1'),beforeFen=c.fen(),move=c.move('Rd2');
 const v=await verifyBrilliantCandidate({chess:c,beforeFen,move,evaluatePosition:async()=>({success:false,error:'engine reset',depth:18,score:30,bestMove:'d8d2',candidates:[]})});
 assert.equal(v.verified,false);assert.match(v.reason,/engine reset/);
});
