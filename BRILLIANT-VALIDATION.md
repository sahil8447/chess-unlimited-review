# Sacrifice recognition and counterfactual winning positions

This document records the 65-test recognition phase. The subsequent master-task product fixes, expanded browser/component tests and GitHub delivery are recorded in `RELEASE-VALIDATION.md`.

Automatic Brilliant awards remain **diagnostic-only**. Sound-sacrifice recognition is separate from final eligibility, and neither changes the displayed grade. No proprietary Chess.com labels are asserted for the new fixtures.

## Source changes

- `src/sacrificeMaterial.js` (new): find legal material offers involving any pawn/piece, including an unmoved unit. Compare material to the position **before** the move so ordinary captures and exchanges do not fabricate investment. Resolve immediate recaptures and one additional opponent-initiated exchange with legal, bounded local material minimax. Record replayable moves, FENs, material balances, bounds and discovered/exposed-piece evidence.
- `src/tactics.js`: use that material evidence both for candidate selection and the deep audit. Recognize Marshall's delayed pawn investment and Catalan's unmoved c4 offer. Preserve existing same-root/equal-depth quality and engine-backed compensation gates. Audit non-sacrificing alternatives with complete root search coverage; ambiguous evidence fails closed.
- `src/brilliantRules.js`: replace the unconditional +900cp best-root shortcut with verified counterfactual evidence. Missing, wrong-depth, partial or ambiguous alternative evidence is ineligible. The near-best/material/soundness thresholds are unchanged.
- `src/content.js`, `background.js`, `offscreen.js`: forward an optional bounded MultiPV setting for full remaining-alternative searches; include it in cache keys and validate it. Yield between move classifications to keep local material checks from monopolizing the page. Normal review/live-analysis searches keep their existing default MultiPV behavior.
- Tests retain all previous 36 cases and add material, counterfactual, engine-error, candidate-budget, historical piece-sacrifice, and negative regressions. Expectations for the two fixed false negatives and the requested winning-policy change were updated; cases were not removed.
- Generated `dist/content.js`, `dist/background.js`, `dist/offscreen.js` are rebuilt. Documentation and structured engine reports are refreshed.

Board, graph, PGN fetching, Miss detection, grading/accuracy, move explanations, manifest, dependency declarations and lockfile were byte-compared against the pre-task backup and remain unchanged. No claim of a successful live Chrome review is made.

Pre-task backup: `/tmp/chess-before-recognition-counterfactual.tgz` (excluding Git metadata and dependencies).

## Recognition: legal material evidence

The candidate filter does not equate "attacked" with "sacrificed". It requires a net offer of at least 75cp relative to the pre-move material balance, followed by either unrecovered immediate investment, a complete delayed material exchange trace, or the existing forcing compensation evidence. Ordinary equal trades and defended units that simply recapture are filtered out. Unsound offers may be recognized as offers but remain **ineligible** through quality/soundness gates.

The local material analysis resolves direct recaptures, then one further exchange initiated by the opponent on another square. Both sides may decline an exchange when not in check; check evasions are legally applied. It is limited to eight plies and 256 expanded exchange nodes per offered capture. Truncation cannot establish delayed investment. These traces are local material comparisons, **not a claim that every recorded move is forced or Stockfish's preferred line**. Separate actual depth-18 Stockfish searches establish compensation against best defense and audited acceptances.

Marshall: after `8...d5 9.exd5`, an immediate `...Nxd5` restores material temporarily. The legal continuation `...Nxd5 Nxe5 Nxe5 Rxe5` exposes a 100cp investment that the previous one-recapture check missed.

Catalan: after `1.d4 Nf6 2.c4 e6 3.Nf3 d5 4.g3`, the move is to g3 but `...dxc4` accepts the c4 pawn. The audit recognizes this existing, deliberately unrescued offer and verifies its soundness with Stockfish.

### Candidate-budget regression

The broad capture-only filter would select 30 apparent offers in the supplied Rxd7 game and consume the unchanged 12-audit budget too early. Applying the bounded material evidence **before** selection reduces it to five candidates, including Rxd7. This is generic filtering, not a move exception. A full-game regression asserts that the final candidate remains within the budget.

