import { calculateReviewedMoveAccuracy } from './grading.js';

export const PERFORMANCE_MODEL = Object.freeze({ minRating: 400, maxRating: 2800, minMoves: 10, minEffective: 6 });
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const rating = n => Number.isFinite(Number(n)) && Number(n) >= 100 && Number(n) <= 4000 ? Number(n) : null;

// An explicitly uncalibrated single-game index, shrunk toward available game ratings.
export function estimatePerformance({ moves, color, headers = {}, complete = false, customStart = false }) {
  const insufficient = reason => ({ rating: null, confidence: 'Insufficient data', reason });
  if (!complete || !Array.isArray(moves) || !['w', 'b'].includes(color)) return insufficient('Analysis incomplete');
  if (!['1-0', '0-1', '1/2-1/2'].includes(headers.Result) || /abort|abandon/i.test(headers.Termination || '')) return insufficient('Game unfinished or abandoned');
  if (customStart) return insufficient('Custom starting positions are outside this model');
  const own = moves.filter(m => m.color === color);
  if (own.length < PERFORMANCE_MODEL.minMoves) return insufficient('Too few moves');
  let weight = 0, quality = 0, errors = 0;
  for (const m of own) {
    const moveAccuracy=calculateReviewedMoveAccuracy(m);
    if (moveAccuracy===null || !Number.isInteger(m.legalChoices)) return insufficient('Missing analysis evidence');
    // Forced moves, obvious recaptures, opening moves and decided positions contribute little/no evidence.
    const matePosition=m.beforeEvaluation && m.beforeEvaluation.kind!=='cp' && m.beforeEvaluation.kind!=='draw';
    const w = matePosition || m.legalChoices <= 1 || m.obviousRecapture || Math.abs(m.beforePlayerCp) >= 600 ? 0 : m.number <= 6 ? 0.25 : 1;
    const accuracy = moveAccuracy;
    weight += w;
    quality += w * accuracy;
    errors += w * (['blunder', 'miss'].includes(m.grade) ? 2 : m.grade === 'mistake' ? 1 : 0);
  }
  if (weight < PERFORMANCE_MODEL.minEffective) return insufficient('Too few nontrivial decisions');
  const player = rating(headers[color === 'w' ? 'WhiteElo' : 'BlackElo']);
  const opponent = rating(headers[color === 'w' ? 'BlackElo' : 'WhiteElo']);
  const prior = player !== null && opponent !== null ? .75 * player + .25 * opponent : player ?? opponent ?? 1500;
  const average = quality / weight;
  // Bounded nonlinear quality adjustment, with an explicit mistake-frequency penalty.
  const adjustment = clamp(320 * Math.log((average + 5) / (105 - average)) - 500 * errors / weight, -800, 800);
  const reliability = weight / (weight + 20);
  const value = Math.round(clamp(prior + reliability * adjustment, PERFORMANCE_MODEL.minRating, PERFORMANCE_MODEL.maxRating) / 10) * 10;
  const uncertainty = Math.round((350 + 500 / Math.sqrt(weight) + (player === null ? 150 : 0)) / 10) * 10;
  return { rating: value, confidence: weight >= 20 && player !== null ? 'Moderate' : 'Low', uncertainty, effectiveMoves: weight, quality: average, prior };
}
