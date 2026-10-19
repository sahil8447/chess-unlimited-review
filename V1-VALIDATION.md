> V1 checkpoint. See [V1.1-VALIDATION.md](V1.1-VALIDATION.md) for the subsequent grading and speed changes.

# V1 development delivery — 19 October 2026

Release branch: `codex/chess-unlimited-review-v1`, based on `bdceead6fe23a0edcbef3b43ba304da113fe8ef2` on the previous completed branch. See Git history for the exact release commit. `main` is unchanged. The cloud has not accessed or modified `D:\Chess-Unlimited-review`.

## Executed validation

- `npm ci --cache /tmp/chess-npm-cache`: passed, frozen lockfile installation; generated changes to historically tracked node_modules were restored, not committed.
- `node --test test/*.test.mjs`: **127 tests, 126 passed, 0 failed, 1 skipped**, 97.256 seconds. All preceding 102 tests retained.
- Actual Stockfish depth-18 corpus: original eleven calibration positions, ten historical/additional positions, supplied Rxd7 benchmark; offscreen worker/cache/restart integration and standalone browser WASM search also passed.
- Chromium: 16 tests including the parent, 15 passed, one unpacked-extension test skipped because `Loading of unpacked extensions is disabled by the administrator.`
- `npm run build`: passed before artifact-consistency checks and again after the full suite. Complete `dist` is about 2.1 MiB and contains manifest, service worker, offscreen page/worker, bundled content/CSS, twelve piece images and actual Stockfish JS/WASM.
- `git diff --check`: passed. No known automated failures. Real installed-extension/live Chess.com acceptance remains unverified.

## Changes

- `src/chesscomPgn.js`: shared route identity adapter, `/play/online/<id>` support, rejection of route changes, mismatched response IDs, inconsistent reported ply counts, oversized move lists and contradictory checkmate results. Existing legal TCN replay, custom FEN, castling and promotion remain.
- `src/content.js`: cancel/retry controls, abort-aware import timeout, URL-change cleanup through Navigation API/popstate plus existing DOM observer, removal of old published results, separate player cards, result/time-control metadata, per-game performance computation and keyboard move-row controls.
- `src/performanceRating.js`: pure bounded model with priors, move-quality/error signals, triviality discounts, sample shrinkage, explicit uncertainty and insufficient-data outcomes.
- `src/analyzer.js`: fix custom-FEN fullmove numbering in the reusable parser.
- `src/content.css`: compact responsive player summaries.
- `manifest.json`: include the bare chess.com host alongside www for content injection.
- `test/performance.test.mjs`, `test/product.test.mjs`, `test/browser.test.mjs`: new model, import integrity, parser, online route, SPA and cancel regressions. All previous tests retained.
- `dist/content.js`, `dist/content.css`, `dist/manifest.json`: rebuilt runtime assets; other packaged assets remain validated.
- Documentation: this report, PERFORMANCE-RATING.md, README.md, LOCAL-SYNC.md and expanded CHROME-VALIDATION.md.

## Feature evidence

| Feature | Implementation and automated evidence | Browser evidence / remaining acceptance |
| --- | --- | --- |
| One-click completed-game review | Imports and starts analysis directly from supported game routes; local integration fixtures pass | Actual content UI in Chromium fixture passes; real Chess.com pending |
| Automatic PGN extraction | Undocumented callback isolated in adapter; legal replay, identity/result validation, special moves, error/manual fallback tested | Local callback fixtures only; live endpoint compatibility unverified |
| Manual PGN/FEN | Legal replay, malformed recovery, custom start and numbering tested | Real component workflow passes |
| Stockfish | Actual packaged WASM, serialized transport, MultiPV, cache, restart and depth-18 corpus tested | Actual browser Worker search passes; installed MV3 transport acceptance pending |
| Move grades / Great / Miss | Existing classifications and tactical regressions retained | Rendering and move navigation pass with fixture engine responses |
| Brilliant | Diagnostic sacrifice and counterfactual audit retained, automatic awards disabled | No claim of completed automatic Brilliant feature |
| Accuracy | Existing formula preserved; units, symmetry and missing data tested | Summary rendering passes |
| Estimated Performance Rating | New deterministic model tested for strong/weak play, insufficient evidence, symmetry, priors, extremes and isolation | Two per-game cards and short-game withholding pass; no empirical Elo calibration |
| Board / clickable PV | Legal variation prefix, navigation/return, promotion, FEN and undo tested | Actual component interactions pass |
| Custom live analysis | Cache, late response suppression, error recovery, disposal tested | Actual component interactions pass with mock evaluations |
| Graph / review UI | Graph keyboard/click, rows, metadata and summaries | Local Chromium components pass; real responsive Windows page acceptance pending |
| Cancellation / recovery | Explicit cancel, close/reopen, stale engine and import suppression, SPA changes tested | Actual local content interactions pass |

## Brilliant decision

No thresholds were relaxed and no named-move exceptions were added. The existing engine corpus remains the release gate: six original sound gambits recognized and eligible; six historical piece sacrifices recognized, four eligible and two conservatively withheld; supplied `23. Rxd7+` remains diagnostically eligible. Thirteen sound offers recognized, eleven eligible, two withheld. All nine negative move cases remain ineligible. This is zero observed false positives in a small curated corpus, not evidence of a universal zero false-positive rate. The two withheld historical cases have ambiguous persistent unrelated threats in alternative moves. Automatic awards remain **disabled**.

See test/calibration-results.json and test/recognition-results.json for actual engine PVs, FENs and material evidence. These are sound-sacrifice candidates under our model, not invented proprietary Brilliant labels. See BRILLIANT-VALIDATION.md for detailed methods and limitations.

## Import limitations

The adapter uses a same-origin undocumented callback, no credentials extraction or access-control bypass. Supported identities are `/game/live/<id>`, `/game/daily/<id>`, `/analysis/game/(live|daily)/<id>` and `/play/online/<id>` (including trailing path/query variants). Generic history/analysis/play routes allow manual PGN. Open a specific completed game for auto import. A no-ID page cannot safely identify a particular game, so it falls back explicitly rather than guessing a game from unrelated links.

A declared completed result is required; in-progress responses are rejected. Every returned encoded move is legally replayed, optional response ID/ply count is checked, and terminal mate/result contradictions are rejected. Without an independently reported ply count or final state, legal replay cannot prove a callback did not omit a legal trailing sequence before resignation. Live acceptance must compare the final move. Fetch has a 15-second UI timeout, explicit retry, and manual PGN fallback. No undocumented alternate endpoint is guessed.

## Readiness

The requested source additions and safe fallbacks are implemented. This is a **pending-acceptance development build**, not a claim of public-release readiness. Final Windows Chrome/Chess.com testing is required. Chromium's real unpacked-extension loading attempt is rejected by administrator policy; no policy was bypassed. Local content/component tests use Chrome runtime/callback fixtures; actual browser WASM is tested separately.

Before a public release: complete CHROME-VALIDATION.md on real completed live/daily games; resolve any observed live adapter/UI issues; evaluate the rating heuristic against independent labeled games before making Elo calibration claims; retain diagnostic Brilliant mode until broader evidence supports activation. Performance uncertainty is heuristic, not a statistical confidence interval.
