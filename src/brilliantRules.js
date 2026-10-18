// Step 48: conservative audit-only chess.com-like criteria.
// This is not Chess.com's unpublished grading implementation.
// All centipawn scores are from the mover's perspective.
// Diagnostic only: a bounded win-chance proxy, not Chess.com's private formula.
function approximateWinChance(cp) {
  if (!Number.isFinite(cp)) return null;
  return 1 / (1 + Math.exp(-cp / 220));
}

export function classifyBrilliantMove({baseGrade, verification, rating = null, bestMovePlayed = false}) {
  const winChanceBefore = approximateWinChance(verification?.bestAlternativeCp);
  const winChancePlayed = approximateWinChance(verification?.deepAfter);
  const winChanceGap = winChanceBefore == null || winChancePlayed == null
    ? null : Math.max(0, winChanceBefore - winChancePlayed);
  const evidence = {
    nearBestCpGap: Number.isFinite(verification?.deepCpGap)
      ? verification.deepCpGap : null,
    approximateWinChanceGap: winChanceGap,
    analysisDepth: verification?.analysisDepth ?? null,
    rootBestMove: verification?.rootBestMove ?? null,
    deepBestMovePlayed: verification?.deepBestMovePlayed ?? false
  };
  const reject = reason => ({ grade: baseGrade, reason, eligible: false, ...evidence });
  if (!verification?.verified) return reject(verification?.reason || 'Not a verified material sacrifice');
  const {deepBefore, deepAfter, bestAlternativeCp, worstAcceptedCp, materialCostCp,
    opponentCanGainMaterial, forcingCompensation = false, offeredCaptureCount} = verification;
  if (![deepBefore, deepAfter, bestAlternativeCp, worstAcceptedCp, materialCostCp].every(Number.isFinite))
    return reject('Incomplete deep verification');
  if (offeredCaptureCount < 1 ||
      ((!opponentCanGainMaterial || materialCostCp < 75) && !forcingCompensation))
    return reject('No material sacrifice or forcing tactical compensation');
  // Forcing tactical compensation only clears the sacrifice-detection gate.
  // It never bypasses inaccurate grade, near-best, or won-position checks.
  // Never bypass an established inaccuracy just because the position remains winning.
  if (['inaccuracy', 'mistake', 'blunder', 'miss'].includes(baseGrade))
    return reject('Original move is not sufficiently accurate');
  // No special lenience for a move that is clearly inferior to best play.
  const validRating = Number.isFinite(rating) && rating > 0;
  const nearBestTolerance = validRating && rating < 1200 ? 35 : 22;
  const bestGap = Math.max(0, bestAlternativeCp - deepAfter);
  if (bestGap > nearBestTolerance)
    return reject(`Not near-best: ${Math.round(bestGap)}cp behind the best move`);
  if (deepBefore > 450)
    return reject('Already clearly winning before the sacrifice');
  if (deepAfter < -100 || worstAcceptedCp < -100)
    return reject('Opponent can obtain a clearly favorable position');
  if (deepBefore - deepAfter > nearBestTolerance)
    return reject('Evaluation falls too much at equal depth');
  return { grade: baseGrade, eligible: true, ...evidence,
    reason: `Candidate only; best gap ${Math.round(bestGap)}cp; manual verification required` };
}
