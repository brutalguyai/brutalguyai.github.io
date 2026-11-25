# Round 2: agent-style query plans (what Claude Code writes in Step 0.75) + a fresh live Reddit try every run.
#   powershell -ExecutionPolicy Bypass -File D:\brutal-guy-ai\episodes\2026-11-25-last30days\run_test2.ps1
$ErrorActionPreference = "Continue"
$E = "D:\brutal-guy-ai\episodes\2026-11-25-last30days"
$W = "$E\work"; $O = "$W\outputs2"
New-Item -ItemType Directory -Force $O | Out-Null
$env:Path = "$env:USERPROFILE\.local\bin;$env:Path"
$PY = (uv python find 3.12).Trim()
$S = "$W\repo\skills\last30days\scripts\last30days.py"
$env:PYTHONIOENCODING = "utf-8"
$cfg = "$env:USERPROFILE\.config\last30days"

# Is Reddit blocking this network for everyone, or just this tool? Plain requests, same as any script would make.
"url,status" | Out-File -Encoding utf8 "$O\reddit_direct.csv"
foreach ($u in "https://www.reddit.com/search.json?q=cursor&t=month","https://www.reddit.com/r/ClaudeAI/top.json?t=month","https://old.reddit.com/r/ClaudeAI/top/?t=month") {
  try { $r = Invoke-WebRequest -Uri $u -UseBasicParsing -UserAgent "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" -TimeoutSec 15; $c = $r.StatusCode } catch { $c = $_.Exception.Response.StatusCode.value__ }
  "$u,$c" | Out-File -Append -Encoding utf8 "$O\reddit_direct.csv"
}

$runs = @(
  @{t="Cursor"; p="cursor"; n=1}, @{t="Cursor"; p="cursor"; n=2},
  @{t="Kling AI"; p="kling"; n=1}, @{t="Kling AI"; p="kling"; n=2},
  @{t="Claude Code"; p="claude-code"; n=1}
)
"topic,run,seconds,exit" | Out-File -Encoding utf8 "$O\timings.csv"
foreach ($r in $runs) {
  if (Test-Path "$cfg\reddit-health.json") { Move-Item -Force "$cfg\reddit-health.json" "$O\reddit-health-before-$($r.p)-$($r.n).json" }
  $slug = "$($r.p)-plan-run$($r.n)"
  Write-Host "== $($r.t) (planned) run $($r.n)" -ForegroundColor Cyan
  $sw = [Diagnostics.Stopwatch]::StartNew()
  & $PY $S $r.t --emit=json --plan "$E\plans\$($r.p).json" 1> "$O\$slug.json" 2> "$O\$slug.err.txt"
  $code = $LASTEXITCODE; $sw.Stop()
  "$($r.t),$($r.n),$([math]::Round($sw.Elapsed.TotalSeconds,1)),$code" | Out-File -Append -Encoding utf8 "$O\timings.csv"
}
Write-Host "DONE. Tell Claude 'done'." -ForegroundColor Green
