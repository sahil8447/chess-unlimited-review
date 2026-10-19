import {readFileSync,writeFileSync} from 'node:fs';
import {Chess} from 'chess.js';
import {startTransport} from './engine-transport.mjs';
import {verifyBrilliantCandidate as oldVerify} from '../test/helpers/v11/tactics.js';
import {verifyBrilliantCandidate} from '../src/tactics.js';
import {classifyBrilliantMove} from '../src/brilliantRules.js';
const game=new Chess();game.loadPgn(readFileSync('test/games/rafael-ayden-2026.pgn','utf8'));const history=game.history({verbose:true});
const engine=startTransport(),evidence={source:'Reproduced from the previously supplied PGN; browser JSON attachment has not been received',g6:{},tail:[]};
try{
 const move=history[7],chess=new Chess(move.after);
 const before=await oldVerify({beforeFen:move.before,chess,move,evaluatePosition:engine.evaluate,depth:18});
 const start=engine.metrics.searches;
 const after=await verifyBrilliantCandidate({beforeFen:move.before,chess,move,evaluatePosition:engine.evaluate,depth:18});
 evidence.g6={before,oldDecision:classifyBrilliantMove({baseGrade:'best',verification:before,rating:1101}),after,newDecision:classifyBrilliantMove({baseGrade:'best',verification:after,rating:1101}),newSearches:engine.metrics.searches-start};
 for(const move of history.slice(-4)){
  const position=new Chess(move.before),root=await engine.evaluate(move.before,18,{multiPV:3});
  let played=root.candidates.find(c=>c.move===move.from+move.to);
  if(!played){const pair=await engine.evaluate(move.before,18,{searchmoves:[root.bestMove,move.from+move.to],multiPV:2});played=pair.candidates.find(c=>c.move===move.from+move.to);}
  const deeper=await engine.evaluate(move.before,20,{multiPV:1});
  evidence.tail.push({number:position.moveNumber(),color:move.color,san:move.san,beforeFen:move.before,afterFen:move.after,legalChoices:position.moves().length,root,played,deeper});
 }
 writeFileSync('test/evidence/v12/engine-probes.json',JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify({g6:[evidence.g6.oldDecision.eligible,evidence.g6.newDecision.eligible],tail:evidence.tail.map(r=>({move:r.san,choices:r.legalChoices,best:r.root.bestMove,rootMate:r.root.mate,playedMate:r.played.mate,deeperMate:r.deeper.mate}))}));
}finally{engine.close();}
