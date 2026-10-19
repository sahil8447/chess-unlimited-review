import {normalizeEvaluation,evaluationCp,compareEvaluations} from './evaluation.js';
import {completeRootLine, scoreForMover} from './tactics.js';
import {uciOf} from './sacrificeMaterial.js';

export function terminalEvaluation(position) {
  if(position.isCheckmate())return {bestMove:null,score:null,mate:-1,candidates:[],terminal:true};
  if(position.isGameOver())return {bestMove:null,score:0,mate:null,candidates:[],terminal:true};
  return null;
}
export function whiteScore(evaluation, turn) {
  const cp=scoreForMover(evaluation,turn,'w');
  if(!Number.isFinite(cp))throw Error('Missing finite engine score');
  return cp;
}
export function rootQuality(root, move, depth) {
  if(root?.depth!==depth || root.error || root.success===false)return null;
  const lines=(root.candidates||[]).filter(line=>completeRootLine(line,move.before,depth));
  const best=lines.find(line=>line.rank===1 && line.move===root.bestMove);
  const played=lines.find(line=>line.move===uciOf(move));
  if(!best || !played)return null;
  if(compareEvaluations(normalizeEvaluation(played),normalizeEvaluation(best))>0)return null;
  return {beforeEvaluation:{...normalizeEvaluation(best),basis:'root-best-line'},afterEvaluation:{...normalizeEvaluation(played),basis:'root-played-line'},beforeCp:evaluationCp(normalizeEvaluation(best)),afterCp:evaluationCp(normalizeEvaluation(played)),bestMove:best.move,depth,source:'same-root',bestMate:best.mate??null,playedMate:played.mate??null,playedPV:played.pv,rootBestLine:best,playedLine:played};
}
export function validatePrimary(result, fen, depth) {
  const primary=result?.candidates?.find(line=>line.rank===1 && line.move===result.bestMove);
  if(result?.depth!==depth || result.error || result.success===false || !completeRootLine(primary,fen,depth))throw Error('Incomplete, bound or illegal root evidence');
  return result;
}
