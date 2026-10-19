import { estimatePerformance } from "./performanceRating.js";
import { detectChessComGame, fetchCurrentChessComPgn } from "./chesscomPgn.js";
import { detectMissedOpportunity } from "./missDetection.js";
import { classifyBrilliantMove } from "./brilliantRules.js";
import { generateMoveExplanation } from "./moveExplanation.js";
import { createEvaluationGraph } from "./graph.js";
import { Chess } from "chess.js";
import { createReviewBoard } from "./board.js";
import {
  materialBalance,
  detectSacrificeCandidate,
  verifyBrilliantCandidate
} from "./tactics.js";
import {
  GRADES,
  classifyMove,
  calculateAccuracy,
  classifyTacticalMove,
  calculateAlternativeLoss
} from "./grading.js";
(() => {
  const BUTTON_ID = "chess-unlimited-review-btn";
  const PANEL_ID = "chess-unlimited-review-panel";
  const panelSessions = new WeakMap();
  let pageIdentity = location.pathname;
  function closePanel(panel) {
    delete window.chessReviewResults;
    const session = panelSessions.get(panel);
    session?.controller.abort();
    session?.review?.abort();
    session?.board?.destroy();
    panelSessions.delete(panel);
    panel.remove();
  }
  function isGamePage() {
    return /^\/(game|analysis|games|play)(?:\/|$)/.test(
      location.pathname
    );
  }
  function createButton() {
    if (!isGamePage()) return;
    if (document.getElementById(BUTTON_ID)) return;
    const button = document.createElement("button");
    button.id = BUTTON_ID;
    button.textContent = "♟ Unlimited Review";
    button.onclick = openPanel;
    document.body.appendChild(button);
  }
async function autoFetchAndReview(panel) {
  const input = panel.querySelector("#chess-review-pgn");
  const result = panel.querySelector("#chess-review-result");
  const button = panel.querySelector("#chess-review-import");
  const importSignal = panelSessions.get(panel).controller.signal;
  button.disabled = true;
  result.textContent = "Fetching game from Chess.com...";
  try {
    const pgn = await fetchCurrentChessComPgn({signal: AbortSignal.any([importSignal, AbortSignal.timeout(15000)])});
    if (!panel.isConnected || importSignal.aborted) return;
    // Validate before passing it to Stockfish.
    const testGame = new Chess();
    testGame.loadPgn(pgn);
    if (!testGame.history().length) {
      throw new Error("No moves found in fetched game");
    }
    input.value = pgn;
    // Hide PGN editor to leave room for the board.
    const details = panel.querySelector(".chess-pgn-details");
    if (details) {
      details.open = false;
    }
    button.disabled = false;
    // Existing analysis: engine, grading, graph,
    // board, move badges and information card.
    await analyzeGame();
  } catch (error) {
    if (!panel.isConnected || importSignal.aborted) return;
    console.error("[Chess Review Auto Fetch]", error);
    result.textContent =
      "Automatic import unavailable: " +
      error.message +
      "\n\nYou can still paste a PGN and click Analyze Game.";
    const details = panel.querySelector(".chess-pgn-details");
    if (details) {
      details.open = true;
    }
  } finally {
    if (panel.isConnected && !importSignal.aborted) {
      button.disabled = false;
    }
  }
}
function openPanel() {
  const existing = document.getElementById(PANEL_ID);
  if (existing) {
    closePanel(existing);
    return;
  }
  // Create the panel FIRST.
  const panel = document.createElement("div");
  panel.id = PANEL_ID;
  panelSessions.set(panel, {controller: new AbortController(), review: null, board: null});
  panel.innerHTML = `
    <h2>♟ Unlimited Review</h2>
    <textarea
      id="chess-review-pgn"
      placeholder="Paste your completed game's PGN..."
      rows="7"
    ></textarea>
    <button id="chess-review-import">
      Analyze Game
    </button>
    <button id="chess-review-fetch" type="button">Retry current game import</button>
    <button id="chess-review-cancel" type="button">Cancel analysis</button>
    <div id="chess-review-result" role="status" aria-live="polite"></div>
  `;
  // Close button.
  const closeButton = document.createElement("button");
  closeButton.className = "chess-review-close";
  closeButton.textContent = "✕";
  closeButton.title = "Close Review";
  closeButton.setAttribute("aria-label", "Close Review");
  closeButton.addEventListener("click", () => {
    closePanel(panel);
  });
  panel.prepend(closeButton);
  // Escape key closes the panel when focus is inside it.
  panel.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closePanel(panel);
    }
  });
  // Collapsible PGN editor.
  const pgnInput = panel.querySelector("#chess-review-pgn");
  const pgnDetails = document.createElement("details");
  pgnDetails.className = "chess-pgn-details";
  pgnDetails.open = true;
  const pgnSummary = document.createElement("summary");
  pgnSummary.textContent = "Import Game PGN";
  pgnInput.before(pgnDetails);
  pgnDetails.append(pgnSummary, pgnInput);
  // Display the panel.
  document.body.appendChild(panel);
  // Manual analysis still works.
  const analyzeButton = panel.querySelector(
    "#chess-review-import"
  );
  analyzeButton.addEventListener("click", () => {
    if (!analyzeButton.disabled) {
      void analyzeGame();
    }
  });
  panel.querySelector('#chess-review-fetch').addEventListener('click', () => {
    if (!analyzeButton.disabled) void autoFetchAndReview(panel);
  });
  panel.querySelector('#chess-review-cancel').addEventListener('click', () => {
    const session = panelSessions.get(panel);
    session.review?.abort();
    session.review = null;
    session.controller.abort();
    session.controller = new AbortController();
    session.board?.destroy();
    delete window.chessReviewResults;
    panel.querySelector('#chess-review-result').textContent = 'Analysis canceled. Retry import or analyze a PGN.';
    analyzeButton.disabled = false;
    analyzeButton.textContent = 'Analyze Game';
  });
  // Automatically import completed Chess.com games.
  if (
    detectChessComGame(location.pathname)
  ) {
    void autoFetchAndReview(panel);
  }
}
  function log(message) {
    const result = document.getElementById(
      "chess-review-result"
    );
    if (result) {
      result.textContent += message + "\n";
      result.scrollTop = result.scrollHeight;
    }
  }
