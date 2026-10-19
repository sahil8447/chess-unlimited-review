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


## V1 final Windows acceptance (not executed in cloud)

1. Back up/sync with LOCAL-SYNC.md. Build, load `dist` in an authorized Chrome profile, reload the Chess.com tab. Confirm only one Unlimited Review button.
2. Finish one real bullet/blitz/rapid game and remain on its game page. Click Unlimited Review once without opening Chess.com's Analysis. Verify imported ID/Site, names, ratings, result, time control and complete last move against the actual game. Test both `/game/live/<id>` and `/play/online/<id>` if served. A route without a game ID must explain manual fallback, not choose a different game.
3. Open a completed daily game and an individual history game; verify the same fields. Try a still-running game: reject automatic review as unfinished. Opening generic history alone supports manual PGN, not guessing an archived game.
4. Verify two player cards separate actual game rating, performance estimate, confidence/range and accuracy. Use a standard game with ten-plus moves per player and enough nontrivial decisions; a short game must say Insufficient data. Review another game and verify all values change with it. Ratings are unofficial and uncalibrated.
5. Navigate between two game IDs while import/search is pending, including browser back/forward. Old panel/results must disappear. Reopen and verify the current ID. Repeated clicks and DOM rerenders must never duplicate the button.
6. Cancel during import and during analysis; controls must recover and late responses must not publish. Close/reopen, retry import, use malformed PGN and then valid PGN, and test a temporary network/engine failure. A callback timeout should expose manual import within 15 seconds; Retry current game import retries explicitly.
7. Verify board/PV/custom moves/undo/return, promotion picker, custom black-to-move FEN numbering, graph keyboard selection and move-row Enter/Space. Check no stale evaluation after rapid navigation.
8. Import test/rxd7.pgn; verify 45 plies and diagnostic eligibility without a Brilliant badge. Test narrow/wide layout, readable player cards and tooltips, keyboard close/cancel and screen-reader status.
9. Confirm no background analysis continues to enqueue new jobs after cancel/close. One already-running shared engine job may finish. Check Chrome service-worker/offscreen console for errors and repeated worker creation after reviewing several games.

The callback is undocumented and may change or be denied by Chess.com. No access-control bypass is implemented. Successful fixtures cannot establish live compatibility. Record Chrome/Windows versions, game IDs, outcomes and any console errors before public release.


## V1.1 acceptance additions (live-extension checks still pending)

- Review `test/games/rafael-ayden-2026.pgn` and confirm 42 plies, 21 moves per side and the final supplied FEN/checkmate. The transcribed external Black grade totals have only twenty moves; do not treat them as full per-move ground truth.
- Default: Opening book on, slow Brilliant diagnostics off. Expect an initial interactive board, then critical-move progress and final results. Navigate/explore a PV/custom line during verification; finishing must preserve the same board and exploration.
- Toggle Book off and re-review. Underlying accuracy/evaluations must be identical; Book presentation counts may change. Actual Elo and performance estimate remain separate.
- Run optional diagnostics. Expect additional time and bounded candidate coverage, with no automatic Brilliant badge. Cancel during a deep root/acceptance search; do not publish late results or enqueue new stale jobs.
- Expand Detailed Move Analysis: verify initial/final grades, before/after quality scores, cp/probability loss, per-move accuracy and depth/evidence. The graph is actual position evaluation, distinct from same-root quality scores.
- Download review JSON. Check `complete`, exact PGN/headers, every move and `metrics.fetchMs`, `renderMs`, initialization/base/critical/Brilliant/Miss times and cache counters. Manual import of a different PGN must not reuse a previous game's fetch timing or ratings.
- Re-review the same game to exercise the bounded cache. Confirm no duplicate worker creation and stable grades. Reload extension/tab after building before comparing versions.


## V1.2 final browser acceptance (live extension still pending)

- Import the 42-ply supplied game. While base/critical/optional diagnostic stages run, download JSON at each stage; check lifecycle state, complete=false and positive snapshot elapsed time. Earlier snapshots must not gain later requests or audit data.
- Download after completion: expect schemaVersion=2, lifecycle state=complete, complete=true, 42 legal records and totalMs>0. Check request/engine/phase counters using their exported nesting definitions, not by adding overlapping durations.
- Verify optional diagnostics reject 4...g6 with pre-existing c5 exposure and zero attributable sacrifice cost. Automatic Brilliant badges remain disabled.
- Inspect 20.Kh3: finite best-line score versus played mate state, cpLoss=null and a verified mate-concession explanation. Inspect 20...Qh6+, 21.Kg4 and 21...Nxh2#: no +/-100-pawn labels on board, graph, detail table or live exploration.
- Navigate, explore a PV/custom line and undo during progressive updates; finalizing must preserve that exploration. Cancel/close/reopen/retry and switch games during a search; no prior game may overwrite the current review.
- Check More detailed verification (slower), rerun and confirm exported options.detailed=true. It must not enable Brilliant awards. Normal initial review stays interactive.
- The original browser-export file was missing in the task. Import it later through npm run import:review and retain its provenance; do not replace it with a generated report labeled as the original.
