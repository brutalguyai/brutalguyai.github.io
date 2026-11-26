# brutal guy.ai - Agent Reach long-form test, phase 1: fresh install + status (Nov 2026)
# Follows docs/install.md exactly (GitHub release, never the PyPI package). No logins, no keys.
$ErrorActionPreference = "Continue"
$O = "D:\brutal-guy-ai\episodes\2026-11-27-agent-reach-long\work\outputs"
New-Item -ItemType Directory -Force $O | Out-Null
Start-Transcript -Path "$O\phase1_transcript.txt" -Force | Out-Null
$env:Path = "$env:USERPROFILE\.local\bin;$env:Path"
function T($label, [scriptblock]$cmd) {
  Write-Host "`n===== $label" -ForegroundColor Cyan
  $sw = [Diagnostics.Stopwatch]::StartNew(); & $cmd; $sw.Stop()
  Write-Host ("[time] {0} : {1:n1} s" -f $label, $sw.Elapsed.TotalSeconds) -ForegroundColor DarkGray
}
T "uv --version" { uv --version }
T "uv tool install (GitHub release)" { uv tool install --force https://github.com/Panniantong/Agent-Reach/releases/latest/download/agent-reach.zip }
T "update-shell" { uv tool update-shell }
$env:Path = "$env:USERPROFILE\.local\bin;$env:Path"
T "agent-reach version" { agent-reach version 2>&1 | Tee-Object "$O\version.json" }
T "agent-reach setup" { agent-reach setup 2>&1 | Tee-Object "$O\setup_output.txt" }
T "agent-reach --help" { agent-reach --help 2>&1 | Tee-Object "$O\help.txt" }
T "agent-reach channels" { agent-reach channels 2>&1 | Tee-Object "$O\channels.txt" }
foreach ($c in "read","youtube","github","web","v2ex","bilibili","doctor","status") {
  T "help: $c" { agent-reach $c --help 2>&1 | Tee-Object "$O\help_$c.txt" }
}
T "skills on disk" { Get-ChildItem -Recurse -Filter SKILL.md "$env:USERPROFILE\.claude\skills","$env:USERPROFILE\.agents\skills" -ErrorAction SilentlyContinue | Where-Object { $_.FullName -match "reach" } | ForEach-Object { $_.FullName } | Tee-Object "$O\skill_paths.txt" }
Stop-Transcript | Out-Null
Write-Host "`nDONE. Tell Claude 'done'." -ForegroundColor Green
