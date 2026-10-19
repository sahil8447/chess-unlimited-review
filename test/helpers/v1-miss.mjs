
import { Chess } from "chess.js";

const VALUES = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0
};

function materialAdvantage(chess, color) {
  let own = 0;
  let opponent = 0;

  for (const row of chess.board()) {
    for (const piece of row) {
      if (!piece) continue;

      const value = VALUES[piece.type] ?? 0;

      if (piece.color === color) {
        own += value;
      } else {
        opponent += value;
      }
    }
  }

  return own - opponent;
}

export function detectMissedOpportunity({
  beforeFen,
  bestVariation,
  bestMovePlayed,
  beforePlayerCp,
  afterPlayerCp,
  color
}) {
  if (bestMovePlayed) return null;

  if (
    !beforeFen ||
    !Array.isArray(bestVariation) ||
    bestVariation.length < 3 ||
    !["w", "b"].includes(color)
  ) {
    return null;
  }

  if (
    !Number.isFinite(beforePlayerCp) ||
    !Number.isFinite(afterPlayerCp)
  ) {
    return null;
  }

  // Require a substantial missed advantage.
  const evaluationLoss =
    beforePlayerCp - afterPlayerCp;

  if (evaluationLoss < 150) return null;

  try {
    const chess = new Chess(beforeFen);

    if (chess.turn() !== color) return null;

    const startingAdvantage =
      materialAdvantage(chess, color);

    let captures = 0;
    let playedMoves = 0;

    for (const uci of bestVariation.slice(0, 10)) {
      if (
        typeof uci !== "string" ||
        !/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci)
      ) {
        return null;
      }

      let move;

      try {
        move = chess.move({
          from: uci.slice(0, 2),
          to: uci.slice(2, 4),
          promotion: uci[4] || undefined
        });
      } catch {
        return null;
      }

      if (!move) return null;

      playedMoves++;

      if (move.captured) captures++;
    }

    // A partial or invalid line isn't enough evidence.
    if (playedMoves < 3 || captures === 0) {
      return null;
    }

    const endingAdvantage =
      materialAdvantage(chess, color);

    const materialGain =
      endingAdvantage - startingAdvantage;

    // The proposed engine continuation must produce
    // a meaningful net material gain.
    if (materialGain < 1) return null;

    return {
      grade: "miss",
      materialGain,
      evaluationLoss,
      explanation:
        "Stockfish found a continuation that gains " +
        `approximately ${materialGain.toFixed(1)} ` +
        "pawn-equivalents of material. " +
        "The played move missed that opportunity."
    };
  } catch (error) {
    console.warn("[Miss Detection]", error.message);
    return null;
  }
}
