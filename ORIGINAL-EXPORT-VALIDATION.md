# Original Chrome export validation

The actual attached `chess-review (1).json` was read and imported with `npm run import:review`. Original bytes: **73,189**. SHA-256: **17f398739365e6c73b07c9efe0cf9b282fbc295a678fc84ffb501f99955c9aba**. The untouched original remains in the attachment directory, outside Git. `test/fixtures/original-chrome-export.json` is its sanitized import, retaining the reviewed data and original-byte fingerprint. It is explicitly distinguished from the older repository reproduction. No reconstructed fixture replaced the attachment.

All 42 plies (21 per side), SAN/UCI identities, move numbers, before/after FENs, legal-choice counts, legal best PVs, result and final checkmate validate. The original file's 42 grades and score/loss/depth fields reproduce exactly with the frozen V1.1 engine pipeline. Replaying the grading rules from the original exported evidence also reproduces all 42 grades. These are consistency and reproduction checks, not endorsements of the original sacrifice or mate semantics. The graph has 43 matching positions. All original accuracy contributions and both aggregate totals recompute.

The importer now checks graph indexes/scores/typed states, legal move/PV evidence, search depths, best flags, probability and centipawn losses, terminal mate outcomes, Brilliant root/capture legality, finite aggregates, duration values and integer request/cache counters. It reports six legacy warnings rather than silently interpreting absent data as final or inventing mate distances. New regression tests mutate those fields and require rejection.

## Confirmed defects and fixes

- **4...g6:** the original explicitly has `decision.eligible:true`, a 100cp discovered sacrifice and Qxc5 as its supporting acceptance. Current bounded before/after material analysis rejects it without any engine request: the c5 pawn was already legally capturable for the same cost. This confirms the existing V1.2 causality fix against the actual upload. The diagnostic remains ineligible; automatic Brilliant awards remain off.
- **20.Kh3:** the original records -1003 to -10000cp, `cpLoss:8997`, grade Good, no played-mate distance and a stable-position explanation. New equal-depth root evidence explicitly identifies a transition from a finite lost score to a forced losing mate; the grade is Mistake, the explanation names the mate concession and cpLoss is null. The prior huge scalar subtraction was not a valid centipawn loss. A finite engine score is not proof that every longer continuation can avoid mate forever.
- **Qh6+, Kg4, Nxh2#:** new root quality scores carry signed mate distances, while actual-board evaluations carry their own perspective and search origin. Kg4 is an already-forced loss, not an ordinary stable centipawn position. The final result is a legally verified terminal checkmate, with mover outcome +1 and White outcome -1. All four tail rows have null cpLoss; graph values no longer display a fabricated ±100-pawn number.
- **Snapshot state/time:** the original is `complete:false`, has `totalMs:0`, 79 requests, 54 transport hits, 18 critical verifications and two started audits, but only one stored audit result. The file cannot establish final analysis duration or completion. New initial/diagnostic/final snapshots have positive elapsed durations and explicit lifecycle states; a final exported report is complete only when the requested analysis finishes. Timing fields overlap as documented in each new report and must not be added indiscriminately.
- **Newly confirmed Qd3 inconsistency:** in the earlier V1.2 evidence, ply 31's accepted paired root prefers Qd3, while its displayed best move/PV still came from the earlier unrestricted root (f4). The row now uses its accepted root comparison for the best flag, displayed best PV and explanation. It cannot promote Great using a conflicting earlier root. This is a general consistency correction, not a named-move exception; a synthetic paired-root reordering regression exercises it. Qd3 becomes Best without changing its score or accuracy contribution. Existing board/PV controls and navigation are unchanged.

## Accuracy investigation

Original accuracy: **68.34474981611713% White / 68.84142934672248% Black**. White's weighted mean is 70.62198225850116 and harmonic mean 66.0675173737331; their mean exactly reconstructs its aggregate. Black's corresponding components are 76.47377145130753 and 61.209087242137436. Each side includes all 21 contributions; no missing move, color inversion, aggregation arithmetic error or book-based omission was found.

The original per-move White accuracy values include Bxf7+ 21.78, Qf3+ 36.00, Ne2 48.70, Nf4 55.28, Nh5+ 47.66 and O-O 53.99. Conversely, in an already badly lost position Kg2 and Kg4 contribute almost 100; Kh3 contributes 89.65 because its remaining modeled win probability is only about 2.43% before conceding mate. This illustrates probability saturation. Correct mate classification/explanation does not imply a large numerical accuracy penalty under this probability model. Book moves still contribute engine-derived accuracy.

