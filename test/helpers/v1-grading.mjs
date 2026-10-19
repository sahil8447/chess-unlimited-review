
/*
 * Chess Unlimited Review — Grading System
 *
 * Move grading: Expected-win-chance heuristics
 * Accuracy: Lichess-inspired estimated accuracy
 * Brilliant: Verified sacrifice + positional checks
 *
 * These are our own classifications, not Chess.com's
 * proprietary implementation.
 */

export const GRADES = {
  best: {
    label: "Best",
    symbol: "★",
    color: "#81b64c"
  },
  excellent: {
    label: "Excellent",
    symbol: "!",
    color: "#81b64c"
  },
  good: {
    label: "Good",
    symbol: "",
    color: "#96af8b"
  },
  inaccuracy: {
    label: "Inaccuracy",
    symbol: "?!",
    color: "#f0c15c"
  },
  miss: {
  label: "Miss",
  symbol: "✕",
  color: "#f16b6b"
},
  mistake: {
    label: "Mistake",
    symbol: "?",
    color: "#e69b50"
  },
  blunder: {
    label: "Blunder",
    symbol: "??",
    color: "#e05252"
  },
  brilliant: {
    label: "Brilliant",
    symbol: "!!",
    color: "#1baca6"
  },
  great: {
    label: "Great",
    symbol: "!",
    color: "#5c8bb0"
  }
};

const clamp = (value, min, max) =>
  Math.max(min, Math.min(max, value));

/*
 * Return winning chances between 0 and 1.
 * Existing tactical and normal grading both use this.
 */
export function winChance(cp) {
  if (!Number.isFinite(cp)) return 0.5;

  const score = clamp(cp, -10000, 10000);

  return 1 / (1 + Math.exp(-0.00368208 * score));
}

/*
 * Classify a played move based on the change
 * in expected winning chances.
 */
export function classifyMove({
  beforeCp,
  afterCp,
  bestMovePlayed
}) {
  if (
    !Number.isFinite(beforeCp) ||
    !Number.isFinite(afterCp)
  ) {
    return { grade: "good", loss: 0 };
  }

  const loss = clamp(
    winChance(beforeCp) - winChance(afterCp),
    0,
    1
  );

  if (loss >= 0.20) {
    return { grade: "blunder", loss };
  }

  if (loss >= 0.10) {
    return { grade: "mistake", loss };
  }

  if (loss >= 0.05) {
    return { grade: "inaccuracy", loss };
  }

  if (bestMovePlayed) {
    return { grade: "best", loss };
  }

  if (loss <= 0.005) {
    return { grade: "excellent", loss };
  }

  return { grade: "good", loss };
}

/*
 * Accuracy functions.
 *
 * IMPORTANT:
 * Accuracy uses percentage points (0–100).
 * Normal classification uses probabilities (0–1).
 * Keep these separate.
 */

export function moveAccuracyFromWinLoss(winLoss) {
  if (!Number.isFinite(winLoss)) return null;

  const loss = Math.max(0, winLoss);

  const accuracy =
    103.1668100711649 *
    Math.exp(-0.04354415386753951 * loss) -
    3.166924740191411;

  return clamp(accuracy, 0, 100);
}

export function calculateMoveAccuracy(
  beforeCp,
  afterCp
) {
  if (
    !Number.isFinite(beforeCp) ||
    !Number.isFinite(afterCp)
  ) {
    return null;
  }

  const beforeWin = winChance(beforeCp) * 100;
  const afterWin = winChance(afterCp) * 100;

  const loss = Math.max(0, beforeWin - afterWin);

  return moveAccuracyFromWinLoss(loss);
}

function standardDeviation(values) {
  if (values.length < 2) return 0;

  const mean =
    values.reduce((sum, n) => sum + n, 0) /
    values.length;

  const variance =
    values.reduce(
      (sum, n) => sum + (n - mean) ** 2,
      0
    ) / values.length;

  return Math.sqrt(variance);
}

/*
 * Game accuracy:
 * 1. Accuracy of each move
 * 2. Volatility-weighted mean
 * 3. Harmonic mean
 * 4. Average of these two
 */
