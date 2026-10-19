
let creatingOffscreen = null;

async function ensureOffscreenDocument() {
  const url = chrome.runtime.getURL("offscreen.html");

  if (creatingOffscreen) {
    await creatingOffscreen;
    return;
  }

  if (await chrome.offscreen.hasDocument()) {
    return;
  }

  creatingOffscreen = chrome.offscreen.createDocument({
    url: "offscreen.html",
    reasons: ["WORKERS"],
    justification:
      "Run Stockfish locally for completed game analysis."
  });

  try {
    await creatingOffscreen;
  } finally {
    creatingOffscreen = null;
  }
}

async function sendToEngine(message) {
  await ensureOffscreenDocument();

  // Retry briefly while the offscreen page initializes.
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      return await chrome.runtime.sendMessage({
        type: "OFFSCREEN_ANALYZE",
        fen: message.fen,
        depth: message.depth,
        searchmoves: message.searchmoves,
        multiPV: message.multiPV
      });
    } catch (error) {
      if (
        !String(error.message).includes(
          "Receiving end does not exist"
        )
      ) {
        throw error;
      }

      await new Promise(resolve =>
        setTimeout(resolve, 200)
      );
    }
  }

  throw new Error(
    "Offscreen engine did not become available."
  );
}

chrome.runtime.onMessage.addListener(
  (message, sender, sendResponse) => {
    if (message.type !== "ANALYZE_POSITION") {
      return;
    }

    sendToEngine(message)
      .then(result => sendResponse(result))
      .catch(error => {
        sendResponse({
          success: false,
          error: error.message
        });
      });

    return true;
  }
);
