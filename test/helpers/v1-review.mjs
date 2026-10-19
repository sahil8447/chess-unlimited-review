// Frozen extraction of V1 content pipeline at 25cd750; DOM writes suppressed only.
import {Chess} from 'chess.js';
import {detectSacrificeCandidate,verifyBrilliantCandidate} from './v11/tactics.js';
import {classifyBrilliantMove} from './v11/brilliantRules.js';
import {classifyMove,calculateAccuracy,classifyTacticalMove,calculateAlternativeLoss,calculateMoveAccuracy,winChance} from './v1-grading.mjs';
import {generateMoveExplanation} from './v11/moveExplanation.js';
import {detectMissedOpportunity} from './v1-miss.mjs';
export async function runV1Review(pgn,evaluatePosition,{onPhase=()=>{}}={}) {
const chess=new Chess();chess.loadPgn(pgn);
const signal=new AbortController().signal,assertActive=()=>{};
const result={isConnected:false};
let phase='base'; const phases={}; let phaseStart=performance.now();
const mark=name=>{phases[phase]=(phases[phase]||0)+performance.now()-phaseStart;phase=name;phaseStart=performance.now();onPhase(name);};
const evaluateReviewPosition=async(...args)=>{const target=args[1]===18?'deep':'base';if(phase!==target)mark(target);return evaluatePosition(...args);};
  const moves = chess.history({ verbose: true });
  if (!moves.length) throw new Error("No moves");
  const replay = new Chess();
  const initialFen = chess.header().FEN;
  if (initialFen) {
    replay.load(initialFen);
  }
  const reviewedMoves = [];
  const graphData = [];
  const MAX_DEEP_VERIFICATIONS = 12;
  // Stockfish returns scores from the side-to-move perspective.
  function toWhiteCp(evaluation, turn) {
    if (evaluation.mate !== null && evaluation.mate !== undefined) {
      return (turn === "w" ? 1 : -1) * Math.sign(evaluation.mate) * 10000;
    }
    if (!Number.isFinite(evaluation.score)) {
      throw new Error("Stockfish returned no evaluation");
    }
    return turn === "w" ? evaluation.score : -evaluation.score;
  }
  function uciOf(move) {
    return move.from + move.to + (move.promotion || "");
  }
  function terminalEvaluation(position) {
    if (position.isCheckmate()) {
      // The side to move has lost.
      return { bestMove: null, score: null, mate: -1, candidates: [] };
    }
    if (position.isGameOver()) {
      return { bestMove: null, score: 0, mate: null, candidates: [] };
    }
    return null;
  }

    // PASS 1: Evaluate every unique game position at depth 12.
    // Position i is shared by the previous move's AFTER and next move's BEFORE.
    const positionFens = [replay.fen()];
    const positionTurns = [replay.turn()];
    for (const move of moves) {
      replay.move(move.san);
      positionFens.push(replay.fen());
      positionTurns.push(replay.turn());
    }
    const evaluations = [];
    for (let i = 0; i < positionFens.length; i++) {
      const position = new Chess(positionFens[i]);
      try {
        evaluations.push(
          terminalEvaluation(position) ||
          await evaluateReviewPosition(positionFens[i], 12)
        );
      } catch (error) {
        if (signal.aborted) throw error;
        throw new Error(
          `Initial analysis failed at position ${i}/${moves.length}: ${error.message}`
        );
      }
      if (result.isConnected) {
        result.textContent = `Analyzing positions ${i + 1}/${positionFens.length}...`;
      }
    }
    // PASS 2: Find the largest evaluation jumps, then verify both
    // endpoint positions at depth 18. Each shared position is verified once.
    const beforeVerification = evaluations.map((evaluation, i) =>
      toWhiteCp(evaluation, positionTurns[i])
    );
    const suspicious = moves.map((move, i) => ({
      index: i,
      jump: Math.abs(beforeVerification[i + 1] - beforeVerification[i])
    }))
      .filter(({ index, jump }) =>
        jump >= 100 &&
        !new Chess(positionFens[index + 1]).isGameOver()
      )
      .sort((a, b) => b.jump - a.jump)
      .slice(0, MAX_DEEP_VERIFICATIONS)
      .sort((a, b) => a.index - b.index);
    const verifiedIndices = new Set();
    for (const { index } of suspicious) {
      for (const positionIndex of [index, index + 1]) {
        if (verifiedIndices.has(positionIndex)) continue;
        verifiedIndices.add(positionIndex);
        const position = new Chess(positionFens[positionIndex]);
        if (position.isGameOver()) continue;
        try {
          const deeper = await evaluateReviewPosition(positionFens[positionIndex], 18);
          if (Number.isFinite(deeper.score) || deeper.mate != null) {
            evaluations[positionIndex] = deeper;
          }
        } catch (error) {
          if (signal.aborted) throw error;
          console.warn(
            `[Deep Verification] Position ${positionIndex}: ${error.message}`
          );
        }
        if (result.isConnected) {
          result.textContent =
            `Verifying critical positions ${verifiedIndices.size}/${suspicious.length * 2}...`;
        }
      }
    }
    // PASS 3: Grade all moves ONLY AFTER the finalized evaluations exist.
    // Never overwrite a shared before/after evaluation inside this loop.
    replay.load(positionFens[0]);
    const whiteCps = evaluations.map((evaluation, i) =>
      toWhiteCp(evaluation, positionTurns[i])
    );
    graphData.push(...whiteCps.map((whiteCp, ply) => ({ ply, whiteCp })));
    let brilliantAuditCount = 0;
    for (let i = 0; i < moves.length; i++) {
      // Let the page paint between bounded local material audits.
      await new Promise(resolve => setTimeout(resolve, 0));
      assertActive();
      const move = moves[i];
      const player = move.color;
      const before = evaluations[i];
      const after = evaluations[i + 1];
      const beforeFen = positionFens[i];
      const beforePlayerCp = player === "w" ? whiteCps[i] : -whiteCps[i];
      const afterWhiteCp = whiteCps[i + 1];
      const afterPlayerCp = player === "w" ? afterWhiteCp : -afterWhiteCp;
      const bestMovePlayed =
        before.bestMove?.toLowerCase() === uciOf(move).toLowerCase();
      const legalChoices = replay.moves().length;
      const previousMove = moves[i - 1];
      const obviousRecapture = Boolean(move.captured && previousMove?.captured && previousMove.to === move.to);
      replay.move(move.san);
      const sacrificeCandidate = detectSacrificeCandidate(replay, move);
      const classification = classifyMove({
        beforeCp: beforePlayerCp,
        afterCp: afterPlayerCp,
        bestMovePlayed
      });
      const alternativeLoss = calculateAlternativeLoss(before.candidates);
      classification.grade = classifyTacticalMove({
        baseGrade: classification.grade,
        bestMovePlayed,
        beforeCp: beforePlayerCp,
        afterCp: afterPlayerCp,
        materialBefore: 0,
        materialAfter: 0,
        isCapture: Boolean(move.captured),
        isCheck: replay.isCheck(),
        alternativeLoss
      });
      // Step 47: Sacrifice verification is independent of initial grade.
      // This lets us inspect near-best offers too, but it never awards a
      // Brilliant without a real legal capture and favorable continuation.
      let brilliantDiagnostic = null;
      if (sacrificeCandidate && brilliantAuditCount >= 12) brilliantDiagnostic = "Audit budget exceeded; no promotion";
      if (sacrificeCandidate && !replay.isGameOver() && brilliantAuditCount < 12) {
        brilliantAuditCount++;
        const eloKey = player === "w" ? "WhiteElo" : "BlackElo";
        const elo = Number(chess.header()[eloKey]);
        const rating = Number.isFinite(elo) && elo > 0 ? elo : null;
        try {
          const verification = await verifyBrilliantCandidate({
            chess: replay,
            beforeFen,
            move,
            beforeCp: beforePlayerCp,
            afterCp: afterPlayerCp,
            bestMovePlayed,
            evaluatePosition: evaluateReviewPosition,
            depth: 18
          });
          assertActive();
          const decision = classifyBrilliantMove({
            baseGrade: classification.grade,
            verification,
            rating,
            bestMovePlayed,
            alternatives: before.candidates || []
          });
          brilliantDiagnostic = decision.reason;
          // Diagnostic only: do not promote any grade until engine tests pass.
          // To enable later, add an explicit validated feature flag.
          console.info(`[Brilliant audit] ${Number(beforeFen.split(" ")[5])}${player === "w" ? "." : "..."} ${move.san}: ${decision.reason}`, { verification, decision });
        } catch (error) {
          if (signal.aborted) throw error;
          brilliantDiagnostic = `Verification error: ${error.message}`;
          console.warn(`[Brilliant verification] ${move.san}:`, error);
        }
      }
      // A Miss is a failed tactical opportunity, not every ordinary error.
      // Use the finalized before-position PV from the two-pass analysis.
      const missedOpportunity = detectMissedOpportunity({
        beforeFen,
        bestVariation: before.pv || [],
        bestMovePlayed,
        beforePlayerCp,
        afterPlayerCp,
        color: player
      });
      if (
        missedOpportunity &&
        ["inaccuracy", "mistake", "blunder"].includes(classification.grade)
      ) {
        classification.grade = "miss";
      }

      reviewedMoves.push({
        legalChoices, obviousRecapture,
        number: Number(beforeFen.split(" ")[5]),
        color: player,
        san: move.san,
        initialGrade: classifyMove({beforeCp:beforePlayerCp,afterCp:afterPlayerCp,bestMovePlayed}).grade,
        uci:uciOf(move), depth:before.depth, afterDepth:after.depth, deepVerified:verifiedIndices.has(i),
        accuracyContribution:calculateMoveAccuracy(beforePlayerCp,afterPlayerCp),
        cpLoss:Math.max(0,beforePlayerCp-afterPlayerCp),
        grade: classification.grade,
        loss: classification.loss,
        bestMove: before.bestMove,
        bestMovePlayed,
        brilliantDiagnostic,
        evaluation: afterWhiteCp / 100,
        beforeFen: beforeFen,
bestVariation: before.pv || [],
        beforePlayerCp,
        afterPlayerCp,
        explanation: classification.grade === "miss" && missedOpportunity
          ? missedOpportunity.explanation
          : generateMoveExplanation({
              move,
              initialGrade: classifyMove({beforeCp:beforePlayerCp,afterCp:afterPlayerCp,bestMovePlayed}).grade,
        uci:uciOf(move), depth:before.depth, afterDepth:after.depth, deepVerified:verifiedIndices.has(i),
        accuracyContribution:calculateMoveAccuracy(beforePlayerCp,afterPlayerCp),
        cpLoss:Math.max(0,beforePlayerCp-afterPlayerCp),
        grade: classification.grade,
              beforeFen,
              afterFen: positionFens[i + 1],
              bestMove: before.bestMove,
              bestMovePlayed,
              beforePlayerCp,
              afterPlayerCp
            })
      });
      if (result.isConnected) {
        result.textContent = `Classifying ${i + 1}/${moves.length} moves...`;
      }
    }

mark('complete');
return {headers:chess.header(),reviewedMoves,graphData,whiteAccuracy:calculateAccuracy(reviewedMoves,'w'),blackAccuracy:calculateAccuracy(reviewedMoves,'b'),phases};
}
