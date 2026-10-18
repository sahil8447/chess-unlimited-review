
importScripts("./stockfish-19-lite-single.js");

const stockfish = STOCKFISH();

stockfish.then((engine) => {
  engine.addMessageListener((line) => {
    self.postMessage(line);
  });

  self.onmessage = (event) => {
    engine.postMessage(event.data);
  };

  self.postMessage("ENGINE_READY");
}).catch((error) => {
  self.postMessage("ENGINE_ERROR: " + error.message);
});
