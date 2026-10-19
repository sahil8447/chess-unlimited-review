# Estimated Performance Rating — model v1

This is an **unofficial, uncalibrated single-game heuristic**, not official Elo, a prediction of long-term skill, or Chess.com's proprietary estimated rating. No labeled Elo dataset has been evaluated. Numbers should be interpreted together with the deliberately broad uncertainty range.

`src/performanceRating.js` is a pure function with no result cache. The completed review passes its own captured PGN headers and finalized engine evaluations, separately for each color. Actual game ratings remain separate from estimates. Starting another review, canceling, closing or changing the page removes published previous-game results.

## Evidence and calculation

Only completed standard-start games with complete finite engine scores qualify. Aborted/abandoned games, custom starts and unfinished games get **Insufficient data**. Each player needs ten moves and six effective decisions. A move with one legal option, an immediate same-square recapture or an absolute pre-move evaluation of at least 600cp has zero weight. Moves through fullmove six receive weight 0.25; other eligible moves have weight one. These are transparent proxies for triviality, not a measured definition of chess difficulty. In particular, legal move count cannot measure how hard a decision felt to a human.

Use the existing per-move estimated accuracy without changing the review accuracy formula. Compute weighted mean move accuracy `q` and weighted error count `e` (mistake=1, blunder/Miss=2). The prior is 75% player game rating plus 25% opponent game rating when both exist, the available rating otherwise, or a neutral 1500 when neither exists.

The adjustment is `clamp(320 * ln((q+5)/(105-q)) - 500*e/weight, -800, 800)`. Shrink it by `weight/(weight+20)` toward the prior. Clamp the final index to 400–2800 and round to ten. Result itself contributes no rating bonus or penalty. Thus a good game cannot imply an enormous skill jump, and repeated forced moves cannot inflate evidence.

The displayed heuristic uncertainty is `350 + 500/sqrt(weight)`, plus 150 if the player rating is missing, rounded to ten. It is **not a statistical confidence interval**. Confidence is Moderate only with at least twenty effective decisions and an available player rating; otherwise Low. There is no High confidence from a single game.

## Validation and limitations

Unit tests cover ordering strong/weak decisions, symmetry, determinism, missing ratings/scores, extremes, forced moves, recaptures, short/terminal/unfinished/abandoned/custom games, completeness and isolation across calls. Browser fixtures verify both summary cards for an imported game and insufficient-data output for the four-ply fixture. These are implementation tests, not empirical Elo calibration.

Engine horizon error, shallow opening searches and difficulty proxies affect the estimate. The numeric constants and priors are modeling assumptions. Before marketing this as an Elo-strength measure, evaluate independent, consented/public games with known time-control-specific ratings: split by player into training/holdout sets, stratify by game length and time control, compare against a rating-only baseline, inspect calibration/error and uncertainty coverage, and publish the methodology and observed results. Do not tune against the holdout or claim this has already happened.


V1.1 uses finalized coherent same-root quality evidence where available, retaining the same rating-model constants. Unverified ordinary moves are identified as adjacent-position estimates. If requested critical checks fail, the numeric performance estimate is withheld. Opening Book is a presentation label and does not alter underlying accuracy. Neither the V1 nor V1.1 single-game values are empirically calibrated Elo.
