import {normalizeEvaluation,evaluationCp,evaluationChance,formatEvaluation as formatTypedEvaluation} from './evaluation.js';
import { GRADES } from "./grading.js";
import { Chess } from "chess.js";

export function createReviewBoard(
  pgn,
  reviewedMoves,
  graphData,
  onMoveChange,
  evaluateLivePosition
) {
  const game = new Chess();
  game.loadPgn(pgn);

  const moves = game.history({ verbose: true });
  const replay = new Chess();
  if (game.header().FEN) replay.load(game.header().FEN);

  const positions = [replay.fen()];
  for (const move of moves) {
    replay.move(move.san);
    positions.push(replay.fen());
  }

  let destroyed = false;
  let currentPly = positions.length - 1;
  let flipped = false;
  let selectedSquare = null;
  let legalDestinations = [];
  let variationFens = [];
  let variationMoves = [];
  // Return to the reviewed game move after exploring a suggested engine line.
  let engineVariationReturnPly = null;

  // Exploration is independent of the imported game's saved evaluations.
  // Cache engine results by FEN, and discard responses for positions no longer shown.
  const liveEvaluationCache = new Map();
  let liveEvaluation = null;
  let liveEvaluationPending = false;
  let liveEvaluationError = "";
  let liveRequestVersion = 0;
  let liveDebounceTimer = null;
  let lastShownWhiteCp = graphData[currentPly]?.whiteCp ?? 0;

  function invalidateLiveEvaluation() {
    liveRequestVersion++;
    if (liveDebounceTimer !== null) {
      clearTimeout(liveDebounceTimer);
      liveDebounceTimer = null;
    }
    liveEvaluation = null;
    liveEvaluationPending = false;
    liveEvaluationError = "";
  }

  function formatEvaluation(whiteCp, mate = null) {
    if (mate !== null && mate !== undefined) {
      // The mate distance was reported from the side-to-move's perspective.
      return `${whiteCp >= 0 ? "+" : "-"}M${Math.abs(mate)}`;
    }
    if (!Number.isFinite(whiteCp)) return "—";
    return `${whiteCp >= 0 ? "+" : ""}${(whiteCp / 100).toFixed(2)}`;
  }

  function setEvaluationBar(whiteCp) {
    if (!Number.isFinite(whiteCp)) return;
    lastShownWhiteCp = whiteCp;
    evalWhite.style.height = `${100 / (1 + Math.exp(-whiteCp / 250))}%`;
    evalText.textContent = formatEvaluation(whiteCp);
  }

  function setTypedEvaluation(evaluation) {
    if(evaluation?.kind==='cp'){setEvaluationBar(evaluation.cp);return;}
    const chance=evaluationChance(evaluation);
    evalWhite.style.height=`${chance==null?50:chance*100}%`;
    evalText.textContent=formatTypedEvaluation(evaluation);
  }

  function requestLiveEvaluation() {
    invalidateLiveEvaluation();
    if (destroyed || !container.isConnected || !isExploring()) return;

    const fen = currentFen();
    const requestVersion = liveRequestVersion;
    const cached = liveEvaluationCache.get(fen);
    if (cached) {
      liveEvaluation = cached;
      render(false);
      return;
    }

    const position = new Chess(fen);
    if (position.isGameOver()) {
      // No engine search is needed for a checkmate or a drawn terminal position.
      const evaluation=normalizeEvaluation(position.isCheckmate()?{mate:-1}:{score:0},{turn:position.turn(),pov:'w',terminal:true});
      liveEvaluation={fen,evaluation,whiteCp:evaluationCp(evaluation),mate:null,bestMove:null};
      liveEvaluationCache.set(fen, liveEvaluation);
      if (liveEvaluationCache.size > 128) liveEvaluationCache.delete(liveEvaluationCache.keys().next().value);
      render(false);
      return;
    }

    if (typeof evaluateLivePosition !== "function") {
      liveEvaluationError = "Live engine not connected";
      render(false);
      return;
    }

    liveEvaluationPending = true;
    render(false);
    // Debouncing prevents a burst of intermediate searches during quick moves.
    liveDebounceTimer = setTimeout(async () => {
      liveDebounceTimer = null;
      try {
        const result = await evaluateLivePosition(fen, 12);
        if (destroyed || requestVersion !== liveRequestVersion || currentFen() !== fen || !isExploring()) return;

        const positionTurn=fen.split(' ')[1];
        const typed=normalizeEvaluation(result,{turn:positionTurn,pov:'w'});
        if(typed.kind==='unknown')throw new Error('Engine returned no position evaluation');
        const evaluation={fen,evaluation:typed,whiteCp:evaluationCp(typed),mate:null,bestMove:result.bestMove??null};
        liveEvaluationCache.set(fen, evaluation);
        if (liveEvaluationCache.size > 128) liveEvaluationCache.delete(liveEvaluationCache.keys().next().value);
        liveEvaluation = evaluation;
        liveEvaluationPending = false;
        liveEvaluationError = "";
        render(false);
      } catch (error) {
        if (destroyed || requestVersion !== liveRequestVersion || !isExploring() || currentFen() !== fen) return;
        liveEvaluationPending = false;
        liveEvaluationError = error?.message || "Engine request failed";
        console.error("[Chess Review] Live evaluation:", error);
        render(false);
      }
    }, 220);
  }

  const container = document.createElement("div");
  container.className = "chess-review-board-section";
  container.tabIndex = 0;
  container.setAttribute("aria-label", "Interactive chess review board");

  const info = document.createElement("div");
  info.className = "chess-board-info";

  const board = document.createElement("div");
  board.className = "chess-review-board";

  const boardWithEval = document.createElement("div");
  boardWithEval.className = "chess-board-with-eval";
  const evalBar = document.createElement("div");
  evalBar.className = "chess-eval-bar";
  const evalWhite = document.createElement("div");
  evalWhite.className = "chess-eval-white";
  const evalText = document.createElement("span");
  evalText.className = "chess-eval-text";
  evalBar.append(evalWhite, evalText);
  boardWithEval.append(evalBar, board);

  const controls = document.createElement("div");
  controls.className = "chess-board-controls";
  const variationControls = document.createElement("div");
  variationControls.className = "chess-variation-controls";

  function makeButton(label, title, parent, handler) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.title = title;
    button.addEventListener("click", handler);
    parent.appendChild(button);
    return button;
  }

  const first = makeButton("⏮", "First game position", controls, () => goToMove(0));
  const previous = makeButton("◀", "Previous move / undo exploration", controls, () => {
    if (variationMoves.length) undoVariation();
    else goToMove(currentPly - 1);
  });
  const next = makeButton("▶", "Next game move", controls, () => goToMove(currentPly + 1));
  const last = makeButton("⏭", "Final game position", controls, () => goToMove(moves.length));
  makeButton("⇅", "Flip board", controls, () => {
    flipped = !flipped;
    render(false);
  });

  const undoButton = makeButton("↶ Undo custom move", "Undo last exploratory move", variationControls, undoVariation);
  const resetButton = makeButton("Return to game", "Discard exploratory moves", variationControls, resetVariation);

  const promotionPicker = document.createElement("div");
  promotionPicker.className = "chess-promotion-picker";
  promotionPicker.hidden = true;

  const hint = document.createElement("div");
  hint.className = "chess-interaction-hint";
  hint.textContent = "Click a piece to see legal moves, then click a square. You can also drag pieces.";

  container.append(info, boardWithEval, controls, variationControls, hint, promotionPicker);

  function isExploring() {
    return variationMoves.length > 0;
  }

  function currentFen() {
    return isExploring() ? variationFens[variationFens.length - 1] : positions[currentPly];
  }

  function clearSelection() {
    selectedSquare = null;
    legalDestinations = [];
  }

  function resetVariation() {
    invalidateLiveEvaluation();
    if (engineVariationReturnPly !== null) {
      currentPly = engineVariationReturnPly;
    }
    engineVariationReturnPly = null;
    variationFens = [];
    variationMoves = [];
    clearSelection();
    promotionPicker.hidden = true;
    promotionPicker.replaceChildren();
    render();
  }

  function undoVariation() {
    if (!variationMoves.length) return;
    variationMoves.pop();
    variationFens.pop();
    if (!variationMoves.length) {
      variationFens = [];
      if (engineVariationReturnPly !== null) {
        currentPly = engineVariationReturnPly;
        engineVariationReturnPly = null;
      }
    }
    clearSelection();
    promotionPicker.hidden = true;
    promotionPicker.replaceChildren();
    render();
    requestLiveEvaluation();
  }

  function goToMove(ply) {
    engineVariationReturnPly = null;
    invalidateLiveEvaluation();
    currentPly = Math.max(0, Math.min(moves.length, Math.trunc(Number(ply) || 0)));
    variationFens = [];
    variationMoves = [];
    clearSelection();
    promotionPicker.hidden = true;
    promotionPicker.replaceChildren();
    render();
  }

  /**
   * Preview the first `count` moves of a Stockfish PV on the analysis board.
   * reviewPly is the 1-based game ply being explained; the PV starts from
   * the position immediately BEFORE that game move.
   * Returns false for illegal/outdated engine lines without changing the board.
   */
  function showEngineVariation(reviewPly, pv, count = 1) {
    const movePly = Number(reviewPly);
    if (!Number.isInteger(movePly) || movePly < 1 || movePly > moves.length ||
        !Array.isArray(pv) || !pv.length ||
        !Number.isInteger(count) || count < 1 || count > pv.length) {
      return false;
    }

    const basePly = movePly - 1;
    const preview = new Chess(positions[basePly]);
    const nextFens = [preview.fen()];
    const nextMoves = [];

    // Validate the entire requested prefix BEFORE replacing the current view.
    for (const uci of pv.slice(0, count)) {
      if (typeof uci !== "string" ||
          !/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci)) return false;
      try {
        const played = preview.move({
          from: uci.slice(0, 2),
          to: uci.slice(2, 4),
          ...(uci[4] ? { promotion: uci[4] } : {})
        });
        if (!played) return false;
        nextMoves.push(played);
        nextFens.push(preview.fen());
      } catch {
        return false;
      }
    }

    invalidateLiveEvaluation();
    currentPly = basePly;
    engineVariationReturnPly = movePly;
    variationFens = nextFens;
    variationMoves = nextMoves;
    clearSelection();
    promotionPicker.hidden = true;
    promotionPicker.replaceChildren();
    render(false);
    requestLiveEvaluation();
    return true;
  }

  function chooseSquare(squareName) {
    if (!promotionPicker.hidden) return;
    const chess = new Chess(currentFen());
    const piece = chess.get(squareName);

    if (selectedSquare && selectedSquare !== squareName) {
      const allowed = chess.moves({ square: selectedSquare, verbose: true })
        .filter(move => move.to === squareName);
      if (allowed.length) {
        if (allowed.some(move => move.promotion)) {
          showPromotionPicker(selectedSquare, squareName, allowed);
        } else {
          makeCustomMove(selectedSquare, squareName);
        }
        return;
      }
    }

    if (selectedSquare === squareName) {
      clearSelection();
    } else if (piece && piece.color === chess.turn()) {
      selectedSquare = squareName;
      legalDestinations = chess.moves({ square: squareName, verbose: true })
        .map(move => move.to);
    } else {
      clearSelection();
    }
    render(false);
  }

  function showPromotionPicker(from, to, allowedMoves) {
    promotionPicker.replaceChildren();
    promotionPicker.hidden = false;
    const heading = document.createElement("span");
    heading.textContent = "Promote pawn to:";
    promotionPicker.appendChild(heading);

    for (const [piece, label] of [["q", "Queen"], ["r", "Rook"], ["b", "Bishop"], ["n", "Knight"]]) {
      if (!allowedMoves.some(move => move.promotion === piece)) continue;
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.addEventListener("click", () => {
        promotionPicker.hidden = true;
        makeCustomMove(from, to, piece);
      });
      promotionPicker.appendChild(button);
    }
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.textContent = "Cancel";
    cancel.addEventListener("click", () => {
      promotionPicker.hidden = true;
      render(false);
    });
    promotionPicker.appendChild(cancel);
  }

  function makeCustomMove(from, to, promotion) {
    const chess = new Chess(currentFen());
    try {
      const details = { from, to };
      if (promotion) details.promotion = promotion;
      const played = chess.move(details);
      if (!played) return;
      if (!variationMoves.length) variationFens = [positions[currentPly]];
      variationMoves.push(played);
      variationFens.push(chess.fen());
      clearSelection();
      render(false);
      requestLiveEvaluation();
    } catch {
      // chess.js rejects illegal moves. Keep the current board unchanged.
      clearSelection();
      render(false);
    }
  }

  function drawBestMoveArrow(uci) {
    if (!uci || !/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci)) return;
    const files = "abcdefgh";
    let fromFile = files.indexOf(uci[0]);
    let fromRank = 8 - Number(uci[1]);
    let toFile = files.indexOf(uci[2]);
    let toRank = 8 - Number(uci[3]);

    if (flipped) {
      fromFile = 7 - fromFile;
      fromRank = 7 - fromRank;
      toFile = 7 - toFile;
      toRank = 7 - toRank;
    }

    const ns = "http://www.w3.org/2000/svg";
    const overlay = document.createElementNS(ns, "svg");
    overlay.classList.add("chess-best-move-overlay");
    overlay.setAttribute("viewBox", "0 0 800 800");
    overlay.setAttribute("preserveAspectRatio", "none");
    const markerId = "chess-review-arrowhead";
    const defs = document.createElementNS(ns, "defs");
    const marker = document.createElementNS(ns, "marker");
    marker.setAttribute("id", markerId);
    marker.setAttribute("markerWidth", "5");
    marker.setAttribute("markerHeight", "5");
    marker.setAttribute("refX", "3");
    marker.setAttribute("refY", "2.5");
    marker.setAttribute("orient", "auto");
    const head = document.createElementNS(ns, "path");
    head.setAttribute("d", "M0 0 L5 2.5 L0 5 Z");
    head.setAttribute("fill", "#81b64c");
    marker.appendChild(head);
    defs.appendChild(marker);
    overlay.appendChild(defs);
    const line = document.createElementNS(ns, "line");
    line.setAttribute("x1", fromFile * 100 + 50);
    line.setAttribute("y1", fromRank * 100 + 50);
    line.setAttribute("x2", toFile * 100 + 50);
    line.setAttribute("y2", toRank * 100 + 50);
    line.setAttribute("stroke", "#81b64c");
    line.setAttribute("stroke-width", "15");
    line.setAttribute("stroke-linecap", "round");
    line.setAttribute("opacity", "0.85");
    line.setAttribute("marker-end", `url(#${markerId})`);
    overlay.appendChild(line);
    board.appendChild(overlay);
  }

  function createMovePointBadge(reviewMove) {
    const gradeInfo = reviewMove && GRADES[reviewMove.grade];
    if (!gradeInfo) return null;
    const badge = document.createElement("div");
    badge.className = `chess-move-point-badge chess-grade-${reviewMove.grade}`;
    badge.title = gradeInfo.label;
    const symbol = document.createElement("span");
    symbol.className = "chess-move-point-symbol";
    symbol.textContent = gradeInfo.symbol || "•";
    const label = document.createElement("span");
    label.className = "chess-move-point-text";
    label.textContent = gradeInfo.label;
    badge.append(symbol, label);
    return badge;
  }

  function render(notify = true) {
    if (destroyed) return;
    const chess = new Chess(currentFen());
    const squares = chess.board();
    const exploring = isExploring();
    const lastMove = exploring
      ? variationMoves[variationMoves.length - 1]
      : currentPly > 0 ? moves[currentPly - 1] : null;
    const currentReview = !exploring && currentPly > 0
      ? reviewedMoves[currentPly - 1] : null;

    board.replaceChildren();
    board.style.position = "relative";

    for (let displayRank = 0; displayRank < 8; displayRank++) {
      for (let displayFile = 0; displayFile < 8; displayFile++) {
        const actualRank = flipped ? 7 - displayRank : displayRank;
        const actualFile = flipped ? 7 - displayFile : displayFile;
        const squareName = "abcdefgh"[actualFile] + (8 - actualRank);
        const piece = squares[actualRank][actualFile];
        const square = document.createElement("div");
        square.className = "chess-board-square";
        square.dataset.square = squareName;
        square.classList.add((actualRank + actualFile) % 2 === 0 ? "light" : "dark");
        if (lastMove && (squareName === lastMove.from || squareName === lastMove.to)) {
          square.classList.add("last-move");
        }
        if (squareName === selectedSquare) square.classList.add("chess-square-selected");
        if (legalDestinations.includes(squareName)) {
          square.classList.add(piece ? "chess-square-legal-capture" : "chess-square-legal");
        }

        if (piece) {
          const img = document.createElement("img");
          img.src = chrome.runtime.getURL(`pieces/${piece.color}${piece.type.toUpperCase()}.svg`);
          img.alt = `${piece.color === "w" ? "White" : "Black"} ${piece.type}`;
          img.className = "chess-piece-image";
          img.draggable = piece.color === chess.turn();
          if (img.draggable) {
            img.addEventListener("dragstart", event => {
              selectedSquare = squareName;
              legalDestinations = chess.moves({ square: squareName, verbose: true })
                .map(move => move.to);
              event.dataTransfer.setData("text/plain", squareName);
              event.dataTransfer.effectAllowed = "move";
              // Do not rerender here: replacing the dragged image ends the drag.
            });
          }
          square.appendChild(img);
        }

        if (!exploring && lastMove && squareName === lastMove.to) {
          const badge = createMovePointBadge(currentReview);
          if (badge) square.appendChild(badge);
        }

        square.addEventListener("click", () => chooseSquare(squareName));
        square.addEventListener("dragover", event => event.preventDefault());
        square.addEventListener("drop", event => {
          event.preventDefault();
          const from = event.dataTransfer.getData("text/plain");
          if (!/^[a-h][1-8]$/.test(from)) return;
          const dragChess = new Chess(currentFen());
          const allowed = dragChess.moves({ square: from, verbose: true })
            .filter(move => move.to === squareName);
          if (!allowed.length) {
            clearSelection();
            render(false);
          } else if (allowed.some(move => move.promotion)) {
            showPromotionPicker(from, squareName, allowed);
          } else {
            makeCustomMove(from, squareName);
          }
        });
        board.appendChild(square);
      }
    }

    if (exploring) {
      const last = variationMoves[variationMoves.length - 1];
      const currentLive = liveEvaluation?.fen === currentFen()
        ? liveEvaluation : null;
      info.textContent = `Exploring variation: ${last.san} · ${variationMoves.length} custom move(s)`;

      if (currentLive) {
        const evalLabel = currentLive.evaluation ? formatTypedEvaluation(currentLive.evaluation) : formatEvaluation(currentLive.whiteCp,currentLive.mate);
        info.textContent += ` | Live eval: ${evalLabel}`;
        if(currentLive.evaluation)setTypedEvaluation(currentLive.evaluation);else setEvaluationBar(currentLive.whiteCp);
        if (currentLive.mate !== null) evalText.textContent = evalLabel;
        if (!selectedSquare) drawBestMoveArrow(currentLive.bestMove);
      } else if (liveEvaluationPending) {
        info.textContent += " | Stockfish analyzing...";
        // Preserve the last bar height while Stockfish analyzes this position;
        // it is NOT a current-position evaluation until the response arrives.
        evalText.textContent = "...";
      } else if (liveEvaluationError) {
        info.textContent += ` | Live analysis unavailable: ${liveEvaluationError}`;
        evalText.textContent = "!";
      } else {
        info.textContent += " | Waiting for Stockfish...";
        evalText.textContent = "...";
      }
    } else {
      const gradeInfo = currentReview && GRADES[currentReview.grade];
      const moveTitle = currentPly === 0
        ? "Starting Position"
        : `${moves[currentPly - 1].before.split(" ")[5]}${moves[currentPly - 1].color === "w" ? "." : "..."} ${moves[currentPly - 1].san}`;
      const point=graphData[currentPly],evalCp=point?.whiteCp;
      const evalLabel=point?.evaluation?formatTypedEvaluation(point.evaluation):Number.isFinite(evalCp)?formatEvaluation(evalCp):'N/A';
      info.textContent=`${moveTitle}${gradeInfo?` · ${gradeInfo.symbol} ${gradeInfo.label}`:''} | Eval: ${evalLabel}`;
      if(point?.evaluation)setTypedEvaluation(point.evaluation);
      else if(Number.isFinite(evalCp))setEvaluationBar(evalCp);
      else{evalWhite.style.height='50%';evalText.textContent='—';}
      // This arrow describes the recommended NEXT game move.
      // No arrow at move 0, while selecting a piece, or during exploration.
      if (currentPly > 0 && !selectedSquare) {
        drawBestMoveArrow(reviewedMoves[currentPly]?.bestMove);
      }
    }

    first.disabled = !exploring && currentPly === 0;
    previous.disabled = !exploring && currentPly === 0;
    next.disabled = exploring || currentPly === moves.length;
    last.disabled = !exploring && currentPly === moves.length;
    undoButton.disabled = !exploring;
    resetButton.disabled = !exploring;

    if (notify && !exploring) onMoveChange?.(currentPly);
  }

  container.addEventListener("keydown", event => {
    if (event.target.closest("input, textarea, select, [contenteditable]")) return;
    if (event.key === "Escape") {
      promotionPicker.hidden = true;
      clearSelection();
      render(false);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      if (isExploring()) undoVariation();
      else goToMove(currentPly - 1);
    } else if (event.key === "ArrowRight" && !isExploring()) {
      event.preventDefault();
      goToMove(currentPly + 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      goToMove(0);
    } else if (event.key === "End") {
      event.preventDefault();
      goToMove(moves.length);
    }
  });

  render();

  function destroy() {
    destroyed = true;
    invalidateLiveEvaluation();
    liveEvaluationCache.clear();
  }
  function updateAnalysis(nextMoves, nextGraph, onChange) {
    if (destroyed || nextMoves.length !== moves.length || nextGraph.length !== positions.length) return false;
    reviewedMoves = nextMoves;
    graphData = nextGraph;
    onMoveChange = onChange;
    render(false);
    return true;
  }
  return { element: container, goToMove, showEngineVariation, destroy, updateAnalysis, getCurrentPly: () => currentPly };
}
