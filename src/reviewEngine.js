import {Chess} from 'chess.js';
import {classifyMove,classifyTacticalMove,calculateAlternativeLoss,calculateAccuracy,calculateMoveAccuracy,winChance} from './grading.js';
import {detectMissedOpportunity} from './missDetection.js';
import {detectSacrificeCandidate,verifyBrilliantCandidate} from './tactics.js';
import {classifyBrilliantMove} from './brilliantRules.js';
import {generateMoveExplanation} from './moveExplanation.js';
import {estimatePerformance} from './performanceRating.js';
import {terminalEvaluation,whiteScore,rootQuality,validatePrimary} from './reviewEvidence.js';
import {lookupBook} from './openingBook.js';
import {uciOf} from './sacrificeMaterial.js';

export const REVIEW_LIMITS=Object.freeze({baseDepth:12,criticalDepth:18,maxCritical:12,maxGreat:4,maxReplyChecks:4,maxAudits:4,maxPlies:2000});
const now=()=>globalThis.performance.now();
const yieldPage=()=>new Promise(resolve=>setTimeout(resolve,0));

// Shared by the actual extension and CLI; no DOM, network or Chrome dependency.
export async function runReview(pgn,evaluatePosition,{signal,onProgress=()=>{},onInitial=()=>{},book=true,audits=false,baseDepth=12,criticalDepth=18}={}) {
  if(!Number.isInteger(baseDepth)||baseDepth<8||baseDepth>18||!Number.isInteger(criticalDepth)||criticalDepth<baseDepth||criticalDepth>20)throw Error('Unsupported review depths');
  const started=now(),game=new Chess();game.loadPgn(pgn);
  const moves=game.history({verbose:true}),headers=game.header();
  if(!moves.length)throw Error('No moves found');
  if(moves.length>REVIEW_LIMITS.maxPlies)throw Error('Game exceeds supported review limit');
  const positions=[new Chess(moves[0].before),...moves.map(m=>new Chess(m.after))];
  const historyReplay=new Chess(moves[0].before),terminals=[terminalEvaluation(historyReplay)];
  for(const [i,move] of moves.entries()){historyReplay.move(move.san);terminals.push(historyReplay.isThreefoldRepetition() && !(i===moves.length-1 && headers.Result==='1/2-1/2') ? terminalEvaluation(new Chess(historyReplay.fen())) : terminalEvaluation(historyReplay));}
  const metrics={requests:0,localCacheHits:0,transportCacheHits:0,engineMs:0,initializationMs:0,requestMs:0,baseMs:0,criticalMs:0,brilliantMs:0,missMs:0,classificationMs:0,initialMs:0,totalMs:0,criticalMoves:0,greatVerifications:0,replyChecks:0,audits:0,errors:[]};
  const cache=new Map();
  const active=()=>signal?.throwIfAborted();
  const evaluate=async(fen,depth,options={})=>{
    active();const key=JSON.stringify([fen,depth,options.searchmoves||[],options.multiPV??3]);
    if(cache.has(key)){metrics.localCacheHits++;return cache.get(key);}
    const start=now();metrics.requests++;
    try{
      const promise=Promise.resolve(evaluatePosition(fen,depth,options));
      cache.set(key,promise);
      const value=await promise;active();if(value.cacheHit)metrics.transportCacheHits++;else{metrics.engineMs+=value.engineMs||0;metrics.initializationMs+=value.initializationMs||0;}return value;}
    catch(error){cache.delete(key);throw error;}
    finally{metrics.requestMs+=now()-start;}
  };
  const evaluations=[],quality=new Map(),deepRoots=new Map();
  let phaseStart=now();
  for(let i=0;i<positions.length;i++){
    active();const position=positions[i];
    const result=terminals[i]||await evaluate(position.fen(),baseDepth,{multiPV:1});
    evaluations.push(terminals[i] || validatePrimary(result,position.fen(),baseDepth));
    onProgress({stage:'Evaluating positions',done:i+1,total:positions.length});
  }
  metrics.baseMs=now()-phaseStart;
  function assemble(final){
    const graphData=evaluations.map((e,i)=>({ply:i,whiteCp:whiteScore(e,positions[i].turn())}));
    const reviewedMoves=moves.map((move,i)=>{
      const before=evaluations[i],after=evaluations[i+1],beforeFen=move.before;
      const sign=move.color==='w'?1:-1;
      const positionBeforeCp=sign*graphData[i].whiteCp,positionAfterCp=sign*graphData[i+1].whiteCp;
      const root=deepRoots.get(i)||before;
      const coherent=quality.get(i)||rootQuality(before,move,baseDepth);
      const beforePlayerCp=coherent?.beforeCp??positionBeforeCp,afterPlayerCp=coherent?.afterCp??positionAfterCp;
      const bestMovePlayed=root.bestMove===uciOf(move);
      const classification=classifyMove({beforeCp:beforePlayerCp,afterCp:afterPlayerCp,bestMovePlayed});
      const initialGrade=classifyMove({beforeCp:positionBeforeCp,afterCp:positionAfterCp,bestMovePlayed:before.bestMove===uciOf(move)}).grade;
      const alternativeLoss=coherent?.source==='same-root' && root.depth>=Math.max(18,criticalDepth) ? calculateAlternativeLoss(root.candidates) : null;
      let grade=classifyTacticalMove({baseGrade:classification.grade,bestMovePlayed,beforeCp:beforePlayerCp,afterCp:afterPlayerCp,alternativeLoss});
      const missStart=now();
      const miss=final && ['inaccuracy','mistake','blunder'].includes(grade) ? detectMissedOpportunity({beforeFen,bestVariation:root.pv,bestMovePlayed,beforePlayerCp,afterPlayerCp,color:move.color,evidence:{root,quality:coherent,minDepth:criticalDepth}}) : null;
      metrics.missMs+=now()-missStart;
      if(miss)grade='miss';
      const opening=!headers.FEN ? lookupBook(beforeFen,uciOf(move)) : null;
      // Book is presentation metadata; it cannot erase an engine-detected error.
      if(book && opening && ['best','excellent','good'].includes(grade))grade='book';
      const previous=moves[i-1];
      return {number:Number(beforeFen.split(' ')[5]),color:move.color,san:move.san,uci:uciOf(move),beforeFen,afterFen:move.after,
        legalChoices:positions[i].moves().length,obviousRecapture:Boolean(move.captured&&previous?.captured&&previous.to===move.to),
        initialGrade,grade,loss:classification.loss,cpLoss:Math.max(0,beforePlayerCp-afterPlayerCp),beforePlayerCp,afterPlayerCp,
        positionBeforeCp,positionAfterCp,positionBeforeWhiteCp:graphData[i].whiteCp,positionAfterWhiteCp:graphData[i+1].whiteCp,
        accuracyContribution:calculateMoveAccuracy(beforePlayerCp,afterPlayerCp),qualitySource:coherent?.source||'adjacent-position estimate',
        depth:coherent?.depth||before.depth||0,afterDepth:after.depth||0,deepVerified:Boolean(quality.get(i)),
        bestMove:root.bestMove,bestMovePlayed,bestVariation:root.pv||[],evaluation:graphData[i+1].whiteCp/100,
        bestMate:coherent?.bestMate??null,playedMate:coherent?.playedMate??null,
        book:opening||null,alternativeLoss,missDiagnostic:miss||null,brilliantDiagnostic:audits?'Pending optional audit':'Optional diagnostic audit not requested',
        explanation:grade==='book' ? `Recorded in the local Lichess opening book (source line ${opening.eco}). Accuracy still uses the engine evaluation.` : miss?.explanation || generateMoveExplanation({move,grade,beforeFen,afterFen:move.after,bestMove:root.bestMove,bestMovePlayed,beforePlayerCp,afterPlayerCp})};
    });
    return {pgn,headers,reviewedMoves,graphData,whiteAccuracy:calculateAccuracy(reviewedMoves,'w'),blackAccuracy:calculateAccuracy(reviewedMoves,'b'),
      performance:Object.fromEntries(['w','b'].map(color=>[color,estimatePerformance({moves:reviewedMoves,color,headers,complete:final && metrics.errors.length===0,customStart:Boolean(headers.FEN)})])),metrics};
  }
  phaseStart=now();let initial=assemble(false);metrics.classificationMs+=now()-phaseStart;
  active();metrics.initialMs=now()-started;await onInitial(initial);active();
  // Select by practical win-chance change, not huge irrelevant cp swings in decided positions.
  const critical=moves.map((move,i)=>{
    const row=initial.reviewedMoves[i];
    return {i,loss:Math.max(0,winChance(row.positionBeforeCp)-winChance(row.positionAfterCp))};
  }).filter(({loss})=>loss>=.04).sort((a,b)=>b.loss-a.loss).slice(0,REVIEW_LIMITS.maxCritical);
  const greatCandidates=initial.reviewedMoves.map((row,i)=>({row,i})).filter(({row,i})=>
    row.bestMovePlayed && !row.book && Math.abs(row.positionBeforeCp)<300 && row.positionAfterCp>-100 && row.legalChoices>1 && !critical.some(item=>item.i===i)
  ).slice(0,REVIEW_LIMITS.maxGreat).map(({i})=>({i,great:true}));
  const verifications=[...critical,...greatCandidates];
  phaseStart=now();
  for(const {i,great} of verifications){
    active();const move=moves[i];
    try{
      const root=validatePrimary(await evaluate(move.before,criticalDepth,{multiPV:2}),move.before,criticalDepth);
      deepRoots.set(i,root);
      let comparison=rootQuality(root,move,criticalDepth);
      if(!comparison){
        const pair=await evaluate(move.before,criticalDepth,{searchmoves:[root.bestMove,uciOf(move)],multiPV:2});
        comparison=rootQuality(pair,move,criticalDepth);
      }
      if(!comparison)throw Error('Played move lacks complete equal-depth root evidence');
      quality.set(i,comparison);metrics.criticalMoves++;if(great)metrics.greatVerifications++;
    }catch(error){active();deepRoots.delete(i);metrics.errors.push({ply:i+1,stage:'critical',message:error.message});}
    onProgress({stage:'Reviewing critical moves',done:quality.size,total:verifications.length});
    await yieldPage();
  }
  // A deep played line can expose a shallow "best reply" that disagrees with
  // its own continuation. Verify those adjacent moves selectively, never copy
  // a depth-(N-1) PV score into a depth-N root comparison.
  const replyCandidates=[...quality.entries()].filter(([i,q])=>
    i+1<moves.length && !quality.has(i+1) && q.playedPV?.[1] &&
    q.playedPV[1]!==evaluations[i+1].bestMove && evaluations[i+1].bestMove===uciOf(moves[i+1])
  ).slice(0,REVIEW_LIMITS.maxReplyChecks).map(([i])=>i+1);
  for(const i of replyCandidates){
    active();const move=moves[i];
    try{
      const root=validatePrimary(await evaluate(move.before,criticalDepth,{multiPV:2}),move.before,criticalDepth);
      let comparison=rootQuality(root,move,criticalDepth);
      if(!comparison)comparison=rootQuality(await evaluate(move.before,criticalDepth,{searchmoves:[root.bestMove,uciOf(move)],multiPV:2}),move,criticalDepth);
      if(!comparison)throw Error('Reply lacks complete equal-depth root evidence');
      deepRoots.set(i,root);quality.set(i,comparison);metrics.replyChecks++;metrics.criticalMoves++;
    }catch(error){active();metrics.errors.push({ply:i+1,stage:'reply consistency',message:error.message});}
    onProgress({stage:'Checking search consistency',done:metrics.replyChecks,total:replyCandidates.length});await yieldPage();
  }
  metrics.criticalMs=now()-phaseStart;
  phaseStart=now();let report=assemble(true);metrics.classificationMs+=now()-phaseStart;
  // Useful classified review is available before explicitly requested slow diagnostics.
  if(audits){active();await onInitial(report);active();}
  phaseStart=now();
  if(audits)for(let i=0;i<moves.length;i++){
    active();const row=report.reviewedMoves[i],move=moves[i];
    if(metrics.audits>=REVIEW_LIMITS.maxAudits){row.brilliantDiagnostic='Optional audit budget exhausted';continue;}
    if(row.afterPlayerCp < -100 || row.loss>.04 || positions[i+1].isGameOver()) {row.brilliantDiagnostic='Conservative soundness/quality precheck failed';continue;}
    if(!detectSacrificeCandidate(positions[i+1],move)){row.brilliantDiagnostic='No bounded material offer';continue;}
    metrics.audits++;
    try{
      const verification=await verifyBrilliantCandidate({chess:positions[i+1],beforeFen:move.before,move,evaluatePosition:evaluate,depth:criticalDepth});active();
      const decision=classifyBrilliantMove({baseGrade:row.grade,verification,rating:Number(headers[move.color==='w'?'WhiteElo':'BlackElo'])||null});
      row.brilliantDiagnostic=decision.reason;row.brilliantEvidence={verification,decision};
    }catch(error){active();row.brilliantDiagnostic=error.message;}
    onProgress({stage:'Optional Brilliant diagnostics',done:metrics.audits,total:REVIEW_LIMITS.maxAudits});await yieldPage();
  }
  metrics.brilliantMs=now()-phaseStart;active();metrics.totalMs=now()-started;
  metrics.engineSearches=metrics.requests-metrics.transportCacheHits;metrics.cacheHitRate=(metrics.transportCacheHits+metrics.localCacheHits)/Math.max(1,metrics.requests+metrics.localCacheHits);
  onProgress({stage:'Review complete',done:moves.length,total:moves.length});
  return report;
}
