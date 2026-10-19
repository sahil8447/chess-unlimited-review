# Synchronize the cloud work into the existing Windows project

The prepared source is on GitHub branch **`codex/chess-review-original-export-validation`** in `sahil8447/chess-unlimited-review`. The cloud workspace is `/workspace/chess-unlimited-review`. No Windows drive is mounted here; nothing in this task directly writes `D:\Chess-Unlimited-review`.

The earlier development existed only as uncommitted cloud files. It is now committed and pushed, including source, tests, historical PGNs, calibration evidence and the complete rebuilt `dist`. The remote `main` is not overwritten or force-pushed.

## Preserve local work and check out the review branch

Run these commands in **PowerShell**, with VS Code and Chrome review tabs closed. They assume your existing folder is a Git checkout with `origin` pointing to `https://github.com/sahil8447/chess-unlimited-review.git`.

```powershell
Set-Location 'D:\Chess-Unlimited-review'
git status --short
git remote -v

# Make an independent whole-folder backup before switching branches.
$backup = 'D:\Chess-Unlimited-review-backup-' + (Get-Date -Format 'yyyyMMdd-HHmmss')
Copy-Item -LiteralPath 'D:\Chess-Unlimited-review' -Destination $backup -Recurse

# Preserve tracked and untracked local work; keep the stash after review.
$hadChanges = @(git status --porcelain).Count -gt 0
if ($hadChanges) {
    git stash push --include-untracked -m 'Local work before complete-review synchronization'
    if ($LASTEXITCODE -ne 0) { throw 'Stash failed; do not switch branches.' }
}

git fetch origin
if ($LASTEXITCODE -ne 0) { throw 'Fetch failed; local backup and stash are retained.' }
git switch --create review-original-export-20261020 --track origin/codex/chess-review-original-export-validation
if ($LASTEXITCODE -ne 0) { throw 'Branch switch failed; inspect status rather than forcing it.' }
git status --short
git log -2 --oneline
code 'D:\Chess-Unlimited-review'
```

If `review-original-export-20261020` already exists, the create command safely fails: inspect it with `git branch -vv`, then use `git switch review-original-export-20261020` and `git pull --ff-only`. Do not reset or force it to match the remote.

If `git status` says this is not a Git repository, or the remote differs, stop before switching and retain the backup. Do not initialize, replace or overwrite an unknown local project blindly. The published GitHub branch remains available for comparison and synchronization.

### Restore separate local edits deliberately

The review branch contains the complete cloud implementation. A stash may contain older source that conflicts with it. Inspect the specifically named stash with `git stash list` and `git stash show --stat 'stash@{0}'`. If that is the stash created above and you want those edits, use:

```powershell
git stash apply 'stash@{0}'
git status --short
git diff
```

Resolve any conflicts in VS Code, keeping the new audit/engine/test code while merging your independent edits. Do not use blanket “accept all ours/theirs.” Keep both the backup and stash until you have verified the merged project; `apply` intentionally does not discard the stash. The cloud cannot resolve conflicts in a Windows folder it cannot access.

## Install, validate and rebuild

Use **Node.js 24** (tested with 24.19.0). No engine server, paid account or API key is required.

```powershell
Set-Location 'D:\Chess-Unlimited-review'
node --version
npm ci
node --test test/*.test.mjs
npm run build
code .
```

`npm test` runs the same suite. Browser component tests use system Chromium if available, or `CHESS_CHROMIUM` pointing to Chrome/Chromium. If it is absent, that browser group is explicitly skipped; engine/unit tests still run. To test installed Chrome on Windows:

```powershell
$env:CHESS_CHROMIUM = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
node --test test/browser.test.mjs
```

This repository historically tracks parts of `node_modules`; `npm ci` may show platform-dependent generated changes there. Do not confuse those with lost application source, and do not commit those installation differences. The added ignore rule prevents new dependency-cache files from entering future commits; it does not remove already tracked files.

## Load the complete extension

1. Open `chrome://extensions`, enable **Developer mode**, and choose **Load unpacked** → `D:\Chess-Unlimited-review\dist`.
2. If already loaded, click **Reload** on Chess Unlimited Review after every build, then reload the Chess.com page.
3. Open a completed Chess.com game, use **Unlimited Review**, and run the short acceptance checklist in `CHROME-VALIDATION.md`.
4. If administrator policy blocks unpacked extensions, use an authorized development profile/machine. This task does not bypass browser policy.

Brilliant remains an audit: diagnostic eligibility never turns the displayed move grade into an automatic Brilliant badge.

### Short live acceptance checklist

- Review one real completed Chess.com game and verify its players/last move against the imported PGN; retry through manual import if callback fetching is unavailable.
- Import `test/rxd7.pgn`: expect 45 plies, a sound Rxd7 audit and no automatic Brilliant badge.
- Click move rows and graph points; preview a PV, explore a custom move, undo it and return to the reviewed position.
- Close during analysis, reopen and import again; confirm no stale result overwrites the new review. Retry after malformed PGN and a temporary engine error.
- Check narrow/wide layout and promotion/custom-FEN behavior on your actual Chrome/Windows machine.
