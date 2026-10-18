import { Chess } from 'chess.js';

const VALUES = {p:100,n:320,b:330,r:500,q:900,k:0};
const other = color => color === 'w' ? 'b' : 'w';

export function materialBalance(chess, color) {
  let cp = 0;
  for (const row of chess.board()) for (const piece of row) {
    if (!piece) continue;
    cp += (piece.color === color ? 1 : -1) * (VALUES[piece.type] ?? 0);
  }
  return cp / 100;
}

function materialCp(chess, color) {
  return Math.round(materialBalance(chess, color) * 100);
}

function legalCapturesOfMovedPiece(chess, move) {
  if (!chess || !move || chess.isGameOver() || chess.turn() === move.color) return [];
  const piece = chess.get(move.to);
  if (!piece || piece.color !== move.color || piece.type === 'k') return [];
  if ((VALUES[piece.type] ?? 0) <= (VALUES[move.captured] ?? 0)) return [];
  return chess.moves({verbose:true}).filter(reply =>
    reply.to === move.to && Boolean(reply.captured) && reply.color === other(move.color)
  );
}

export function detectSacrificeCandidate(chess, move) {
  return legalCapturesOfMovedPiece(chess, move).length > 0;
}

function scoreForMover(e, turn, mover) {
  if (!e) return null;
  let cp;
  if (e.mate != null) cp = e.mate > 0 ? 10000 : -10000;
  else if (Number.isFinite(e.score)) cp = e.score;
  else return null;
  return turn === mover ? cp : -cp;
}
async function engineScore(chess, mover, engine, depth) {
  if (chess.isCheckmate()) return chess.turn() === mover ? -10000 : 10000;
  if (chess.isGameOver()) return 0;
  return scoreForMover(await engine(chess.fen(), depth), chess.turn(), mover);
}

// Analyze the root exactly once. Repeated searches of the same FEN can
// disagree because Stockfish is time/depth-sensitive; do not compare their
// independent results as though they were different candidate moves.
async function rootEvaluation(chess, mover, engine, depth) {
  if (chess.isGameOver()) return {scoreCp: await engineScore(chess,mover,engine,depth), bestMove:null};
  const result = await engine(chess.fen(), depth);
  return {
    scoreCp: scoreForMover(result, chess.turn(), mover),
    bestMove: result?.bestMove || null,
    candidates: result?.candidates || []
  };
}

export async function verifyBrilliantCandidate({
  chess, beforeFen, move, evaluatePosition, depth = 18
}) {
  const reject = (reason, data = {}) => ({ verified:false, reason, ...data });
  if (!chess || !beforeFen || !move || typeof evaluatePosition !== 'function')
    return reject('Missing position or engine');
  const captures = legalCapturesOfMovedPiece(chess, move);
  if (!captures.length) return reject('No legal capture of the offered piece');
  const mover = move.color;
  const before = new Chess(beforeFen);
  let deepBefore, deepAfter, bestAlternativeCp, rootBestMove, rootCandidates;
  try {
    // ONE root search, followed by ONE played-position search.
    // deepBefore and bestAlternativeCp are intentionally identical:
    // both refer to the same depth-matched root evaluation.
    const root = await rootEvaluation(before, mover, evaluatePosition, depth);
    deepBefore = root.scoreCp;
    bestAlternativeCp = root.scoreCp;
    rootBestMove = root.bestMove;
    rootCandidates = root.candidates;
    deepAfter = await engineScore(chess, mover, evaluatePosition, depth);
  } catch (e) { return reject(`Deep analysis failed: ${e.message}`); }
  if (![deepBefore,deepAfter,bestAlternativeCp].every(Number.isFinite))
    return reject('Missing depth-matched root/played evaluations');
  const playedUci = move.from + move.to + (move.promotion || '');
  const deepBestMovePlayed = rootBestMove?.toLowerCase() === playedUci.toLowerCase();
  const deepCpGap = Math.max(0, bestAlternativeCp - deepAfter);

  let worstAcceptedCp = Infinity;
  let greatestPermanentCostCp = 0;
  let opponentCanGainMaterial = false;
  let forcingCompensation = false;
  const acceptedLines = [];
  const baselineMaterial = materialCp(before, mover);
  for (const capture of captures) {
    const taken = new Chess(chess.fen());
    taken.move({from:capture.from,to:capture.to,promotion:capture.promotion || undefined});
    let score;
    try { score = await engineScore(taken,mover,evaluatePosition,depth); }
    catch(e) { return reject(`Capture analysis failed: ${e.message}`); }
    if (!Number.isFinite(score)) return reject('Capture evaluation missing');
    worstAcceptedCp = Math.min(worstAcceptedCp,score);

    // Distinguish an ordinary recapture from forcing tactical compensation.
    // This is evidence for a SACRIFICE CANDIDATE only, never a Brilliant award.
    let bestImmediateRecovery = materialCp(taken, mover);
    const tacticalReplies = [];
    const ordinaryRecaptures = [];
    for (const reply of taken.moves({verbose:true}).filter(x => Boolean(x.captured))) {
      const temp = new Chess(taken.fen());
      temp.move({from:reply.from,to:reply.to,promotion:reply.promotion || undefined});
      bestImmediateRecovery = Math.max(bestImmediateRecovery, materialCp(temp,mover));

      // Winning a more valuable piece elsewhere with check is different
      // from simply retaking the capturer on the offered piece's square.
      const highValueTarget = (VALUES[reply.captured] ?? 0) >= VALUES.r;
      const differentSquare = reply.to !== capture.to;
      const forcesCheck = temp.isCheck() || temp.isCheckmate();
      const detail = {san:reply.san, captured:reply.captured, check:forcesCheck};
      if (highValueTarget && differentSquare && forcesCheck) {
        tacticalReplies.push(detail);
      } else if (reply.to === capture.to) {
        ordinaryRecaptures.push(detail);
      }
    }
    const permanentCost = Math.max(0,baselineMaterial - bestImmediateRecovery);
    greatestPermanentCostCp = Math.max(greatestPermanentCostCp, permanentCost);
    if (permanentCost >= 75) opponentCanGainMaterial = true;
    if (tacticalReplies.length) forcingCompensation = true;
    acceptedLines.push({capture:capture.san, scoreCp:score,
      approximateMaterialCostCp:permanentCost, tacticalReplies, ordinaryRecaptures});
  }
  return {verified:true,reason:'Audited capture responses',deepBefore,deepAfter,
    bestAlternativeCp,rootBestMove,playedUci,deepBestMovePlayed,deepCpGap,
    analysisDepth:depth,rootCandidates,
    bestAlternativeMethod:'single Stockfish search of the before-position FEN',
    worstAcceptedCp,materialCostCp:greatestPermanentCostCp,
    opponentCanGainMaterial,forcingCompensation,offeredCaptureCount:acceptedLines.length,acceptedLines};
}
