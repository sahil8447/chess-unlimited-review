import {Chess} from 'chess.js';
import {completeRootLine,scoreForMover} from './tactics.js';
import {materialBalance,playUci} from './sacrificeMaterial.js';
import {winChance} from './grading.js';

// A PV material swing alone is not proof of a missed tactic.
export function detectMissedOpportunity({beforeFen,bestVariation,bestMovePlayed,beforePlayerCp,afterPlayerCp,color,evidence}) {
  if(bestMovePlayed || !beforeFen || !Array.isArray(bestVariation) || bestVariation.length<3 || !['w','b'].includes(color))return null;
  if(!Number.isFinite(beforePlayerCp)||!Number.isFinite(afterPlayerCp))return null;
  const loss=winChance(beforePlayerCp)-winChance(afterPlayerCp),evaluationLoss=beforePlayerCp-afterPlayerCp;
  // Require a lost attainable advantage, rather than a tactical flourish in a lost/decided position.
  if(evaluationLoss<150 || loss<.10 || beforePlayerCp<100 || afterPlayerCp>=100)return null;
  const {root,quality,minDepth=18}=evidence||{};
  const primary=root?.candidates?.find(line=>line.rank===1 && line.move===root.bestMove);
  if(!quality || quality.source!=='same-root' || quality.depth<Math.max(18,minDepth) || root?.depth!==quality.depth ||
     quality.beforeCp!==beforePlayerCp || quality.afterCp!==afterPlayerCp ||
     !completeRootLine(primary,beforeFen,root.depth) || bestVariation.join(' ')!==primary.pv.join(' '))return null;
  const primaryScore=scoreForMover({score:primary.scoreCp,mate:primary.mate},'w','w');
  if(quality.bestMove && quality.bestMove!==root.bestMove || Math.abs(primaryScore-beforePlayerCp)>35)return null;
  try{
    const game=new Chess(beforeFen);if(game.turn()!==color)return null;
    // Validate the entire supplied line, including tails beyond the material inspection horizon.
    if(bestVariation.length>128)return null;
    const baseline=materialBalance(game,color),future=[];
    const replay=new Chess(beforeFen);for(const uci of bestVariation){playUci(replay,uci);future.push(materialBalance(replay,color)-baseline);}
    let captures=0;
    for(let i=0;i<Math.min(15,bestVariation.length);i++){
      const move=playUci(game,bestVariation[i]);if(move.captured)captures++;
      if(i<2 || game.turn()===color)continue;
      const gain=materialBalance(game,color)-baseline;
      if(game.isCheckmate())return {grade:'miss',materialGain:gain,evaluationLoss,winChanceLoss:loss,depth:root.depth,plies:i+1,explanation:'The verified best line forces checkmate; the played move loses that winning opportunity.'};
      if(!captures || gain<2 || future.slice(i).some(value=>value<2))continue;
      // All immediate legal captures must preserve the gain. This rejects PVs
      // stopped just before a recapture, including en passant and promotion captures.
      const replies=game.moves({verbose:true});
      if(replies.some(reply=>{if(!reply.captured)return false;const test=new Chess(game.fen());test.move(reply);return materialBalance(test,color)-baseline<2;}))continue;
      return {grade:'miss',materialGain:gain,evaluationLoss,winChanceLoss:loss,depth:root.depth,plies:i+1,
        explanation:`A depth-${root.depth} best-defense line gains at least ${gain.toFixed(1)} pawn-equivalents, surviving immediate recaptures. The played move gives up the verified advantage.`};
    }
  }catch{return null;}
  return null;
}