## Counterfactual winning policy

A high best-play evaluation before a move can derive from the sacrifice itself. It does not prove the position remains easily won without that move.

1. Use complete, legal, unbounded-score PV evidence at the requested depth from the original unrestricted root search. When the played move ranks first, the next complete ranked line bounds all other alternatives. Otherwise the complete rank-one line is the best alternative.
2. An alternative below +450cp establishes that all remaining non-sacrificing alternatives also fall below that decisive threshold **at the tested depth**. Winning mate counts as decisive; losing mate does not.
3. If a decisive alternative has no net material offer, or its legal exchange audit recovers the material, keep the already-winning rejection.
4. A decisive alternative may be excluded only if its own material and depth-matched compensation evidence verify it as a sound sacrifice. Then search **every remaining legal alternative** in one restricted root search with MultiPV 1; do not sample a few convenient moves or compare a new score against an old baseline.
5. Exclude at most two such alternatives. A persistent threat to an unrelated unit is insufficient, by itself, to remove a winning alternative: that ambiguity fails closed. Missing/illegal/bound/wrong-depth PVs, incomplete material trees, inconsistent soundness, unsupported search pools and budget exhaustion also remain ineligible.

`bestNonSacrificingCp` is reported only when that classification is established. `alternativeUpperBoundCp` can instead bound the entire remaining pool; a low bound is sufficient without pretending to identify its best non-sacrificing member. Unknown already-winning status is `null`, not `false`.

These are depth-limited engine/model conclusions, not a mathematical proof of the game result. Being the only winning move does not bypass meaningful sacrifice, near-best quality, compensation, rating, or evidence-completeness gates. Automatic promotion remains disabled regardless of eligibility.

### Rxd7 reassessment

The supplied PGN is fully replayed. Depth-18 Stockfish selects `d1d7`, with best and played scores +1003cp **in the same root search** and a zero quality gap. Its best alternative, `Qxf7+`, is +169cp; the next displayed alternative is -340cp. The +1003cp advantage therefore depends on finding the sacrifice, rather than an already-overwhelming non-sacrificing alternative.

The acceptance `...Kxd7` and forcing `Qxf7+` recovery are verified separately. The new counterfactual evidence clears the already-winning gate; Rxd7 now passes diagnostic eligibility generically. The original displayed grade is preserved and no Brilliant badge is awarded. This is consistent with the reported Chess.com label but does not claim exact reproduction or independently verify that label in Chrome.

## Engine-backed evidence and observed outcomes

Exact FENs, PVs, material traces and structured decisions are saved in:

- `test/calibration-results.json`: the original six sound positions and five negative move cases.
- `test/recognition-results.json`: six sourced historical piece sacrifices, four additional negative cases, and the Rxd7 reassessment.
- `test/games/SOURCES.json`: public source URLs and downloaded-source SHA-256 hashes. Complete game PGNs are retained and legally replayed before selecting the exact move.

| Original sound calibration case | Paired quality gap | Investment | Recognition / eligibility |
| --- | ---: | ---: | --- |
| Queen's Gambit 2.c4 | 0cp | 100cp | Pass / pass |
| Réti 2.c4 | 10cp | 100cp | Pass / pass |
| Evans 4.b4 | 15cp | 100cp | Pass / pass |
| Benko 3...b5 | 0cp | 100cp | Pass / pass |
| Marshall 8...d5 | 5cp | 100cp delayed | Pass / pass |
| Catalan 4.g3 | 0cp | 100cp on c4 | Pass / pass |

