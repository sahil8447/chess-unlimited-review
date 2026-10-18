
import { Chess } from "chess.js";

const PIECE_NAMES = {
  p: "pawn",
  n: "knight",
  b: "bishop",
  r: "rook",
  q: "queen",
  k: "king"
};

const PIECE_VALUES = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9
};

function getBestMoveSan(fen, uci) {
  if (!uci || uci.length < 4) return null;

  try {
    const chess = new Chess(fen);

    const move = chess.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci[4] || undefined
    });

    return move?.san || null;
  } catch {
    return null;
  }
}

export function generateMoveExplanation({
  move,
  grade,
  beforeFen,
  afterFen,
  bestMove,
  bestMovePlayed,
  beforePlayerCp,
  afterPlayerCp
}) {
  const after = new Chess(afterFen);
  const player = move.color === "w" ? "White" : "Black";
  const opponent = move.color === "w" ? "Black" : "White";

  const bestSan = getBestMoveSan(beforeFen, bestMove);

  // 1. Checkmate by the player.
  if (after.isCheckmate()) {
    return `${move.san} delivers checkmate and ends the game.`;
  }

  // 2. Identify immediate checkmate opportunities
  // available to the opponent.
  if (["blunder", "mistake"].includes(grade)) {
    const replies = after.moves({ verbose: true });

    for (const reply of replies) {
      const test = new Chess(afterFen);
      test.move(reply);

      if (test.isCheckmate()) {
        const betterMove = bestSan
          ? ` Stockfish preferred ${bestSan}.`
          : "";

        return `${opponent} has checkmate in one with ${reply.san}.${betterMove}`;
      }
    }
  }

  // 3. Detect immediate captures of major pieces.
  if (["blunder", "mistake"].includes(grade)) {
    const captures = after.moves({ verbose: true });

    const valuableCaptures = captures
      .filter(reply => {
        if (!reply.captured) return false;

        const target = after.get(reply.to);

        return (
          target &&
          target.color === move.color &&
          (PIECE_VALUES[target.type] || 0) >= 5
        );
      })
      .sort(
        (a, b) =>
          (PIECE_VALUES[b.captured] || 0) -
          (PIECE_VALUES[a.captured] || 0)
      );

    if (valuableCaptures.length > 0) {
      const capture = valuableCaptures[0];
      const pieceName = PIECE_NAMES[capture.captured];

      const betterMove = bestSan
        ? ` Stockfish preferred ${bestSan}.`
        : "";

      return `${opponent} can immediately capture your ${pieceName} on ${capture.to} with ${capture.san}.${betterMove}`;
    }
  }

  // 4. Describe an important evaluation decline.
  const evaluationDrop =
    beforePlayerCp - afterPlayerCp;

  if (
    ["blunder", "mistake", "inaccuracy"].includes(grade) &&
    Number.isFinite(evaluationDrop) &&
    evaluationDrop > 0 &&
    Math.abs(beforePlayerCp) < 3000 &&
    Math.abs(afterPlayerCp) < 3000
  ) {
    const lostPawns = (evaluationDrop / 100).toFixed(2);

    const betterMove = bestSan
      ? ` Stockfish preferred ${bestSan}.`
      : "";

    return `This move worsened ${player}'s engine evaluation by approximately ${lostPawns} pawns.${betterMove}`;
  }

  // 5. Explain verified tactical grades.
  if (grade === "brilliant") {
    return "This move passed the extension's sacrifice-verification checks while maintaining a strong evaluation.";
  }

  if (grade === "great") {
    return "This was a critical engine-preferred move. The next-best analyzed alternative was significantly weaker.";
  }

  // 6. Explain captures and checks.
  const features = [];

  if (move.captured) {
    features.push(
      `captures a ${PIECE_NAMES[move.captured]}`
    );
  }

  if (move.promotion) {
    features.push(
      `promotes a pawn to a ${PIECE_NAMES[move.promotion]}`
    );
  }

  if (after.isCheck()) {
    features.push("gives check");
  }

  if (features.length > 0) {
    const action = features.join(" and ");

    if (bestMovePlayed) {
      return `This ${action} and matches Stockfish's preferred move.`;
    }

    return `This ${action}. The engine classified it as ${grade}.`;
  }

  // 7. General explanations when no concrete
  // tactical reason was detected.
  if (bestMovePlayed) {
    return "This matches Stockfish's preferred move and preserves the engine's expected result.";
  }

  if (grade === "excellent" || grade === "good") {
    return "A reasonable continuation that keeps the position relatively stable.";
  }

  const betterMove = bestSan
    ? ` Stockfish preferred ${bestSan}.`
    : "";

  return `The engine classified this move as ${grade}.${betterMove}`;
}
