# brutal guy.ai - ffmpeg-skill test (Nov 26 2026). Run from PowerShell:
#   powershell -ExecutionPolicy Bypass -File D:\brutal-guy-ai\episodes\2026-11-26-ffmpeg-skill\run_fx_test.ps1
# 3 runs WITH the skill + 3 WITHOUT (plain ffmpeg), Claude Sonnet on your .env key, README's exact Reel request.
$ErrorActionPreference = "Continue"
$E = "D:\brutal-guy-ai\episodes\2026-11-26-ffmpeg-skill"
$W = "$E\work"; New-Item -ItemType Directory -Force "$W\runs" | Out-Null
$env:Path = "$env:USERPROFILE\.local\bin;$env:Path"

# 1. FFmpeg on Windows
if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
  Write-Host "Installing FFmpeg (winget)..." -ForegroundColor Yellow
  winget install --id Gyan.FFmpeg -e --accept-source-agreements --accept-package-agreements
  $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User") + ";$env:USERPROFILE\.local\bin"
}
ffmpeg -version | Select-Object -First 1

# 2. Footage: public-domain NASA in-flight interview (Victor Glover, ISS, Feb 2021), first 6:40
if (-not (Test-Path "$W\interview.mp4")) {
  $u = "https://images-assets.nasa.gov/video/jsc2021m000064_Expedition_64_InFlight_MSNBC_Glover_210204/jsc2021m000064_Expedition_64_InFlight_MSNBC_Glover_210204~large.mp4"
  Write-Host "Downloading footage (about 260 MB)..." -ForegroundColor Yellow
  ffmpeg -v error -y -i $u -t 400 -c copy "$W\interview.mp4"
}

# 3. The skill, pinned to the commit I checked
if (-not (Test-Path "$W\ffmpeg-skill\SKILL.md")) {
  git clone -q https://github.com/kajisho5/ffmpeg-skill.git "$W\ffmpeg-skill"
  git -C "$W\ffmpeg-skill" checkout -q 57307146df7aa83757231c0a6d47b81cc62f89fe
}

# 4. Python 3.12 (uv, installed yesterday) exposed as `python` for the agent
uv python install 3.12 | Out-Null
$PY = (uv python find 3.12).Trim()
$env:Path = "$(Split-Path $PY);$env:Path"

# 5. Runs, alternating so time of day / API load is shared
"mode,run,exit" | Out-File -Encoding utf8 "$W\runs\summary.csv"
foreach ($n in 1,2,3) { foreach ($m in "skill","plain") {
  Write-Host "== $m run $n" -ForegroundColor Cyan
  & $PY "$E\fx_harness.py" $m $n $E 2>&1 | Tee-Object -FilePath "$W\runs\console_${m}_$n.txt"
  "$m,$n,$LASTEXITCODE" | Out-File -Append -Encoding utf8 "$W\runs\summary.csv"
} }
Write-Host "DONE. Tell Claude 'done'." -ForegroundColor Green
