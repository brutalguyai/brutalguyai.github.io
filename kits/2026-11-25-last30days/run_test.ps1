# brutal guy.ai - last30days-skill test (Nov 25 2026). Run from PowerShell:
#   powershell -ExecutionPolicy Bypass -File D:\brutal-guy-ai\episodes\2026-11-25-last30days\run_test.ps1
# Keyless only (exactly as the README's "zero config" claim). No accounts, no API keys, no logins.
$ErrorActionPreference = "Continue"
$E = "D:\brutal-guy-ai\episodes\2026-11-25-last30days"
$W = "$E\work"; $O = "$W\outputs"
New-Item -ItemType Directory -Force $O | Out-Null
if (-not (Get-Command uv -ErrorAction SilentlyContinue)) {
  powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
  $env:Path = "$env:USERPROFILE\.local\bin;$env:Path"
}
if (-not (Test-Path "$W\repo\skills")) { git clone --depth 1 https://github.com/mvanhorn/last30days-skill.git "$W\repo" }
git -C "$W\repo" rev-parse HEAD | Out-File -Encoding utf8 "$O\commit.txt"
uv python install 3.12
$PY = (uv python find 3.12).Trim()
$S = "$W\repo\skills\last30days\scripts\last30days.py"
$env:PYTHONIOENCODING = "utf-8"

Write-Host "== doctor (bounded live probe)" -ForegroundColor Cyan
& $PY $S doctor --probe --json 1> "$O\doctor.json" 2> "$O\doctor.err.txt"

$runs = @(
  @{t="Claude Code"; n=1}, @{t="Claude Code"; n=2}, @{t="Claude Code"; n=3},
  @{t="Kling AI"; n=1}, @{t="Cursor"; n=1}
)
"topic,run,seconds,exit" | Out-File -Encoding utf8 "$O\timings.csv"
foreach ($r in $runs) {
  $slug = ($r.t -replace '[^A-Za-z0-9]+','-').ToLower() + "-run" + $r.n
  Write-Host "== $($r.t) run $($r.n)" -ForegroundColor Cyan
  $sw = [Diagnostics.Stopwatch]::StartNew()
  & $PY $S $r.t --emit=json 1> "$O\$slug.json" 2> "$O\$slug.err.txt"
  $code = $LASTEXITCODE; $sw.Stop()
  "$($r.t),$($r.n),$([math]::Round($sw.Elapsed.TotalSeconds,1)),$code" | Out-File -Append -Encoding utf8 "$O\timings.csv"
}
Write-Host "== postmortem of last run" -ForegroundColor Cyan
& $PY $S doctor --postmortem --json 1> "$O\postmortem.json" 2> "$O\postmortem.err.txt"
Write-Host "DONE. Tell Claude 'done'." -ForegroundColor Green
