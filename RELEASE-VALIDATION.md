> Superseded for the V1 development branch by [V1-VALIDATION.md](V1-VALIDATION.md). Counts below describe the preceding bdceead checkpoint.

# Product validation and cloud-to-Windows delivery

## Location and recovery

This work runs on Linux at `/workspace/chess-unlimited-review`; `D:\Chess-Unlimited-review` is not mounted and has not been directly modified. Earlier source/test changes existed only as uncommitted cloud files. They were preserved in `/tmp/chess-before-master-task.tgz`, committed as `5373e07` and pushed to branch `codex/complete-review-20261019` at `https://github.com/sahil8447/chess-unlimited-review`.

The remote initially exposed only `main` at `9edc9e8`, with no pull-request refs. GitHub PR-list API access returned `Forbidden`; ordinary Git read/push access works. Delivery uses a reviewable branch without modifying `main`, force-pushing, resetting, cleaning or overwriting local work. See `LOCAL-SYNC.md` for exact backup-preserving PowerShell commands.

## Demonstrated bugs corrected in this pass

| Module | Demonstrated issue | Change and regression coverage |
| --- | --- | --- |
| `src/content.js` | Move rows existed in a detached list because `appendChild(graph, moveList)` appends only its first argument | Append both nodes; real Chromium component test verifies four visible rows and row → PV → return-to-game wiring. |
| `src/content.js` | Closing a panel allowed the old review to keep requesting positions and could publish stale state | Per-panel/per-review abort state; check before/after engine awaits; stop subsequent requests and suppress stale rendering. Closing while an engine response is pending is tested. The shared in-flight search is allowed to finish rather than killing other consumers. |
| `src/content.js` | Editing PGN during analysis could make the rendered board use a different game than the saved grades | Capture one immutable PGN per review; a pending-engine test edits the input and confirms the original custom-FEN game is rendered. |
| `src/content.js`, `src/board.js` | Move labels assumed a White-to-move standard start at move 1 | Read full move number/side from legal replay FENs; black-to-move promotion at move 23 is tested in both content and board paths. |
| `src/board.js` | Removed/replaced boards had no timer disposal hook and an unbounded live cache | `destroy()` invalidates pending responses, clears debounce/cache state, and prevents future live requests; live cache is capped at 128. Disposal and late-response navigation are tested. |
| `src/grading.js` | An unused legacy export could still award Brilliant from a caller-supplied boolean | Keep compatibility export but always retain the base grade. Structured Brilliant audit remains the only decision module and automatic promotion stays disabled. |
| `src/grading.js` | Great's alternative-loss helper accepted bound scores and invalid mate-zero scores | Reject incomplete/bound/mismatched-depth alternative evidence; grading regressions cover these cases. The accuracy formula is unchanged. |
| `src/missDetection.js` | An illegal PV tail after three valid material-winning plies could still return Miss | Reject any illegal/unsupported move in the inspected prefix. The new regression failed before the change and passes after it; existing valid Miss and non-Miss tests remain. |
| `src/chesscomPgn.js` | Automatic fetch had no cancellation input | Optional AbortSignal forwarded to fetch; import cancellation follows panel lifetime. Existing endpoint remains explicitly undocumented with manual PGN fallback. |

Added `npm test`, a dependency-cache ignore rule, release/build checks, and Windows synchronization documentation. No dependencies were added; browser tests use Node 24's native WebSocket/CDP with system Chromium. The existing Stockfish/offscreen architecture, grading categories, accuracy formula, graph, piece assets, and PV exploration are retained.

## Test coverage

The previously verified 65-test suite is retained. New coverage includes:

