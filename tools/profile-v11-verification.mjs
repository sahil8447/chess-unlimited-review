import {readFileSync,writeFileSync} from 'node:fs';
import {Chess} from 'chess.js';
import {runReview} from '../test/helpers/v11/reviewEngine.js';
import {winChance} from '../test/helpers/v11/grading.js';
import {startTransport} from './engine-transport.mjs';
const game=new Chess();game.loadPgn(readFileSync('test/games/rafael-ayden-2026.pgn','utf8'));const history=game.history({verbose:true}),calls=[];
const engine=startTransport({source:'test/helpers/v11/offscreen.txt'});
try{
 const report=await runReview(game.pgn(),async(fen,depth,options={})=>{const start=performance.now(),result=await engine.evaluate(fen,depth,options);calls.push({ply:history.findIndex(m=>m.before===fen)+1,fen,depth,options,cacheHit:result.cacheHit,elapsedMs:performance.now()-start,engineMs:result.engineMs,bestMove:result.bestMove});return result;});
 const rows=report.reviewedMoves;
 const critical=rows.map((r,i)=>({i,loss:Math.max(0,winChance(r.positionBeforeCp)-winChance(r.positionAfterCp))})).filter(r=>r.loss>=.04).sort((a,b)=>b.loss-a.loss).slice(0,12).map(r=>r.i);
 const baseBest=new Map(calls.filter(c=>c.depth===12).map(c=>[c.ply,c.bestMove]));
 const great=rows.map((r,i)=>({r,i})).filter(({r,i})=>baseBest.get(i+1)===r.uci&&!r.book&&Math.abs(r.positionBeforeCp)<300&&r.positionAfterCp>-100&&r.legalChoices>1&&!critical.includes(i)).slice(0,4).map(r=>r.i);
 const plan=rows.flatMap((row,i)=>!row.deepVerified?[]:[{ply:i+1,san:row.san,color:row.color,reason:critical.includes(i)?'practical-loss':great.includes(i)?'great-candidate':'reply-conflict',requests:calls.filter(c=>c.depth===18&&c.ply===i+1).length,calls:calls.filter(c=>c.depth===18&&c.ply===i+1),grade:row.grade}]);
 writeFileSync('test/evidence/v12/before-verification-plan.json',JSON.stringify({source:'Actual V1.1 frozen pipeline reproduction; not the missing browser export',criticalMoves:plan.length,transport:engine.metrics,plan},null,2)+'\n');console.log(JSON.stringify({criticalMoves:plan.length,searches:engine.metrics.searches,requestsByPly:plan.map(r=>({ply:r.ply,san:r.san,reason:r.reason,requests:r.requests}))}));
}finally{engine.close();}