export function calculateAccuracy(
  reviewedMoves,
  color
) {
  if (
    !Array.isArray(reviewedMoves) ||
    reviewedMoves.length === 0 ||
    !["w", "b"].includes(color)
  ) {
    return null;
  }

  // Never silently ignore moves with missing scores.
  if (reviewedMoves.some(move =>
    !Number.isFinite(move.beforePlayerCp) ||
    !Number.isFinite(move.afterPlayerCp)
  )) {
    console.warn(
      "[Accuracy] Missing evaluation data"
    );
    return null;
  }

  // Reconstruct every position's evaluation
  // from White's perspective.
  const first = reviewedMoves[0];

  const initialWhiteCp =
    first.color === "w"
      ? first.beforePlayerCp
      : -first.beforePlayerCp;

  const whiteCps = [
    initialWhiteCp,
    ...reviewedMoves.map(move =>
      move.color === "w"
        ? move.afterPlayerCp
        : -move.afterPlayerCp
    )
  ];

  const winPercents =
    whiteCps.map(cp => winChance(cp) * 100);

  const windowSize = clamp(
    Math.floor(reviewedMoves.length / 10),
    2,
    8
  );

  // Calculate volatility around each move.
  const weights = reviewedMoves.map((_, index) => {
    const start = Math.max(
      0,
      Math.min(
        index - Math.floor(windowSize / 2),
        winPercents.length - windowSize
      )
    );

    const values = winPercents.slice(
      start,
      start + windowSize
    );

    return clamp(
      standardDeviation(values),
      0.5,
      12
    );
  });

  let weightedSum = 0;
  let totalWeight = 0;
  const accuracies = [];

  for (let i = 0; i < reviewedMoves.length; i++) {
    const move = reviewedMoves[i];

    if (move.color !== color) continue;

    const accuracy = calculateMoveAccuracy(
      move.beforePlayerCp,
      move.afterPlayerCp
    );

    if (accuracy === null) return null;

    accuracies.push(accuracy);

    weightedSum += accuracy * weights[i];
    totalWeight += weights[i];
  }

  if (accuracies.length === 0) return null;

  const weightedMean =
    weightedSum / totalWeight;

  const harmonicMean =
    accuracies.some(value => value === 0)
      ? 0
      : accuracies.length /
        accuracies.reduce(
          (sum, value) => sum + 1 / value,
          0
        );

  const finalAccuracy =
    (weightedMean + harmonicMean) / 2;

  console.log("[Accuracy]", {
    color,
    moves: accuracies.length,
    weightedMean: weightedMean.toFixed(2),
    harmonicMean: harmonicMean.toFixed(2),
    finalAccuracy: finalAccuracy.toFixed(2)
  });

  return clamp(finalAccuracy, 0, 100);
}

/*
 * Great Move classification.
 *
 * Brilliant classification is deliberately separate:
 * it requires a verified sacrifice.
 */
export function classifyTacticalMove({
  baseGrade,
  bestMovePlayed,
  beforeCp,
  afterCp,
  materialBefore,
  materialAfter,
  isCapture,
  isCheck,
  alternativeLoss = null
}) {
  if (!bestMovePlayed) return baseGrade;

  const loss = Math.max(
    0,
    winChance(beforeCp) - winChance(afterCp)
  );

const criticalPosition =
  Number.isFinite(beforeCp) &&
  Number.isFinite(afterCp) &&
  beforeCp < 300 &&
  afterCp > -100;

if (
  criticalPosition &&
  alternativeLoss !== null &&
  alternativeLoss >= 0.10 &&
  loss < 0.02
) {
  return "great";
}

  return baseGrade;
}

/*
 * Brilliant Move classification.
 *
 * Must satisfy ALL:
 *
 * 1. Verified material sacrifice
 * 2. Position not bad after sacrifice
 * 3. Not already completely winning
 * 4. Best or nearly best engine move
 *
 * Rating affects permitted evaluation loss.
 * These thresholds are our own heuristics.
 */
// Compatibility export only. A caller-supplied boolean and child/root scores
// cannot replace the structured audit in brilliantRules.js. Awards stay off.
export function classifyBrilliantMove({ baseGrade }) {
  return baseGrade;
}

/*
 * Compare the best and second-best MultiPV moves.
 *
 * The scores must come from the same search depth
 * and the same side-to-move perspective.
 */
export function calculateAlternativeLoss(candidates) {
  if (!Array.isArray(candidates)) return null;

  const best = candidates.find(c => c.rank === 1);
  const second = candidates.find(c => c.rank === 2);

  if (!best || !second) return null;

  if (!Number.isInteger(best.depth) || best.depth < 1 ||
      best.depth !== second.depth || best.bound || second.bound) return null;

  function score(candidate) {
    if (
      candidate.mate !== null &&
      candidate.mate !== undefined
    ) {
      return Number.isFinite(candidate.mate) && candidate.mate !== 0
        ? Math.sign(candidate.mate) * 10000 : null;
    }

    return candidate.scoreCp;
  }

  const bestCp = score(best);
  const secondCp = score(second);

  if (
    !Number.isFinite(bestCp) ||
    !Number.isFinite(secondCp)
  ) {
    return null;
  }

  return Math.max(
    0,
    winChance(bestCp) - winChance(secondCp)
  );
}