- PGN legality, SAN, ratings/results, castling, en passant, terminal mate/stalemate, promotion and custom black-to-move FENs.
- Chess.com TCN reconstruction, king-to-rook castling, promotion, response errors, HTTP errors and cancellation signal forwarding.
- Normal move grades, Great evidence, percent-point accuracy units/color symmetry, valid/invalid Miss PVs and concrete terminal explanations.
- Legacy unsafe Brilliant export suppression; all previous sacrifice, counterfactual, paired-search, mate/sign and engine-backed fixtures.
- Actual UCI interruption/reinitialization with the shipped engine through the offscreen message handler.
- Manifest/CSP/runtime asset completeness, copied file equality and source-to-content-bundle freshness.
- Real Chromium DOM interactions for board navigation, legal/illegal PV prefixes, custom moves, undo, promotion, graph keyboard/click, live failures, stale responses, disposal, import recovery, input mutation and canceled reviews.
- An actual native **browser Worker** initializes the shipped Stockfish 19 Lite WASM and returns a legal depth-8 search result. The larger calibration suite uses real depth-18 Stockfish WASM searches in Node.

The final full run completed **102 tests: 101 passed, 0 failed, 1 skipped**, in about 121 seconds. The single skip is unpacked-extension loading blocked by administrator policy. `npm run build` and `git diff --check` passed. The original 65 cases remain in this run. Machine-readable results are retained in `test/release-results.json`.

The full repository command is `npm test`, which executes `node --test test/*.test.mjs`. The build command is `npm run build`. Run a build before tests after source edits so the artifact-freshness regression can verify `dist`.

## Browser evidence and limits

Chromium **154.0.8037.57** was launched through its real CDP protocol. `Extensions.loadUnpacked` returned:

```
Loading of unpacked extensions is disabled by the administrator.
```

That test is explicitly **skipped**, not passed. Policy was not bypassed. Component tests use local HTML/HTTP callback fixtures and a Chrome runtime-message stub; they do not certify installed-extension messaging or live Chess.com endpoint behavior. The real standalone Worker test verifies browser WASM execution separately. A genuine installed-extension review on a live Chess.com game remains manual acceptance work in `CHROME-VALIDATION.md`.

## Brilliant status

The recognition/counterfactual algorithm and thresholds from the preceding 65-test phase are retained. All 13 sampled sound sacrifice cases are recognized, 11 pass diagnostic eligibility, and two historical cases (Opera Rxd7 and Fischer Rxf6) are withheld on ambiguous non-sacrificing alternative evidence. All nine sampled negative move cases remain ineligible; this is a corpus result, not a universal error-rate claim.

`23.Rxd7+` is diagnostically eligible: depth-18 same-root best/played +1003cp, gap 0cp, best alternative +169cp. Marshall's delayed 100cp investment and Catalan's unmoved c4 pawn offer pass. No move-number/FEN exception is used, no automatic badge is awarded and no displayed grade is overwritten by diagnostic eligibility.

Exact checks remain documented in `BRILLIANT-VALIDATION.md`: meaningful investment >=75cp; same-depth root/paired quality evidence; gap <=22cp (35cp for Elo below 1200, missing Elo defaults to 1500); win-proxy loss <=0.04; played/accepted scores >=-100cp; complete non-sacrificing alternative evidence using the +450cp decisive threshold. Missing, bound, illegal, contradictory or over-budget evidence fails closed. Root +900cp alone is not rejection evidence.

Remaining algorithm limits include bounded local exchange modeling rather than arbitrary quiet plans, ambiguous persistent threats when excluding winning alternatives, depth instability, and the 12-candidate/four-capture limits. Byrne–Fischer 1963 is not among the newly sourced games and remains unvalidated.

## Delivery and manual acceptance

The review branch contains complete source, tests, source PGNs/provenance, evidence, and a synchronized `dist`. It is ready for synchronization into the existing Windows folder; it is not evidence that synchronization has already happened. Use `LOCAL-SYNC.md`, retain any stash/backups, run the full suite/build, load/reload `dist` in Chrome, and perform live automatic import, manual import, PV/board/graph, cancel/retry and responsiveness acceptance checks before treating this as a fully validated release.
