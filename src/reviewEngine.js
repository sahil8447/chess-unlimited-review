import {Chess} from 'chess.js';
import {classifyMove,classifyTacticalMove,calculateAlternativeLoss,calculateAccuracy,calculateReviewedMoveAccuracy,winChance} from './grading.js';
import {detectMissedOpportunity} from './missDetection.js';
import {detectSacrificeCandidate,verifyBrilliantCandidate} from './tactics.js';
import {classifyBrilliantMove} from './brilliantRules.js';
import {generateMoveExplanation} from './moveExplanation.js';
import {estimatePerformance} from './performanceRating.js';
import {terminalEvaluation,whiteScore,rootQuality,validatePrimary} from './reviewEvidence.js';
import {lookupBook} from './openingBook.js';
import {normalizeEvaluation,evaluationCp,evaluationChance,evaluationLoss} from './evaluation.js';
import {snapshotReview} from './reviewSnapshot.js';
import {uciOf} from './sacrificeMaterial.js';

export const REVIEW_LIMITS=Object.freeze({baseDepth:12,criticalDepth:18,maxCritical:12,maxGreat:4,maxReplyChecks:4,maxMateChecks:4,maxAudits:4,maxPlies:2000});
const now=()=>globalThis.performance.now();
const yieldPage=()=>new Promise(resolve=>setTimeout(resolve,0));