async function evaluatePosition(fen, depth = 12, options = {}) {
  options.signal?.throwIfAborted();
  const result = await chrome.runtime.sendMessage({
    type: "ANALYZE_POSITION",
    fen,
    depth,
    searchmoves: options.searchmoves,
    multiPV: options.multiPV
  });
  options.signal?.throwIfAborted();
  if (!result?.success) {
    throw new Error(
      result?.error || "Stockfish analysis failed"
    );
  }
  return {
  depth: result.depth,
  bestMove: result.bestMove,
  score: result.scoreCp,
  mate: result.mate,
  pv: result.pv || [],
  candidates: result.candidates || []
};
}
async function analyzeGame() {
  const input = document.getElementById("chess-review-pgn");
  const result = document.getElementById("chess-review-result");
  const button = document.getElementById("chess-review-import");
  if (!input || !result || !button) return;
  if (button.disabled) return;
  const panel = input.closest(`#${PANEL_ID}`);
  const session = panelSessions.get(panel);
  if (!session) return;
  session.review?.abort();
  session.board?.destroy();
  session.board = null;
  const controller = new AbortController();
  session.review = controller;
  const signal = AbortSignal.any([session.controller.signal, controller.signal]);
  const assertActive = () => {
    if (!result.isConnected || session.review !== controller) controller.abort();
    signal.throwIfAborted();
  };
  const evaluateReviewPosition = async (fen, depth, options = {}) => {
    assertActive();
    return evaluatePosition(fen, depth, {...options, signal});
  };
  const pgn = input.value.trim();
  delete window.chessReviewResults;
  result.replaceChildren();
  const chess = new Chess();
  try {
    chess.loadPgn(pgn);
  } catch (error) {
    result.textContent = "Invalid PGN: " + error.message;
    return;
  }
  const moves = chess.history({ verbose: true });
  if (!moves.length) {
    result.textContent = "No moves found.";
    return;
  }
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
  button.disabled = true;
  button.textContent = "Analyzing...";
  try {
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
assertActive();
const whiteAccuracy = calculateAccuracy(reviewedMoves, "w");
const blackAccuracy = calculateAccuracy(reviewedMoves, "b");
const performance = Object.fromEntries(['w', 'b'].map(color => [color, estimatePerformance({moves: reviewedMoves, color, headers: chess.header(), complete: true, customStart: Boolean(initialFen)})]));
const gradeCounts = {
  White: {},
  Black: {}
};
for (const move of reviewedMoves) {
  const player = move.color === "w" ? "White" : "Black";
  gradeCounts[player][move.grade] =
    (gradeCounts[player][move.grade] || 0) + 1;
}
console.log("[Chess Review Grade Counts]");
console.table(gradeCounts);
    // Store results for the graph and review UI.
    window.chessReviewResults = {
      pgn, headers: chess.header(), performance,
      reviewedMoves,
      graphData,
      whiteAccuracy,
      blackAccuracy
    };
    // Render the accuracy summary.
    const heading = document.createElement("h3");
    heading.textContent = "Game Review Complete";
    const accuracy = document.createElement("div");
    accuracy.className = "chess-accuracy-summary";
    accuracy.textContent =
    `White Estimated Accuracy: ${whiteAccuracy?.toFixed(1) ?? "N/A"}%\n` +
`Black Estimated Accuracy: ${blackAccuracy?.toFixed(1) ?? "N/A"}%`;
    result.replaceChildren(heading, accuracy);
    const players = document.createElement('div');
    players.className = 'chess-player-summary';
    for (const [color, label, estimatedAccuracy] of [['w', 'White', whiteAccuracy], ['b', 'Black', blackAccuracy]]) {
      const card = document.createElement('div');
      const estimate = performance[color];
      card.title = 'Unofficial, uncalibrated single-game model estimate, not official Elo or Chess.com rating. The range is heuristic uncertainty, not a statistical confidence interval.';
      card.textContent = `${label}: ${chess.header()[label] || 'Unknown'} · Actual game rating: ${chess.header()[label + 'Elo'] || 'Unavailable'}\nEstimated Performance Rating: ${estimate.rating === null ? 'Insufficient data — ' + estimate.reason : estimate.rating + ' ± ' + estimate.uncertainty + ' (' + estimate.confidence + ' confidence)'}\nEstimated accuracy: ${estimatedAccuracy?.toFixed(1) ?? 'N/A'}%`;
      players.appendChild(card);
    }
    const gameMetadata = document.createElement('p');
    gameMetadata.textContent = `Result: ${chess.header().Result || '*'} · Time control: ${chess.header().TimeControl || 'Unavailable'} · Unofficial review estimates`;
    result.append(players, gameMetadata);
{
  const counts = {
    w: {},
    b: {}
  };
  for (const reviewedMove of reviewedMoves) {
    const playerCounts = counts[reviewedMove.color];
    if (!playerCounts) continue;
    playerCounts[reviewedMove.grade] =
      (playerCounts[reviewedMove.grade] ?? 0) + 1;
  }
  const summary = document.createElement("div");
  summary.className = "chess-grade-summary";
  const title = document.createElement("h3");
  title.textContent = "Move Classification Summary";
  summary.appendChild(title);
  const table = document.createElement("table");
  table.className = "chess-grade-table";
  const header = table.insertRow();
  ["Classification", "White", "Black"].forEach(label => {
    const cell = document.createElement("th");
    cell.textContent = label;
    header.appendChild(cell);
  });
  const gradeNames = [
    "brilliant",
    "great",
    "best",
    "excellent",
    "good",
    "inaccuracy",
    "mistake",
    "miss",
    "blunder"
  ];
  for (const gradeName of gradeNames) {
    const row = table.insertRow();
    const label = row.insertCell();
    label.textContent = GRADES[gradeName].label;
    label.style.color = GRADES[gradeName].color;
    row.insertCell().textContent =
      counts.w[gradeName] ?? 0;
    row.insertCell().textContent =
      counts.b[gradeName] ?? 0;
  }
  summary.appendChild(table);
  result.appendChild(summary);
}
const debugSection = document.createElement("details");
debugSection.className = "chess-debug-section";
const debugTitle = document.createElement("summary");
debugTitle.textContent = "Detailed Move Analysis";
debugSection.appendChild(debugTitle);
const debugTable = document.createElement("table");
debugTable.className = "chess-debug-table";
const debugHeader = document.createElement("tr");
for (const name of [
  "Move", "Grade", "Before", "After", "Win Loss", "Brilliant check"
]) {
  const th = document.createElement("th");
  th.textContent = name;
  debugHeader.appendChild(th);
}
debugTable.appendChild(debugHeader);
for (const move of reviewedMoves) {
  const row = document.createElement("tr");
  const cells = [
    `${move.number}${move.color === "w" ? "." : "..."} ${move.san}`,
    GRADES[move.grade]?.label || move.grade,
    Number.isFinite(move.beforePlayerCp)
      ? (move.beforePlayerCp / 100).toFixed(2)
      : "N/A",
    Number.isFinite(move.afterPlayerCp)
      ? (move.afterPlayerCp / 100).toFixed(2)
      : "N/A",
    Number.isFinite(move.loss)
      ? `${(move.loss * 100).toFixed(1)}%`
      : "N/A",
    move.brilliantDiagnostic || "—"
  ];
  for (const value of cells) {
    const td = document.createElement("td");
    td.textContent = value;
    row.appendChild(td);
  }
  debugTable.appendChild(row);
}
debugSection.appendChild(debugTable);
result.appendChild(debugSection);
const moveInfoCard = document.createElement("section");
moveInfoCard.className = "chess-move-info-card";
const explanations = {
  brilliant: "A sacrifice that passed the engine's tactical verification.",
  great: "A critical move with significantly weaker alternatives.",
  best: "This matches Stockfish's preferred move.",
  excellent: "A strong move that preserves nearly all winning chances.",
  good: "A reasonable move that maintains the position.",
  inaccuracy: "This move slightly reduced your winning chances.",
  mistake: "This move significantly worsened your position.",
  miss: "You missed a significant tactical opportunity.",
  blunder: "This move caused a major loss of winning chances."
};
function formatBestMove(uci, ply) {
  if (!uci || uci.length < 4) return "Not available";
  try {
    // Get the position before the selected move.
    const fen = moves[ply - 1]?.before;
    if (fen) {
      const position = new Chess(fen);
      const best = position.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci[4] || undefined
      });
      if (best) return best.san;
    }
  } catch (error) {
    // Fall back to coordinate notation.
  }
  return `${uci.slice(0, 2)} → ${uci.slice(2, 4)}`;
}
function formatEngineVariation(fen, pv, maxMoves = 10) {
  if (!fen || !Array.isArray(pv)) return [];
  try {
    const position = new Chess(fen);
    const formatted = [];
    for (const uci of pv.slice(0, maxMoves)) {
      if (
        typeof uci !== "string" ||
        !/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci)
      ) {
        break;
      }
      const moveNumber = position.moveNumber();
      const side = position.turn();
      let played;
      try {
        played = position.move({
          from: uci.slice(0, 2),
          to: uci.slice(2, 4),
          promotion: uci[4] || undefined
        });
      } catch {
        // Stop at an invalid or unsupported move.
        break;
      }
      if (!played) break;
      const prefix =
        side === "w"
          ? `${moveNumber}.`
          : `${moveNumber}...`;
      formatted.push(`${prefix} ${played.san}`);
    }
    return formatted;
  } catch (error) {
    console.warn(
      "[Chess Review] PV conversion failed:",
      error.message
    );
    return [];
  }
}
function updateMoveInfo(ply) {
  moveInfoCard.replaceChildren();
  if (ply === 0) {
    moveInfoCard.textContent =
      "Starting position — select a move to view its analysis.";
    return;
  }
  const move = reviewedMoves[ply - 1];
  if (!move) return;
  const gradeInfo = GRADES[move.grade];
  const header = document.createElement("div");
  header.className = "chess-info-header";
  const title = document.createElement("div");
  title.className = "chess-info-title";
  const badge = document.createElement("span");
  badge.className = `chess-info-badge chess-grade-${move.grade}`;
  badge.textContent = gradeInfo?.symbol || "•";
  const name = document.createElement("div");
  const moveNumber =
    `${move.number}${move.color === "w" ? "." : "..."}`;
  name.textContent = `${moveNumber} ${move.san}`;
  const gradeName = document.createElement("small");
  gradeName.textContent = gradeInfo?.label || move.grade;
  gradeName.style.color = gradeInfo?.color || "#ffffff";
  title.append(badge, name, gradeName);
  const evaluation = document.createElement("strong");
  evaluation.className = "chess-info-evaluation";
  const value = move.evaluation;
  evaluation.textContent = Number.isFinite(value)
    ? `${value >= 0 ? "+" : ""}${value.toFixed(2)}`
    : "N/A";
  header.append(title, evaluation);
  const explanation = document.createElement("p");
  explanation.className = "chess-info-explanation";
 explanation.textContent =
  move.explanation ||
  explanations[move.grade] ||
  "Move analyzed by Stockfish.";
  const recommendation = document.createElement("div");
  recommendation.className = "chess-info-recommendation";
  const recommendationLabel = document.createElement("span");
  recommendationLabel.textContent = "Stockfish recommended";
  const recommendationMove = document.createElement("strong");
  recommendationMove.textContent =
    formatBestMove(move.bestMove, ply);
  recommendation.append(
    recommendationLabel,
    recommendationMove
  );
  const footer = document.createElement("div");
  footer.className = "chess-info-footer";
  footer.textContent = move.bestMovePlayed
    ? "✓ You played Stockfish's preferred move."
    : "The recommendation shows the engine's choice before your move.";
  moveInfoCard.append(
    header,
    explanation,
    recommendation,
    footer
  );
const variation = formatEngineVariation(
  move.beforeFen,
  move.bestVariation
);
const variationSection = document.createElement("div");
variationSection.className = "chess-pv-section";
const variationTitle = document.createElement("h4");
variationTitle.textContent =
  "Stockfish Recommended Continuation";
variationSection.appendChild(variationTitle);
if (variation.length > 0) {
  const variationMoves = document.createElement("div");
  variationMoves.className = "chess-pv-moves";
  variation.forEach((san, index) => {
    const moveElement = document.createElement("button");
    moveElement.type = "button";
    moveElement.className = "chess-pv-move chess-pv-clickable";
    moveElement.textContent = san;
    moveElement.title = `Preview Stockfish line through ${san}`;
    moveElement.setAttribute("aria-label", `Preview variation through ${san}`);
    moveElement.addEventListener("click", () => {
      // Clicking each token replays the variation from BEFORE this game move.
      // It never edits the original game or changes its grade/accuracy.
      const success = reviewBoard.showEngineVariation(
        ply, move.bestVariation, index + 1
      );
      if (success) {
        variationMoves.querySelectorAll(".chess-pv-move")
          .forEach((element, i) => {
            element.classList.toggle("chess-pv-active", i <= index);
            element.setAttribute("aria-pressed", String(i === index));
          });
      } else {
        console.warn("[Chess Review] Could not preview selected PV move", san);
      }
    });
    variationMoves.appendChild(moveElement);
  });
  variationSection.appendChild(variationMoves);
} else {
  const empty = document.createElement("p");
  empty.textContent =
    "No engine continuation available for this position.";
  variationSection.appendChild(empty);
}
moveInfoCard.appendChild(variationSection);
}
const reviewBoard = createReviewBoard(
  pgn,
  reviewedMoves,
  graphData,
  ply => {
    updateMoveInfo(ply);
    const rows = result.querySelectorAll(".chess-move-row");
    rows.forEach((row, index) => {
      row.classList.toggle(
        "chess-move-selected",
        index === ply - 1
      );
    });
  },
  evaluatePosition
);
session.board = reviewBoard;
result.appendChild(reviewBoard.element);
const graph = createEvaluationGraph(
  graphData,
  reviewedMoves,
  ply => {
    reviewBoard.goToMove(ply);
    const rows = result.querySelectorAll(
      ".chess-move-row"
    );
    rows.forEach(row => {
      row.classList.remove("chess-move-selected");
    });
    if (ply > 0 && rows[ply - 1]) {
      const selected = rows[ply - 1];
      selected.classList.add("chess-move-selected");
      selected.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
      });
    }
  }
);
result.appendChild(graph);
const dashboard = document.createElement("div");
dashboard.className = "chess-review-dashboard";
const leftColumn = document.createElement("div");
leftColumn.className = "chess-dashboard-left";
const rightColumn = document.createElement("div");
rightColumn.className = "chess-dashboard-right";
const moveList = document.createElement("div");
moveList.className = "chess-move-list";
leftColumn.append(
  reviewBoard.element,
  moveInfoCard
);
rightColumn.append(graph, moveList);
dashboard.append(leftColumn, rightColumn);
result.appendChild(dashboard);
    // Render each classified move.
    for (const move of reviewedMoves) {
      const gradeInfo = GRADES[move.grade];
      const row = document.createElement("div");
      row.className = "chess-move-row";
      row.tabIndex = 0;
      row.setAttribute("role", "button");
      row.setAttribute("aria-label", `${move.number}${move.color === "w" ? "." : "..."} ${move.san}, ${gradeInfo.label}`);
      const moveName = document.createElement("span");
      moveName.textContent =
        `${move.number}${move.color === "w" ? "." : "..."} ${move.san}`;
      const grade = document.createElement("span");
      grade.textContent =
        `${gradeInfo.symbol} ${gradeInfo.label}`;
      grade.style.color = gradeInfo.color;
      grade.style.fontWeight = "bold";
      row.append(moveName, grade);
const selectedPly = reviewedMoves.indexOf(move) + 1;
row.addEventListener("click", () => {
  reviewBoard.goToMove(selectedPly);
});
row.addEventListener('keydown', event => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    reviewBoard.goToMove(selectedPly);
  }
});
moveList.appendChild(row);
}
updateMoveInfo(reviewedMoves.length);
  } catch (error) {
    if (signal.aborted) return;
    console.error("[Chess Review]", error);
    result.textContent =
      "Analysis failed: " + error.message;
  } finally {
    if (session.review === controller && button.isConnected) {
      button.disabled = false;
      button.textContent = "Analyze Game";
    }
  }
}
  function update() {
    if (pageIdentity !== location.pathname) {
      pageIdentity = location.pathname;
      const previous = document.getElementById(PANEL_ID);
      if (previous) closePanel(previous);
    }
    if (!isGamePage()) {
      document.getElementById(BUTTON_ID)?.remove();
      const panel = document.getElementById(PANEL_ID);
      if (panel) closePanel(panel);
      return;
    }
    createButton();
  }
  new MutationObserver(update).observe(
    document.documentElement,
    { childList: true, subtree: true }
  );
  window.navigation?.addEventListener("currententrychange", update);
  addEventListener("popstate", update);
  addEventListener("hashchange", update);
  update();
})();
