let engine = null;
let initPromise = null;
let pending = null;
let queue = Promise.resolve();

const ENGINE_URL = "engine/stockfish-19-lite-single.js";
const INIT_TIMEOUT_MS = 30000;
const SEARCH_TIMEOUT_MS = 120000;


function parseMultiPVLine(line) {
  if (!line.startsWith("info ")) return null;

  const depthMatch = line.match(/\bdepth (\d+)/);
  const rankMatch = line.match(/\bmultipv (\d+)/);
  const cpMatch = line.match(/\bscore cp (-?\d+)/);
  const mateMatch = line.match(/\bscore mate (-?\d+)/);

  // Capture the COMPLETE principal variation.
  const pvMatch = line.match(/\bpv\s+(.+)$/);

  if (!depthMatch || !pvMatch) return null;
  if (!cpMatch && !mateMatch) return null;

  const pv = pvMatch[1]
    .trim()
    .split(/\s+/)
    .filter(move =>
      /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(move)
    );

  if (!pv.length) return null;

  return {
    bound: /\b(?:lowerbound|upperbound)\b/.test(line),
    depth: Number(depthMatch[1]),
    rank: rankMatch ? Number(rankMatch[1]) : 1,
    move: pv[0],
    pv,
    scoreCp: cpMatch ? Number(cpMatch[1]) : null,
    mate: mateMatch ? Number(mateMatch[1]) : null
  };
}


function resetEngine(reason = "Stockfish worker reset") {
  const active = pending;
  pending = null;
  if (active) {
    clearTimeout(active.timer);
    active.reject(new Error(reason));
  }
  if (engine) {
    engine.terminate();
    engine = null;
  }
  initPromise = null;
}

function initializeEngine() {
  if (initPromise) return initPromise;

  initPromise = new Promise((resolve, reject) => {
    const worker = new Worker(chrome.runtime.getURL(ENGINE_URL));
    engine = worker;
    let initialized = false;

    const timer = setTimeout(() => {
      if (initialized || engine !== worker) return;
      resetEngine("Stockfish initialization timed out");
      reject(new Error("Stockfish initialization timed out"));
    }, INIT_TIMEOUT_MS);

    worker.onmessage = event => {
      if (engine !== worker) return;
      const lines = String(event.data).split(/\r?\n/);

      for (const raw of lines) {
        const line = raw.trim();
        if (!line) continue;

        if (line === "uciok") {
          worker.postMessage("isready");
          continue;
        }

        if (line === "readyok") {
          if (!initialized) {
            initialized = true;
            clearTimeout(timer);
            resolve();
          }
          continue;
        }

        if (pending && line.startsWith("info ")) {
          const candidate = parseMultiPVLine(line);
          if (!candidate) continue;

          if (candidate.depth > pending.maxDepth) {
            pending.maxDepth = candidate.depth;
            pending.candidates.clear();
          }
          if (candidate.depth === pending.maxDepth) {
            pending.candidates.set(candidate.rank, candidate);
          }
        }

        if (pending && line.startsWith("bestmove")) {
          const job = pending;
          pending = null;
          clearTimeout(job.timer);

          const bestMove = line.split(/\s+/)[1] || null;
          const candidates = [...job.candidates.values()]
            .sort((a, b) => a.rank - b.rank);
          const primary = candidates.find(c => c.rank === 1);

          job.resolve({
            bestMove: bestMove === "(none)" ? null : bestMove,
            scoreCp: primary?.scoreCp ?? null,
            mate: primary?.mate ?? null,
            pv: primary?.pv ?? [],
            candidates,
            depth: job.maxDepth
          });
        }
      }
    };

    worker.onerror = event => {
      if (engine !== worker) return;
      clearTimeout(timer);
      const message = event.message || "Stockfish worker failed";
      resetEngine(message);
      if (!initialized) reject(new Error(message));
    };

    worker.postMessage("uci");
  });

  return initPromise;
}

async function analyzePosition(fen, depth = 12, searchmoves = [], multiPV = searchmoves.length ? Math.min(searchmoves.length, 3) : 3) {
  if (!Array.isArray(searchmoves) || searchmoves.length > 218 ||
      searchmoves.some(move => typeof move !== "string" || !/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(move)))
    throw new Error("Invalid root search moves");
  if (!Number.isInteger(multiPV) || multiPV < 1 || multiPV > 3 || (searchmoves.length && multiPV > searchmoves.length))
    throw new Error("Invalid MultiPV count");
  if (typeof fen !== "string" || !fen.trim()) {
    throw new Error("Missing FEN");
  }
  const requestedDepth = Number(depth);
  if (!Number.isInteger(requestedDepth) || requestedDepth < 1 || requestedDepth > 24) {
    throw new Error("Invalid engine depth");
  }

  await initializeEngine();

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      resetEngine(`Stockfish search timed out at depth ${requestedDepth}`);
    }, SEARCH_TIMEOUT_MS);

    pending = {
      resolve,
      reject,
      timer,
      candidates: new Map(),
      maxDepth: -1
    };

    engine.postMessage("setoption name MultiPV value " + multiPV);
    engine.postMessage("position fen " + fen);
    engine.postMessage("go depth " + requestedDepth + (searchmoves.length ? " searchmoves " + searchmoves.join(" ") : ""));
  });
}

// Serialize all requests. Long-game review and live exploration
// may share the same offscreen Stockfish worker.
const evaluationCache = new Map();
function enqueuePosition(fen, depth, searchmoves = [], multiPV = searchmoves.length ? Math.min(searchmoves.length, 3) : 3) {
  const key = JSON.stringify([fen, depth ?? 12, searchmoves, multiPV]);
  if (evaluationCache.has(key)) return evaluationCache.get(key);
  const job = queue.then(() => analyzePosition(fen, depth, searchmoves, multiPV));
  queue = job.catch(() => {});
  evaluationCache.set(key, job);
  job.catch(() => evaluationCache.delete(key));
  if (evaluationCache.size > 256) evaluationCache.delete(evaluationCache.keys().next().value);
  return job;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== "OFFSCREEN_ANALYZE") return;

  enqueuePosition(message.fen, message.depth ?? 12, message.searchmoves ?? [], message.multiPV)
    .then(result => sendResponse({ success: true, ...result }))
    .catch(error => sendResponse({
      success: false,
      error: error.message
    }));

  return true;
});

console.log("[Chess Review] Offscreen document loaded");