// Shared by the actual extension and CLI; no DOM, network or Chrome dependency.
export async function runReview(pgn,evaluatePosition,{signal,onProgress=()=>{},onInitial=()=>{},onUpdate,onState=()=>{},book=true,audits=false,baseDepth=12,criticalDepth=18,detailed=false}={}) {
  if(!Number.isInteger(baseDepth)||baseDepth<8||baseDepth>18||!Number.isInteger(criticalDepth)||criticalDepth<baseDepth||criticalDepth>20)throw Error('Unsupported review depths');
  const started=now(),game=new Chess();game.loadPgn(pgn);
  const moves=game.history({verbose:true}),headers=game.header();
  if(!moves.length)throw Error('No moves found');
  if(moves.length>REVIEW_LIMITS.maxPlies)throw Error('Game exceeds supported review limit');
  const positions=[new Chess(moves[0].before),...moves.map(m=>new Chess(m.after))];
  const historyReplay=new Chess(moves[0].before),terminals=[terminalEvaluation(historyReplay)];
  for(const [i,move] of moves.entries()){historyReplay.move(move.san);terminals.push(historyReplay.isThreefoldRepetition() && !(i===moves.length-1 && headers.Result==='1/2-1/2') ? terminalEvaluation(new Chess(historyReplay.fen())) : terminalEvaluation(historyReplay));}
  const metrics={requests:0,localCacheHits:0,transportCacheHits:0,engineMs:0,initializationMs:0,requestMs:0,baseMs:0,criticalMs:0,brilliantMs:0,missMs:0,classificationMs:0,initialMs:0,totalMs:0,criticalMoves:0,greatVerifications:0,replyChecks:0,audits:0,errors:[]};
  const cache=new Map(),searchLog=[],verifications=[];
  let workContext={stage:"base",ply:null},latestReport=null;
  const active=()=>signal?.throwIfAborted();
  const evaluate=async(fen,depth,options={})=>{
    active();const key=JSON.stringify([fen,depth,options.searchmoves||[],options.multiPV??3]);
    if(cache.has(key)){metrics.localCacheHits++;return cache.get(key);}
    const start=now();metrics.requests++;
    const request={id:metrics.requests,...workContext,fen,depth,multiPV:options.multiPV??3,searchmoves:options.searchmoves||[],status:'running'};searchLog.push(request);
    try{
      const promise=Promise.resolve(evaluatePosition(fen,depth,options));
      cache.set(key,promise);
      const value=await promise;active();Object.assign(request,{status:"complete",cacheHit:value.cacheHit??null,engineMs:value.cacheHit?0:value.engineMs??null});if(value.cacheHit)metrics.transportCacheHits++;else{metrics.engineMs+=value.engineMs||0;metrics.initializationMs+=value.initializationMs||0;}return value;}
    catch(error){request.status="failed";request.error=error.message;cache.delete(key);throw error;}
    finally{request.elapsedMs=now()-start;metrics.requestMs+=request.elapsedMs;}
  };
  try {
  const evaluations=[],quality=new Map(),deepRoots=new Map();
  let phaseStart=now();
  for(let i=0;i<positions.length;i++){
    active();const position=positions[i];workContext={stage:"base",ply:i};
    const result=terminals[i]||await evaluate(position.fen(),baseDepth,{multiPV:1});
    evaluations.push(terminals[i] || validatePrimary(result,position.fen(),baseDepth));
    onProgress({stage:'Evaluating positions',done:i+1,total:positions.length});
  }
  metrics.baseMs=now()-phaseStart;
  function assemble(final){
    const graphData=evaluations.map((e,i)=>{const evaluation=normalizeEvaluation(e,{turn:positions[i].turn(),pov:'w',terminal:Boolean(terminals[i])});return {ply:i,whiteCp:evaluationCp(evaluation),evaluation};});
    const reviewedMoves=moves.map((move,i)=>{
      const before=evaluations[i],after=evaluations[i+1],beforeFen=move.before;
      const sign=move.color==='w'?1:-1;
      const positionBeforeEvaluation=graphData[i].evaluation,positionAfterEvaluation=graphData[i+1].evaluation;
      const baseBefore=normalizeEvaluation(before,{turn:positions[i].turn(),pov:move.color,terminal:Boolean(terminals[i])});
      const baseAfter=normalizeEvaluation(after,{turn:positions[i+1].turn(),pov:move.color,terminal:Boolean(terminals[i+1])});
      const positionBeforeCp=evaluationCp(baseBefore),positionAfterCp=evaluationCp(baseAfter);
      const root=deepRoots.get(i)||before;
      const coherent=quality.get(i)||rootQuality(before,move,baseDepth);
      const beforeEvaluation=coherent?.beforeEvaluation??baseBefore,afterEvaluation=terminals[i+1]?baseAfter:coherent?.afterEvaluation??baseAfter;
      const beforePlayerCp=evaluationCp(beforeEvaluation),afterPlayerCp=evaluationCp(afterEvaluation);
      const bestMovePlayed=root.bestMove===uciOf(move),legalChoices=positions[i].moves().length;
      const previous=moves[i-1],obviousRecapture=Boolean(move.captured&&previous?.captured&&previous.to===move.to);
      const classification=classifyMove({beforeCp:beforePlayerCp,afterCp:afterPlayerCp,beforeEvaluation,afterEvaluation,bestMovePlayed,qualityVerified:quality.has(i),legalChoices});
      const initialGrade=classifyMove({beforeCp:positionBeforeCp,afterCp:positionAfterCp,beforeEvaluation:baseBefore,afterEvaluation:baseAfter,bestMovePlayed:before.bestMove===uciOf(move),legalChoices}).grade;
      const alternativeLoss=coherent?.source==='same-root' && root.depth>=Math.max(18,criticalDepth) ? calculateAlternativeLoss(root.candidates) : null;
      let grade=legalChoices===1 || obviousRecapture ? classification.grade : classifyTacticalMove({baseGrade:classification.grade,bestMovePlayed,beforeCp:beforePlayerCp,afterCp:afterPlayerCp,alternativeLoss});
      const missStart=now();
      const miss=final && ['inaccuracy','mistake','blunder'].includes(grade) ? detectMissedOpportunity({beforeFen,bestVariation:root.pv,bestMovePlayed,beforePlayerCp,afterPlayerCp,color:move.color,evidence:{root,quality:coherent,minDepth:criticalDepth}}) : null;
      metrics.missMs+=now()-missStart;
      if(miss)grade='miss';
      const opening=!headers.FEN ? lookupBook(beforeFen,uciOf(move)) : null;
      // Book is presentation metadata; it cannot erase an engine-detected error.
      if(book && opening && ['best','excellent','good'].includes(grade))grade='book';
      return {number:Number(beforeFen.split(' ')[5]),color:move.color,san:move.san,uci:uciOf(move),beforeFen,afterFen:move.after,
        legalChoices,obviousRecapture,
        initialGrade,grade,loss:classification.loss,cpLoss:beforeEvaluation.kind==='cp' && afterEvaluation.kind==='cp'?Math.max(0,beforePlayerCp-afterPlayerCp):null,beforePlayerCp,afterPlayerCp,beforeEvaluation,afterEvaluation,mateEvidence:classification.mateEvidence??null,
        positionBeforeEvaluation,positionAfterEvaluation,positionBeforeCp,positionAfterCp,positionBeforeWhiteCp:graphData[i].whiteCp,positionAfterWhiteCp:graphData[i+1].whiteCp,
        accuracyContribution:calculateReviewedMoveAccuracy({beforeEvaluation,afterEvaluation}),qualitySource:coherent?.source||'adjacent-position estimate',qualityEvidence:coherent??null,
        depth:coherent?.depth||before.depth||0,afterDepth:after.depth||0,deepVerified:Boolean(quality.get(i)),
        bestMove:root.bestMove,bestMovePlayed,bestVariation:root.pv||[],evaluation:graphData[i+1].whiteCp===null?null:graphData[i+1].whiteCp/100,
        bestMate:coherent?.bestMate??null,playedMate:coherent?.playedMate??null,
        book:opening||null,alternativeLoss,missDiagnostic:miss||null,brilliantDiagnostic:audits?'Pending optional audit':'Optional diagnostic audit not requested',
        explanation:grade==='book' ? `Recorded in the local Lichess opening book (source line ${opening.eco}). Accuracy still uses the engine evaluation.` : miss?.explanation || generateMoveExplanation({move,grade,beforeFen,afterFen:move.after,bestMove:root.bestMove,bestMovePlayed,beforePlayerCp,afterPlayerCp,beforeEvaluation,afterEvaluation,mateEvidence:classification.mateEvidence})};
    });
    return {pgn,headers,scorePerspectives:{quality:'mover',position:'white',engine:'side-to-move'},options:{book,audits,baseDepth,criticalDepth,detailed},searchLog,verifications,reviewedMoves,graphData,whiteAccuracy:calculateAccuracy(reviewedMoves,'w'),blackAccuracy:calculateAccuracy(reviewedMoves,'b'),
      performance:Object.fromEntries(['w','b'].map(color=>[color,estimatePerformance({moves:reviewedMoves,color,headers,complete:final && metrics.errors.length===0,customStart:Boolean(headers.FEN)})])),metrics};
  }
  phaseStart=now();let initial=assemble(false);metrics.classificationMs+=now()-phaseStart;
  active();metrics.initialMs=now()-started;
  const updateCounters=()=>{metrics.engineSearches=searchLog.filter(r=>r.status==='complete' && r.cacheHit===false).length;metrics.unknownRequestCount=searchLog.filter(r=>typeof r.cacheHit!=='boolean').length;metrics.cacheHitRate=(metrics.transportCacheHits+metrics.localCacheHits)/Math.max(1,metrics.requests+metrics.localCacheHits);};
  const publish=async(report,state,callback)=>{updateCounters();metrics.totalMs=now()-started;latestReport=snapshotReview(report,{state,elapsedMs:metrics.totalMs});if(callback)await callback(latestReport);active();};
  await publish(initial,'initial-ready',onInitial);
  const progressive=async()=>{if(onUpdate){const start=now(),update=assemble(false);metrics.classificationMs+=now()-start;metrics.criticalMs=now()-phaseStart;await publish(update,'critical-running',onUpdate);}};
  // Select by practical win-chance change, not huge irrelevant cp swings in decided positions.
  const critical=moves.map((move,i)=>{
    const row=initial.reviewedMoves[i];
    return {i,reason:'practical-loss',loss:evaluationLoss(normalizeEvaluation(evaluations[i],{turn:positions[i].turn(),pov:move.color,terminal:Boolean(terminals[i])}),normalizeEvaluation(evaluations[i+1],{turn:positions[i+1].turn(),pov:move.color,terminal:Boolean(terminals[i+1])}))??0};
  }).filter(({loss})=>loss>=.04).sort((a,b)=>b.loss-a.loss).slice(0,detailed?REVIEW_LIMITS.maxCritical*2:REVIEW_LIMITS.maxCritical);
  const greatCandidates=initial.reviewedMoves.map((row,i)=>({row,i})).filter(({row,i})=>
    row.bestMovePlayed && !row.obviousRecapture && !row.book && Math.abs(row.positionBeforeCp)<300 && row.positionAfterCp>-100 && row.legalChoices>1 && !critical.some(item=>item.i===i)
  ).slice(0,REVIEW_LIMITS.maxGreat).map(({i})=>({i,great:true,reason:'great-candidate'}));
  const mateCandidates=initial.reviewedMoves.map((row,i)=>({row,i})).filter(({row,i})=>
    row.legalChoices>1 && row.beforeEvaluation.kind!==row.afterEvaluation.kind &&
    (row.beforeEvaluation.kind==='mate'||row.afterEvaluation.kind==='mate') && !terminals[i+1] && !critical.some(item=>item.i===i) && !greatCandidates.some(item=>item.i===i)
  ).slice(0,REVIEW_LIMITS.maxMateChecks).map(({i})=>({i,reason:'mate-transition'}));
  const verificationsToRun=[...mateCandidates,...critical,...greatCandidates];
  phaseStart=now();
  for(const {i,great,reason} of verificationsToRun){
    active();const move=moves[i];workContext={stage:reason||'reply-conflict',ply:i+1};
    const task={ply:i+1,san:move.san,uci:uciOf(move),reason:reason||'reply-conflict',status:'running',startRequest:metrics.requests};verifications.push(task);
    try{
      const root=validatePrimary(await evaluate(move.before,criticalDepth,{multiPV:great || detailed || reason==='mate-transition'?2:1}),move.before,criticalDepth);
      deepRoots.set(i,root);
      let comparison=rootQuality(root,move,criticalDepth);
      if(!comparison){
        const pair=await evaluate(move.before,criticalDepth,{searchmoves:[root.bestMove,uciOf(move)],multiPV:2});
        comparison=rootQuality(pair,move,criticalDepth);
      }
      if(!comparison)throw Error('Played move lacks complete equal-depth root evidence');
      quality.set(i,comparison);metrics.criticalMoves++;if(great)metrics.greatVerifications++;task.status="verified";task.beforeEvaluation=comparison.beforeEvaluation;task.afterEvaluation=comparison.afterEvaluation;
    }catch(error){active();deepRoots.delete(i);task.status="failed";task.error=error.message;metrics.errors.push({ply:i+1,stage:'critical',message:error.message});}
    task.requests=metrics.requests-task.startRequest;
    onProgress({stage:'Reviewing critical moves',done:verifications.length,total:verificationsToRun.length});
    if(onUpdate && verifications.length%3===0)await progressive();
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
    active();const move=moves[i];workContext={stage:'reply-conflict',ply:i+1};
    const task={ply:i+1,san:move.san,uci:uciOf(move),reason:'reply-conflict',status:'running',startRequest:metrics.requests};verifications.push(task);
    try{
      const root=validatePrimary(await evaluate(move.before,criticalDepth,{multiPV:2}),move.before,criticalDepth);
      let comparison=rootQuality(root,move,criticalDepth);
      if(!comparison)comparison=rootQuality(await evaluate(move.before,criticalDepth,{searchmoves:[root.bestMove,uciOf(move)],multiPV:2}),move,criticalDepth);
      if(!comparison)throw Error('Reply lacks complete equal-depth root evidence');
      deepRoots.set(i,root);quality.set(i,comparison);metrics.replyChecks++;metrics.criticalMoves++;task.status="verified";task.beforeEvaluation=comparison.beforeEvaluation;task.afterEvaluation=comparison.afterEvaluation;
    }catch(error){active();task.status='failed';task.error=error.message;metrics.errors.push({ply:i+1,stage:'reply consistency',message:error.message});}
    task.requests=metrics.requests-task.startRequest;
    onProgress({stage:'Checking search consistency',done:metrics.replyChecks,total:replyCandidates.length});await yieldPage();
  }
  metrics.criticalMs=now()-phaseStart;
  phaseStart=now();let report=assemble(true);metrics.classificationMs+=now()-phaseStart;
  // Useful classified review is available before explicitly requested slow diagnostics.
  if(audits)await publish(report,'diagnostics-running',onInitial);
  phaseStart=now();
  if(audits)for(let i=0;i<moves.length;i++){
    active();const row=report.reviewedMoves[i],move=moves[i];workContext={stage:"brilliant",ply:i+1};
    if(metrics.audits>=REVIEW_LIMITS.maxAudits){row.brilliantDiagnostic='Optional audit budget exhausted';continue;}
    if(evaluationChance(row.afterEvaluation)<evaluationChance({kind:'cp',cp:-100}) || row.loss>.04 || positions[i+1].isGameOver()) {row.brilliantDiagnostic='Conservative soundness/quality precheck failed';continue;}
    if(!detectSacrificeCandidate(positions[i+1],move)){row.brilliantDiagnostic='No bounded material offer';continue;}
    metrics.audits++;
    try{
      const verification=await verifyBrilliantCandidate({chess:positions[i+1],beforeFen:move.before,move,evaluatePosition:evaluate,depth:criticalDepth});active();
      const decision=classifyBrilliantMove({baseGrade:row.grade,verification,rating:Number(headers[move.color==='w'?'WhiteElo':'BlackElo'])||null});
      row.brilliantDiagnostic=decision.reason;row.brilliantEvidence={verification,decision};
    }catch(error){active();row.brilliantDiagnostic=error.message;metrics.errors.push({ply:i+1,stage:'brilliant',message:error.message});}
    onProgress({stage:'Optional Brilliant diagnostics',done:metrics.audits,total:REVIEW_LIMITS.maxAudits});await yieldPage();
  }
  metrics.brilliantMs=now()-phaseStart;active();metrics.totalMs=now()-started;
  onProgress({stage:'Review complete',done:moves.length,total:moves.length});
  await publish(report,metrics.errors.length?'partial':'complete');
  onState(latestReport);
  return latestReport;
  }catch(error){
    metrics.totalMs=now()-started;
    const fallback=latestReport||{pgn,headers,reviewedMoves:[],graphData:[],metrics};
    const failed=snapshotReview({...fallback,metrics},{state:signal?.aborted || error.name==='AbortError'?'canceled':'failed',elapsedMs:metrics.totalMs});
    try{onState(failed);}catch{}
    throw error;
  }
}
