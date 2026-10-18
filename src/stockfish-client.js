
export class StockfishClient {
  constructor(workerUrl) {
    this.worker = new Worker(workerUrl);
    this.pending = null;
    this.ready = false;

    this.worker.onmessage = (event) => {
      const line = String(event.data);

      if (line === "uciok") {
        this.worker.postMessage("isready");
      }

      if (line === "readyok") {
        this.ready = true;
      }

      if (!this.pending) return;

      if (line.startsWith("info depth")) {
        const cp = line.match(/score cp (-?\d+)/);
        const mate = line.match(/score mate (-?\d+)/);

        if (cp) {
          this.pending.score = Number(cp[1]);
        }

        if (mate) {
          this.pending.mate = Number(mate[1]);
        }
      }

      if (line.startsWith("bestmove")) {
        const bestMove = line.split(" ")[1];

        this.pending.resolve({
          bestMove,
          scoreCp: this.pending.score,
          mate: this.pending.mate
        });

        this.pending = null;
      }
    };

    this.worker.postMessage("uci");
  }

  async analyze(fen, depth = 12) {
    while (!this.ready) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    if (this.pending) {
      throw new Error("Analysis already running");
    }

    return new Promise((resolve, reject) => {
      this.pending = {
        resolve,
        reject,
        score: null,
        mate: null
      };

      this.worker.postMessage("position fen " + fen);
      this.worker.postMessage("go depth " + depth);
    });
  }

  terminate() {
    this.worker.terminate();
  }
}
