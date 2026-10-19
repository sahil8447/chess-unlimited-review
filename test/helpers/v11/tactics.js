import { Chess } from 'chess.js';
import {findMaterialOffers,inspectMaterialOffer,MATERIAL_LIMITS,materialBalance,playUci,uciOf} from './sacrificeMaterial.js';
export {materialBalance};

export function detectSacrificeCandidate(chess,move) {
  try {
    const before=new Chess(move.before),offers=findMaterialOffers(chess,move);
    if(offers.length>MATERIAL_LIMITS.maxCaptures)return false;
    return offers.some(capture=>inspectMaterialOffer({before,chess,move,capture}).isSacrifice);
  } catch { return false; }
}
export function scoreForMover(e,turn,mover) {
  if (!e) return null;
  let cp;
  if (Number.isFinite(e.mate) && e.mate!==0) cp=e.mate>0 ? 10000 : -10000;
  else if (Number.isFinite(e.score)) cp=e.score;
  else return null;
  return turn===mover ? cp : -cp;
}
async function engineScore(chess,mover,engine,depth) {
  if(chess.isCheckmate())return chess.turn()===mover ? -10000 : 10000;
  if(chess.isGameOver())return 0;
  const result=await engine(chess.fen(),depth);
  if(result?.success===false || result?.error)throw new Error(result.error || 'Engine rejected search');
  return result?.depth===depth ? scoreForMover(result,chess.turn(),mover) : null;
}
async function rootEvaluation(chess,mover,engine,depth,options) {
  const result=await engine(chess.fen(),depth,options);
  if(result?.success===false || result?.error)throw new Error(result.error || 'Engine rejected search');
  return {scoreCp:scoreForMover(result,chess.turn(),mover),bestMove:result?.bestMove || null,
    depth:result?.depth,candidates:result?.candidates || []};
}
export function completeRootLine(line,fen,depth) {
  if (!line || line.depth!==depth || line.bound || !Number.isInteger(line.rank) || line.rank<1 ||
      (line.mate!=null && (!Number.isFinite(line.mate) || line.mate===0 || line.scoreCp!=null)) ||
      (!Number.isFinite(line.scoreCp) && !(Number.isFinite(line.mate) && line.mate!==0)) ||
      !Array.isArray(line.pv) || !line.pv.length || line.pv.length>128 || line.pv[0]!==line.move) return false;
  try {const position=new Chess(fen);for(const uci of line.pv)playUci(position,uci);return true;}catch{return false;}
}
const lineScore=line=>scoreForMover({score:line.scoreCp,mate:line.mate},'w','w');

async function auditCaptureResponses({before,chess,move,evaluatePosition,depth}) {
  const captures=findMaterialOffers(chess,move,before.fen());
  if(!captures.length)return {verified:true,isSacrifice:false,reason:'No legal net material offer',acceptedLines:[],materialCostCp:0,offeredCaptureCount:0};
  if(captures.length>MATERIAL_LIMITS.maxCaptures)return {verified:false,reason:'Capture audit budget exceeded'};
  const acceptedLines=[];
  for(const capture of captures) {
    const evidence=inspectMaterialOffer({before,chess,move,capture});
    const taken=new Chess(chess.fen());playUci(taken,uciOf(capture));
    const score=await engineScore(taken,move.color,evaluatePosition,depth);
    if(!Number.isFinite(score))return {verified:false,reason:'Capture evaluation missing'};
    acceptedLines.push({...evidence,scoreCp:score,approximateMaterialCostCp:evidence.materialCostCp});
  }
  const materialCostCp=Math.max(...acceptedLines.map(line=>line.materialCostCp));
  const primaryOffer=acceptedLines.filter(line=>line.isSacrifice).sort((a,b)=>
    b.materialCostCp-a.materialCostCp || Number(a.discovered)-Number(b.discovered))[0];
  const delayed=primaryOffer?.immediateCostCp<75 && primaryOffer?.delayedCostCp>=75;
  const forcingCompensation=acceptedLines.some(line=>line.forcingCompensation);
  return {verified:true,reason:'Audited legal offers and bounded material continuations',acceptedLines,
    isSacrifice:acceptedLines.some(line=>line.isSacrifice),materialCostCp,
    sacrificeType:primaryOffer?.forcingCompensation ? 'forcing-temporary' : primaryOffer?.discovered ? 'discovered-material' : delayed ? 'delayed-material' : materialCostCp>=75 ? 'material' : 'equal-exchange',
    materialTraceComplete:acceptedLines.every(line=>line.materialTraceComplete),
    opponentCanGainMaterial:materialCostCp>=75,forcingCompensation,
    worstAcceptedCp:Math.min(...acceptedLines.map(line=>line.scoreCp)),offeredCaptureCount:acceptedLines.length};
}

