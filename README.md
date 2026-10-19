# Chess Unlimited Review

Chrome Manifest V3 extension for completed Chess.com game reviews using local Stockfish 19 Lite WASM and chess.js. Grades and accuracy are this extension's **estimates**, not Chess.com's proprietary scoring.

## Get the recovered implementation

The development branch is `codex/complete-review-20261019`. See [LOCAL-SYNC.md](LOCAL-SYNC.md) for backup-preserving PowerShell commands to bring it into your existing `D:\Chess-Unlimited-review` checkout. Cloud files are not automatically copied to your PC.

## Develop and load

Use Node.js 24:

```sh
npm ci
npm run build
node --test test/*.test.mjs
```

Load `dist` as an unpacked extension at `chrome://extensions`; after rebuilding, reload the extension and Chess.com tab. The engine is bundled and runs in an offscreen worker; no external engine service or credentials are required. Chess.com's undocumented callback import can change; manual PGN import remains available.

`npm test` runs the same suite. Browser tests use system Chromium or the `CHESS_CHROMIUM` executable path. They explicitly report absent/blocked browser support as skipped. The real WASM engine is tested both in Node UCI searches and, when available, in a native browser Worker. Local fixture component tests do not establish live Chess.com or installed-extension end-to-end success.

The repository currently includes some tracked Windows dependency files. Linux onboarding used a Linux esbuild native package without committing platform-specific dependency changes. A normal supported-machine `npm ci` installs the correct platform binaries; keep generated dependency changes out of application commits.

## Product behavior

- Manual PGN and supported completed-game callback import, including custom FENs, castling, en passant and promotions.
- Base depth 12, selectively deeper depth 18 review; serialized engine queue and 256-entry search cache.
- Estimated accuracy and move grades, material-winning Miss and critical Great detection.
- Interactive board, PV preview, custom exploration, undo/return-to-game, live evaluation and clickable graph.
- Canceled/closed reviews stop issuing new engine requests. An already running shared search is allowed to finish; stale results do not render. Board disposal clears timers and live-cache state.
- Brilliant remains diagnostic-only. A compatibility grading export cannot award it through the old boolean-only path.

## Evidence and remaining checks

- [BRILLIANT-VALIDATION.md](BRILLIANT-VALIDATION.md): exact numerical gates, bounded exchange/counterfactual policy, benchmarks and limitations.
- [RELEASE-VALIDATION.md](RELEASE-VALIDATION.md): current product fixes, actual test/build results and delivery status.
- [CHROME-VALIDATION.md](CHROME-VALIDATION.md): live Chrome acceptance checks.
- `test/calibration-results.json`, `test/recognition-results.json`: recorded engine evidence and sourced historical PGNs.

Automatic Brilliant badges remain disabled. Complete the live Chrome acceptance checks before treating this branch as a fully verified release.
