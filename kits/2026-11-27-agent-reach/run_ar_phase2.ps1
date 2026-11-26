# brutal guy.ai - Agent Reach long-form test, phase 2. No logins, no keys added.
# Part A: Agent Reach's own commands, each 3x, timed. Part B: Claude (Sonnet, your .env key) 5 tasks x with/without x 3.
$ErrorActionPreference = "Continue"
$E = "D:\brutal-guy-ai\episodes\2026-11-27-agent-reach-long"
$O = "$E\work\outputs\cli"; New-Item -ItemType Directory -Force $O, "$E\work\runs" | Out-Null
$env:Path = "$env:USERPROFILE\.local\bin;$env:Path"; $env:PYTHONIOENCODING = "utf-8"
"name,run,seconds,exit" | Out-File -Encoding utf8 "$O\timings.csv"
function C($name, [string[]]$a) {
  foreach ($n in 1,2,3) {
    Write-Host "== $name run $n" -ForegroundColor Cyan
    $sw = [Diagnostics.Stopwatch]::StartNew()
    & agent-reach @a 1> "$O\${name}_$n.json" 2> "$O\${name}_$n.err.txt"; $code = $LASTEXITCODE; $sw.Stop()
    "$name,$n,$([math]::Round($sw.Elapsed.TotalSeconds,1)),$code" | Out-File -Append -Encoding utf8 "$O\timings.csv"
  }
}
& agent-reach doctor 1> "$O\doctor.json" 2> "$O\doctor.err.txt"
& agent-reach check 1> "$O\check.json" 2> "$O\check.err.txt"
C "web_read"      @("web","read","https://www.anthropic.com/engineering/building-effective-agents")
C "web_search"    @("web","search","Agent Reach AI agent internet access","--limit","5")
C "yt_read"       @("youtube","read","https://www.youtube.com/watch?v=aircAruvnKk")
C "yt_subtitle"   @("youtube","subtitle","https://www.youtube.com/watch?v=aircAruvnKk","--lang","en")
C "yt_search"     @("youtube","search","LLM agents","--limit","5")
C "gh_read"       @("github","read","Panniantong/Agent-Reach")
C "gh_search"     @("github","search","agent skills","--limit","5")
C "v2ex_hot"      @("v2ex","hot","--limit","5")
C "bili_hot"      @("bilibili","hot","--limit","5")
C "bili_search"   @("bilibili","search","AI agent","--limit","5")
C "reddit_nologin" @("reddit","search","Claude Code","--limit","5")
C "twitter_nologin" @("twitter","search","Claude Code","--limit","5")
Copy-Item "$env:USERPROFILE\.agents\skills\agent-reach\SKILL.md" "$O\SKILL_agent-reach.md" -ErrorAction SilentlyContinue

$PY = (uv python find 3.12).Trim(); $env:Path = "$(Split-Path $PY);$env:Path"
"task,mode,run,exit" | Out-File -Encoding utf8 "$E\work\runs\summary.csv"
foreach ($n in 1,2,3) { foreach ($t in "yt","v2ex","gh","reddit","web") { foreach ($m in "skill","plain") {
  Write-Host "== $t $m run $n" -ForegroundColor Cyan
  & $PY "$E\ar_harness.py" $m $t $n $E 2>&1 | Tee-Object -FilePath "$E\work\runs\console_${t}_${m}_$n.txt"
  "$t,$m,$n,$LASTEXITCODE" | Out-File -Append -Encoding utf8 "$E\work\runs\summary.csv"
} } }
Write-Host "DONE. Tell Claude 'done'." -ForegroundColor Green