// Find an upper bound on ALL non-sacrificing alternatives, not just the few
// displayed PVs. An unrestricted root's next ranked line bounds every lower
// alternative. If it is itself a VERIFIED sound sacrifice, exclude it and
// search the entire remaining legal pool, never an arbitrarily chosen sample.
// Alternative scores are absolute same-depth root evidence, not a cp gap
// against a score from another search. Quality still uses ONE root MultiPV.
export async function analyzeCounterfactual({before,move,root,evaluatePosition,depth}) {
  const fail=reason=>({verified:false,alreadyCompletelyWinning:null,reason,depth,examined,excludedSacrifices:excluded,allAlternativesCovered:false});
  const examined=[],excluded=[];
  const playedUci=uciOf(move),fen=before.fen();
  let remaining=before.moves({verbose:true}).map(uciOf).filter(uci=>uci!==playedUci);
  const finish=(winning,reason,line=null,nonSacrificing=false)=>({verified:true,alreadyCompletelyWinning:winning,reason,depth,
    allAlternativesCovered:true,alternativeUpperBoundCp:line ? lineScore(line) : null,
    bestNonSacrificingMove:nonSacrificing ? line.move : null,
    bestNonSacrificingCp:nonSacrificing ? lineScore(line) : null,examined,excludedSacrifices:excluded});
  if(!remaining.length)return finish(false,'No other legal move; all other eligibility gates still apply');
  const primary=root.candidates.find(line=>line.rank===1);
  if(root.depth!==depth || primary?.move!==root.bestMove || !completeRootLine(primary,fen,depth))return fail('Incomplete unrestricted root evidence');
  const rank=primary.move===playedUci ? 2 : 1;
  let alternative=root.candidates.find(line=>line.rank===rank);
  if(!completeRootLine(alternative,fen,depth))return fail('Missing same-depth best-alternative PV');
  // At most two sacrificial alternatives are excluded. Budget exhaustion is
  // unknown (ineligible), never evidence that a move is uniquely winning.
  for(let iteration=0;iteration<=2;iteration++) {
    if(!alternative || !remaining.includes(alternative.move) || !completeRootLine(alternative,fen,depth))return fail('Incomplete remaining-alternative search');
    const cp=lineScore(alternative),position=new Chess(fen),altMove=playUci(position,alternative.move);
    const offers=findMaterialOffers(position,altMove,fen);
    const entry={move:alternative.move,cp,mate:alternative.mate ?? null,depth};examined.push(entry);
    if(cp<450) {
      entry.nonSacrificing=offers.length===0;
      return finish(false,'All remaining alternatives fall below the decisive threshold',alternative,entry.nonSacrificing);
    }
    if(!offers.length) {
      entry.nonSacrificing=true;
      return finish(true,'A non-sacrificing alternative already maintains a decisive advantage',alternative,true);
    }
    if(iteration===2)return fail('Counterfactual sacrifice-exclusion budget exceeded');
    const audit=await auditCaptureResponses({before,chess:position,move:altMove,evaluatePosition,depth});
    if(!audit.verified || !audit.materialTraceComplete)return fail('Alternative material evidence incomplete or budget exhausted');
    if(!audit.isSacrifice) {
      entry.nonSacrificing=true;
      return finish(true,'An alternative recovers its material and maintains a decisive advantage',alternative,true);
    }
    if(audit.worstAcceptedCp < -100)return fail('Alternative sacrifice soundness is inconsistent; cannot exclude it');
    // A persistent threat to an unrelated unit is too ambiguous to REMOVE a
    // winning alternative from the counterfactual pool. Main recognition can
    // audit it (e.g. Catalan), but that alone must not prove unique winning play.
    if(!audit.acceptedLines.some(line=>line.isSacrifice && (!line.discovered || line.newlyExposed)))
      return fail('Winning alternative only leaves a persistent unrelated offer; exclusion is ambiguous');
    entry.nonSacrificing=false;entry.materialCostCp=audit.materialCostCp;
    excluded.push(alternative.move);remaining=remaining.filter(uci=>uci!==alternative.move);
    if(!remaining.length)return finish(false,'All alternatives were verified sacrifices');
    const restricted=await rootEvaluation(before,move.color,evaluatePosition,depth,{searchmoves:remaining,multiPV:1});
    if(restricted.depth!==depth)return fail('Remaining-alternative search did not reach requested depth');
    alternative=restricted.candidates.find(line=>line.rank===1 && line.move===restricted.bestMove);
  }
  return fail('Counterfactual evidence unavailable');
}

