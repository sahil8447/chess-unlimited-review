// Conservative approximation, not Chess.com's proprietary formula.
export const AUTOMATIC_BRILLIANT_ENABLED = false;
export function approximateWinChance(cp) {
  return Number.isFinite(cp) ? 1 / (1 + Math.exp(-cp / 220)) : null;
}
export function classifyBrilliantMove({baseGrade, verification: v, rating}) {
  const ratingUsed = Number.isFinite(rating) && rating > 0 ? rating : 1500;
  const tolerance = ratingUsed < 1200 ? 35 : 22;
  const beforeCp = v?.beforeCp ?? null, playedCp = v?.playedCp ?? null;
  const cpGap = v?.deepCpGap ?? null;
  const beforeChance = approximateWinChance(beforeCp);
  const playedChance = approximateWinChance(playedCp);
  const winChanceGap = beforeChance == null || playedChance == null ? null : Math.max(0,beforeChance-playedChance);
  // Root best-play evaluation may derive entirely from this sacrifice.
  // Eligibility requires complete counterfactual evidence instead of a root
  // +900 shortcut; unknown alternatives fail closed.
  const counterfactual = v?.counterfactual;
  const counterfactualVerified = counterfactual?.verified === true &&
    typeof counterfactual.alreadyCompletelyWinning === 'boolean' &&
    counterfactual.depth === v?.analysisDepth && counterfactual.allAlternativesCovered === true;
  const alreadyCompletelyWinning = counterfactualVerified ? counterfactual.alreadyCompletelyWinning : null;
  const evidence = {eligible:false, reason:'', isSacrifice:Boolean(v?.isSacrifice),
    sacrificeType:v?.sacrificeType ?? 'unknown', bestMovePlayed:Boolean(v?.deepBestMovePlayed),
    nearBest: Number.isFinite(cpGap) && cpGap <= tolerance && winChanceGap <= .04,
    depth:v?.analysisDepth ?? null, playedMove:v?.playedUci ?? null,
    bestMove:v?.rootBestMove ?? null, beforeCp, playedCp, cpGap, winChanceGap,
    compensationVerified:Boolean(v?.verified && v?.worstAcceptedCp >= -100),
    alreadyCompletelyWinning, counterfactualVerified,
    bestNonSacrificingCp:counterfactual?.bestNonSacrificingCp ?? null,
    alternativeUpperBoundCp:counterfactual?.alternativeUpperBoundCp ?? null, ratingUsed};
  const reject = reason => ({grade:baseGrade,...evidence,reason});
  if (!v?.verified) return reject(v?.reason || 'Sacrifice verification missing');
  if (!evidence.isSacrifice) return reject('No meaningful material or forcing temporary sacrifice');
  if (!v.qualityVerified || ![beforeCp,playedCp,cpGap,v.deepAfter,v.worstAcceptedCp].every(Number.isFinite))
    return reject('Incomplete equal-depth root MultiPV evidence');
  if (!evidence.nearBest) return reject('Played move is not near-best in the same root search');
  if (!counterfactualVerified) return reject('Incomplete counterfactual evidence: ' + (counterfactual?.reason || 'alternatives not verified'));
  if (alreadyCompletelyWinning) return reject('Already completely winning with a non-sacrificing alternative');
  if (playedCp < -100 || v.deepAfter < -100 || v.worstAcceptedCp < -100)
    return reject('Sacrifice leaves a bad position or lacks compensation');
  return {grade:baseGrade,...evidence,eligible:true,
    reason:'Verified candidate; automatic Brilliant awards remain disabled'};
}