The fresh aggregate and every old/new per-move score, loss, depth, grade, contribution and volatility weight are in `test/evidence/original-export/comparison.json`. It also reports the largest contribution changes and a diagnostic legacy-sentinel projection on the **same new engine evidence**, isolating representation from search changes. No coefficients, aggregation weights or thresholds were retuned. The user-reported Chess.com aggregates (44.0/66.8) lack per-move source evidence; this single game cannot justify adopting a different proprietary model. White's discrepancy remains a known calibration limitation.

## Reproduce

Use the actual original attachment for the first three commands; the output fixture is sanitized for publication.

```sh
npm run import:review -- "/path/chess-review (1).json" test/fixtures/original-chrome-export.json
npm run benchmark:before -- --input "/path/chess-review (1).json" --output-dir test/evidence/original-export
npm run benchmark -- --input "/path/chess-review (1).json" --output-dir test/evidence/original-export
node tools/validate-original-export.mjs "/path/chess-review (1).json"
npm test
npm run build
```

Benchmark 20 is a legal prefix of the actual uploaded PGN; 42 is that full game; 80 remains the existing independent long-game fixture. Both versions use fresh real shipped Stockfish WASM workers, sequentially, with the same local transport and depths. Normal benchmarks omit optional audits; the complete fresh report additionally runs bounded optional diagnostics. Cold and warm results are separate. CLI measurements omit live PGN fetching and DOM rendering and cannot establish a Windows Chrome speed guarantee. The original export's zero elapsed time makes a direct original-browser wall-time comparison impossible. Its 79 requests minus 54 transport hits leaves 25 requests not reported as cache hits; the absent search log and in-flight audit prevent reconstructing an exact completed-search count.

Detailed evidence is under `test/evidence/original-export/`; historical V1.2 artifacts remain preserved. `CHROME-VALIDATION.md` contains the actual installed-extension acceptance checklist. Browser policy restrictions and finite-depth/corpus coverage remain limitations; a passing calibration corpus does not establish universal false-positive safety. Automatic Brilliant awards remain disabled.

## Fresh cold benchmark results

| Plies | V1.1 final | Current final | Searches before → after |
| --- | ---: | ---: | ---: |
| 20 | 32.72s | 25.70s | 40 → 39 |
| 42 | 66.45s | 76.18s | 72 → 75 |
| 80 | 42.91s | 28.46s | 98 → 96 |

All cold runs had zero cache hits. The supplied 42-ply case is slower in this sample and performs three additional searches for mate verification; the result does not justify a speedup claim for that game. The short and long cases improved. These sequential single samples have ordinary engine/wall-time variability.

## Complete actual-input review

The current full report passes the strengthened validator with **zero errors and zero warnings**. Final accuracy is **68.4232404076921% White / 67.62576348609826% Black**. White's fresh weighted/harmonic components are 70.44612923706856 / 66.40035157831566. The largest White contribution changes include O-O +8.21 points, Kh3 +6.85, Nf4 −6.67 and e5 −6.31; the underlying old/new centipawn/mate evidence is recorded per move. The difference between typed mate probabilities and a diagnostic legacy-sentinel projection on the same fresh evidence is zero for White and about 1.42e-14 for Black. The representation fix therefore does not explain away the remaining **24.42-point White difference** from the user-reported 44.0 reference. No accuracy formula change is justified by this evidence.

With optional diagnostics enabled, the cold run took **113.62s**, used **90 actual searches**, completed 19 critical verifications and two bounded audits, and recorded no errors. Rxf6 remains a verified eligible diagnostic; Bb7 is withheld because complete counterfactual evidence exceeds the bounded exclusion budget. g6 is rejected by the local causality precheck, so it consumes no engine search and no deep audit slot. Diagnostic eligibility is not a Brilliant award.

The same-worker warm repeat took **1.03s**, with **90 cache-served requests, zero actual searches and zero new workers**, and identical grades/accuracy. This measures cached reuse, not new search speed. Normal cold review (75 searches) and diagnostics-enabled review (90 searches) are different workloads.

## Final checks and publication

The complete final suite ran **188 tests: 187 passed, 0 failed, 1 skipped** in 115.17s. `npm run build` passed. The first full run found a stale content bundle because tests preceded the rebuild; after rebuilding, the entire suite was rerun successfully. All prior tests remain unchanged, and six additional original-export/import/reordering tests are included. The sole skip is actual unpacked-extension loading, blocked by administrator policy; Chromium components and real browser Stockfish WASM tests passed. Installed-extension Windows Chrome acceptance remains pending.

The branch is `codex/chess-review-original-export-validation`, based on `15a33a8`; main and the Windows checkout were not modified. Source changes are confined to review-row evidence consistency and export validation, plus supporting tools/tests/docs and the rebuilt bundle. The full file manifest and machine-readable release results are `test/evidence/original-export/changed-files.json` and `release-results.json`. See `LOCAL-SYNC.md` for safe Windows checkout instructions.