export async function verifyBrilliantCandidate({chess,beforeFen,move,evaluatePosition,depth=18}) {
  const reject=(reason,data={})=>({verified:false,reason,...data});
  if(!chess || !beforeFen || !move || typeof evaluatePosition!=='function')return reject('Missing position or engine');
  let before;
  try {
    before=new Chess(beforeFen);const replay=new Chess(beforeFen);playUci(replay,uciOf(move));
    if(replay.fen()!==chess.fen() || before.turn()!==move.color)return reject('Move and position do not match');
    const offers=findMaterialOffers(chess,move,beforeFen);
    if(!offers.length)return reject('No legal net material offer');
    if(offers.length>MATERIAL_LIMITS.maxCaptures)return reject('Capture audit budget exceeded');
  }catch(error){return reject(`Invalid position: ${error.message}`);}
  try {
    const mover=move.color,playedUci=uciOf(move);
    const unrestricted=await rootEvaluation(before,mover,evaluatePosition,depth);
    let root=unrestricted;
    if(!root.candidates.some(line=>line.move===playedUci) && /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(root.bestMove || '')) {
      root=await rootEvaluation(before,mover,evaluatePosition,depth,{searchmoves:[root.bestMove,playedUci]});
    }
    const deepAfter=await engineScore(chess,mover,evaluatePosition,depth);
    if(![root.scoreCp,deepAfter].every(Number.isFinite))return reject('Missing depth-matched root/played evaluations');
    const rootLines=root.depth===depth ? root.candidates.filter(line=>completeRootLine(line,beforeFen,depth)) : [];
    const bestLine=rootLines.find(line=>line.rank===1 && line.move===root.bestMove),playedLine=rootLines.find(line=>line.move===playedUci);
    const mateCompatible=bestLine?.mate==null ? playedLine?.mate==null : bestLine.mate>0 && playedLine?.mate>0 && playedLine.mate<=bestLine.mate+1;
    const qualityVerified=Boolean(bestLine && playedLine && mateCompatible);
    const playedCp=qualityVerified ? lineScore(playedLine) : null,beforeCp=qualityVerified ? lineScore(bestLine) : null;
    const audit=await auditCaptureResponses({before,chess,move,evaluatePosition,depth});
    if(!audit.verified)return reject(audit.reason);
    // Counterfactual work is only useful for a sound, quality-verified offer.
    const counterfactual=qualityVerified && audit.isSacrifice && playedCp>=-100 && deepAfter>=-100 && audit.worstAcceptedCp>=-100
      ? await analyzeCounterfactual({before,move,root:unrestricted,evaluatePosition,depth})
      : {verified:false,alreadyCompletelyWinning:null,reason:'Sacrifice or quality/soundness gates not established'};
    return {...audit,deepBefore:root.scoreCp,deepAfter,bestAlternativeCp:root.scoreCp,rootBestMove:root.bestMove,playedUci,
      deepBestMovePlayed:root.bestMove===playedUci,deepCpGap:qualityVerified ? Math.max(0,beforeCp-playedCp) : null,
      analysisDepth:depth,rootCandidates:root.candidates,qualityVerified,playedCp,beforeCp,
      unrestrictedBeforeCp:unrestricted.scoreCp,unrestrictedCandidates:unrestricted.candidates,counterfactual,
      bestAlternativeMethod:'same-root MultiPV comparison with bounded paired fallback'};
  }catch(error){return reject(`Deep analysis failed: ${error.message}`);}
}
