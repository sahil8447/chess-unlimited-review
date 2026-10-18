
const output = document.getElementById("output");
const button = document.getElementById("start");

let engine = null;

button.addEventListener("click", () => {
  if (engine) {
    engine.terminate();
  }

  output.textContent = "Starting Stockfish...\n";

  engine = new Worker(
    "engine/stockfish-19-lite-single.js"
  );

  engine.onmessage = (event) => {
    const line = String(event.data);

    output.textContent += line + "\n";

    if (line === "uciok") {
      engine.postMessage("isready");
    }

    if (line === "readyok") {
      engine.postMessage("position startpos");
      engine.postMessage("go depth 12");
    }

    if (line.startsWith("bestmove")) {
      output.textContent +=
        "\nAnalysis completed successfully!";
    }
  };

  engine.onerror = (error) => {
    output.textContent +=
      "\nEngine error: " + error.message;
  };

  engine.postMessage("uci");
});

