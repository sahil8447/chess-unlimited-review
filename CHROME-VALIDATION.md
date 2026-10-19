# Chrome end-to-end validation checklist

## What was attempted in cloud

Chromium 154 with Playwright launched successfully. Command-line extension loading produced no installed unpacked extension. Retrying with CDP `Extensions.loadUnpacked` and `--enable-unsafe-extension-debugging` produced:

```
Loading of unpacked extensions is disabled by the administrator.
```

Real Chromium component tests now verify local fixture navigation/import/cancellation and actual Stockfish WASM execution in a native browser Worker; see `RELEASE-VALIDATION.md`. Those checks do not establish an installed-extension review on live Chess.com. This is an environment policy blocker. No installed-extension review or real Chess.com fetch is claimed. Board/UI component passes are limited to the local fixtures. The policy was not modified. Actual-engine offscreen/background transport tests pass separately; those do not replace Chrome validation.

## Prepare a manual run

1. In your existing Windows checkout `D:\Chess-Unlimited-review`, run `node --test test/*.test.mjs`, then `npm run build`. Use Node 24 (the cloud-tested version). The expanded depth-18 suite takes several minutes, depending on hardware.
2. Open `chrome://extensions`, enable Developer mode, and use **Load unpacked** to select `D:\Chess-Unlimited-review\dist`. If administrator policy disables this, use an authorized Chrome development profile/machine that allows unpacked extensions.
3. Confirm the loaded manifest is MV3 and there are no extension errors. Inspect its service worker. Leave the Chess.com tab console open with Preserve log enabled. Do not paste credentials or console environment dumps.
4. Open a Chess.com analysis page. Confirm exactly one **Unlimited Review** button appears. Record Chrome/extension versions and the test result for each row below.

## Required tests and expected behavior

| Test | Exact action | Expected result |
| --- | --- | --- |
| Basic terminal-game import | Open review; paste `1. f3 e5 2. g4 Qh4# 0-1`; click **Analyze Game** | Completion with four half-moves, terminal mate handled without hanging the engine; board, graph, grade summary, and finite estimated accuracy render. |
| Supplied regression game | Paste the complete `test/rxd7.pgn`; analyze | 45 half-moves reviewed. Final move is `23. Rxd7+`; audit finds forcing compensation, zero same-root quality gap, and alternatives below the decisive threshold. Final diagnostic eligibility passes; the original displayed grade remains unchanged. No automatic Brilliant badge. Exact engine cp values may vary. |
| Calibration diagnostics | Import the explicit opening prefixes plus offered moves in `test/calibration-positions.mjs` | All six sound calibration offers, including Marshall and Catalan, are now recognized and diagnostically eligible. Diagnostic eligibility never changes the displayed grade to Brilliant. |
| Negative offers | Import/replay the explicit negative FENs/move sequences from the calibration fixtures | Unsound queen/rook offers, exchanges, and the inaccurate winning-position rook offer never receive Brilliant. |
| Player Elo | Review supplied PGN, then a PGN without Elo headers | Audit uses WhiteElo 1037 / BlackElo 1020 when applicable, and default 1500 without Elo; rating does not rescue negative offers. |
| Real automatic import | Open a completed Chess.com live/daily game available to your account and click review | The correct complete PGN is fetched and reviewed. Confirm players and last move match the real game. Do not use a mocked page to mark this passed. |
| Auto-import fallback | Use a page without a retrievable completed game | Clear automatic-import error, manual PGN editor usable, Analyze button re-enabled. |
| Move navigation | Click first/middle/last moves; use **Previous move / undo exploration** and **Next game move** | Board pieces, highlighted move, evaluation, grade, and explanation remain synchronized; boundaries are safe. |
| Clickable PV | Click a displayed Stockfish variation and several moves within it | Legal variation shown from the correct position; live evaluation updates. Original game data/grades remain intact. |
| Return to game | After PV exploration press **Return to game** | Returns to the original reviewed move/position and its original evaluation. |
| Custom moves | Click a piece and legal destination; repeat with drag; attempt an illegal move | Legal moves accepted and evaluated; illegal moves leave board unchanged. **Undo custom move** and **Return to game** restore the expected positions. |
| Stale analysis | Make custom moves quickly, navigate back before searches finish | Late evaluations never overwrite a different position; UI remains responsive. |
| Miss detection / other grades | Review a game with a material-winning opportunity missed by at least 150cp, and compare with the same game on the baseline | Existing Miss, Great, Best, Excellent, Good, Inaccuracy, Mistake, Blunder labels and explanations retain baseline behavior. Brilliant diagnostics do not overwrite them. |
| Accuracy / graph | Select graph points and corresponding move rows; compare two completed games | Graph aligns with move selection; White/Black estimated accuracies are finite and presented as estimates, without regressions from baseline. |
| Worker restart | Reload extension, reload page, then import again | Background creates offscreen document, Stockfish initializes once per live worker, review finishes without missing-listener errors. |
| Malformed PGN | Import invalid PGN, then a valid game | Visible error followed by successful recovery; no stuck disabled button or unhandled promise rejection. |
| Panel / resize | Close/reopen panel; resize narrow/wide; navigate within Chess.com | No duplicate buttons/panels; board and controls remain usable; responsive layout preserved. |

For the longer historical games in `test/games`, use the recorded `beforeFen` and offered move in `test/recognition-results.json` to import a short PGN with `[SetUp "1"]` and `[FEN "..."]` headers. This isolates the exact benchmark from the unchanged 12-candidate audit budget. All six historical offers should be recognized; Opera Rxd7 and Fischer Rxf6 remain diagnostically withheld for ambiguous winning alternatives.

For a failure, record the exact PGN/FEN, move, action, expected/actual behavior, console error, and extension error. A passing unit suite does not mark any unperformed row as passed.
