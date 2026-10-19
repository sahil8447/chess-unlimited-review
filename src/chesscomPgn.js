
import { Chess } from "chess.js";

const TCN_CHARS =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!?{~}(^)[_]@#$,./&-*++=";

const PROMOTION_PIECES = "qnrbkp";
const FILES = "abcdefgh";

function squareFromIndex(index) {
  if (!Number.isInteger(index) || index < 0 || index > 63) {
    throw new Error("Invalid square in Chess.com move data");
  }

  return FILES[index % 8] + (Math.floor(index / 8) + 1);
}

function decodeTcnMove(encoded) {
  const fromIndex = TCN_CHARS.indexOf(encoded[0]);
  let toIndex = TCN_CHARS.indexOf(encoded[1]);

  if (fromIndex < 0 || toIndex < 0) {
    throw new Error("Unknown Chess.com move encoding");
  }

  // Drop moves belong to variants such as Crazyhouse.
  if (fromIndex > 75) {
    throw new Error("Drop-move variants are not supported yet");
  }

  let promotion;

  if (toIndex > 63) {
    promotion = PROMOTION_PIECES[
      Math.floor((toIndex - 64) / 3)
    ];

    toIndex =
      fromIndex +
      (fromIndex < 16 ? -8 : 8) +
      ((toIndex - 1) % 3) - 1;
  }

  return {
    from: squareFromIndex(fromIndex),
    to: squareFromIndex(toIndex),
    ...(promotion ? { promotion } : {})
  };
}

export async function fetchCurrentChessComPgn({signal} = {}) {
  const match = location.pathname.match(
    /^\/(?:analysis\/)?game\/(live|daily)\/(\d+)(?:\/|$)/
  );

  if (!match) {
    throw new Error(
      "Open a completed Chess.com game page to fetch its PGN."
    );
  }

  const [, gameType, gameId] = match;

  const response = await fetch(
    `/callback/${gameType}/game/${gameId}`,
    {
      signal,
      credentials: "same-origin",
      cache: "no-store",
      headers: {
        Accept: "application/json"
      }
    }
  );

  if (!response.ok) {
    throw new Error(
      `Chess.com returned HTTP ${response.status}`
    );
  }

  const data = await response.json();
  const gameData = data?.game;

  if (!gameData) {
    throw new Error("Chess.com returned no game data");
  }

  const headers =
    gameData.pgnHeaders ||
    gameData.pgnheader ||
    {};

  const result = headers.Result;

  if (!["1-0", "0-1", "1/2-1/2"].includes(result)) {
    throw new Error(
      "A completed-game result is not available yet."
    );
  }

  const moveList = gameData.moveList;

  if (
    typeof moveList !== "string" ||
    moveList.length === 0 ||
    moveList.length % 2 !== 0
  ) {
    throw new Error("Chess.com returned an invalid move list");
  }

  const chess = new Chess();

  if (headers.FEN) {
    chess.load(headers.FEN);
  }

  for (let i = 0; i < moveList.length; i += 2) {
    const move = decodeTcnMove(
      moveList.slice(i, i + 2)
    );

    // Handle castling encoded as king-to-rook.
    const sourcePiece = chess.get(move.from);
    const targetPiece = chess.get(move.to);

    if (
      sourcePiece?.type === "k" &&
      targetPiece?.type === "r" &&
      sourcePiece.color === targetPiece.color
    ) {
      const kingside =
        FILES.indexOf(move.to[0]) >
        FILES.indexOf(move.from[0]);

      move.to =
        `${kingside ? "g" : "c"}${move.from[1]}`;
    }

    try {
      chess.move(move);
    } catch {
      throw new Error(
        `Could not reconstruct move ${i / 2 + 1}. ` +
        "This game may use an unsupported variant."
      );
    }
  }

  const supportedHeaders = [
    "Event", "Site", "Date", "Round",
    "White", "Black", "Result",
    "WhiteElo", "BlackElo",
    "TimeControl", "Termination",
    "SetUp", "FEN"
  ];

  for (const key of supportedHeaders) {
    if (headers[key] != null) {
      chess.header(key, String(headers[key]));
    }
  }

  return chess.pgn();
}
