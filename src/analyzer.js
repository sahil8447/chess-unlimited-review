
import { Chess } from "chess.js";

export function parseGame(pgn) {
  const chess = new Chess();

  chess.loadPgn(pgn);

  const history = chess.history({ verbose: true });

  const replay = new Chess();

  // Support games that start from a custom position.
  const initialFen = chess.header().FEN;

  if (initialFen) {
    replay.load(initialFen);
  }

  const positions = [];

  for (let i = 0; i < history.length; i++) {
    const move = history[i];

    const fenBefore = replay.fen();

    replay.move(move.san);

    positions.push({
      index: i,
      moveNumber: Number(fenBefore.split(" ")[5]),
      color: move.color,
      san: move.san,
      uci: move.from + move.to +
        (move.promotion || ""),
      fenBefore,
      fenAfter: replay.fen()
    });
  }

  return {
    headers: chess.header(),
    positions,
    totalMoves: positions.length
  };
}