| Sourced historical case | Root best / played | Accepted score | Recognition | Final eligibility |
| --- | ---: | ---: | --- | --- |
| Morphy Opera 10.Nxb5 | +430cp / +430cp | +675cp | Knight offer, 120cp net | Pass |
| Morphy Opera 13.Rxd7 | +703cp / +703cp | +666cp | Rook offer, 180cp net | Withheld: ambiguous alternative |
| Morphy Opera 16.Qb8+ | Mate / mate | Mate | Queen offer, 900cp | Pass |
| Deep Blue–Kasparov 1997 game 6, 8.Nxe6 | +122cp / +122cp | +126cp | Knight offer, 220cp | Pass |
| Deep Blue–Kasparov 1997 game 6, 17.Bf5 | +349cp / +349cp | +412cp | Bishop offer, 230cp net | Pass |
| Fischer–Spassky 1972 game 6, 38.Rxf6 | +664cp / +664cp | +748cp | Exchange offer, 80cp net after recovery | Withheld: ambiguous alternative |

Scores are mover-relative and may vary between searches/runs. Quality gaps compare a single common root MultiPV search; acceptance scores are separate soundness evidence. Assertions use behavior and safety margins rather than fixing these cp values.

All five original negatives remain ineligible: hung queen, hung rook, ordinary bishop/knight exchange, ordinary pawn exchange, and an inaccurate rook offer from a winning position. The last remains around +596cp but is 483cp behind the best move in a common root search, so winning alone cannot rescue it.

Four new negatives remain ineligible: an exposed **unmoved** rook blunder, a defended pawn during quiet development, a queen offer with another non-sacrificing forced win, and a non-sacrificing mating move. Thus the sampled negative cases show **0/9 eligible**. This is an observed sample result, not a universal false-positive guarantee.

Recognition now succeeds for **all 13 sound cases** when including the six original, six historical and Rxd7: no observed recognition false negatives. Full diagnostic eligibility passes 11/13; two newly tested historical sacrifices remain conservatively withheld for counterfactual uncertainty. These are remaining eligibility limitations, not rejected soundness or known proprietary-label errors.

## Bounds, checks and limitations

Unchanged numerical gates: 75cp investment; 22cp near-best tolerance (35cp below known Elo 1200, default Elo 1500); at most 0.04 win-proxy drop using `1/(1+exp(-cp/220))`; resulting/accepted evaluation at least -100cp; decisive alternative at least +450cp (equivalent to the previous >=0.88 proxy gate at this boundary). The unconditional root +900cp shortcut is deliberately replaced, not lowered to match a benchmark.

Depth remains 18, with at most 12 audited candidates/game, four capture responses/candidate, 256 cached engine results, and no recursive engine auditing. At most two alternative exclusions and two complete-pool searches are added. Worst-case audit work is bounded at 17 engine requests before cache reuse: unrestricted root, optional pair, played child, four acceptances, and two alternative audits with up to four acceptances plus a remaining-pool search each. Most candidates require no alternative exclusion. Explicit search pools are limited to 218 UCI moves and MultiPV to 1–3.

The pre-change 36-test suite passed. The final expanded suite passed **65 tests, 0 failures, 0 skips** in about 146 seconds. `npm run build`, MV3 artifact validation, and `git diff --check` passed. The expanded suite covers root score perspective, mate, errors, missing/illegal PVs, incomplete/wrong-depth alternatives, exchange bounds, persistent-threat ambiguity, complete remaining pools, all old positions, piece sacrifices, and actual offscreen-worker UCI transport/cache behavior. Run:

```
node --test test/*.test.mjs
npm run build
```

Optional detailed report capture (Bash):

```
CHESS_CALIBRATION_REPORT=/tmp/calibration.json CHESS_RECOGNITION_REPORT=/tmp/recognition.json node --test test/*.test.mjs
```

Remaining limitations: the material model follows bounded exchanges rather than arbitrary quiet multi-move plans; latent offers with no immediate legal capture may be missed; persistent unrelated threats make some winning alternatives ambiguous; depth instability and the 12-candidate/four-capture budgets can withhold other cases. The additional historically sourced cases improve diversity but do not establish a general Chess.com-equivalence or error rate. The previously requested Byrne–Fischer 1963 benchmark is still absent and is not claimed validated by these different games.

Live Chrome acceptance remains unverified: the earlier Chromium/CDP attempt established an administrator policy prohibiting unpacked extensions. The policy was not bypassed. `CHROME-VALIDATION.md` contains the updated manual checklist. Keep automatic Brilliant awards disabled.
