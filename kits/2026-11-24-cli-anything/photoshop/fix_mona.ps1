# brutal guy.ai - Mona Lisa poster built ONLY with cli-anything-photoshop commands
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $here
$log = Join-Path $here "mona_log.txt"
"=== FIX $(Get-Date -Format o)" | Out-File $log -Append -Encoding utf8
$P = @("--project", "$here\mona.ps-cli.json")
function Run-PS { param([string[]]$a)
  $t = Get-Date
  Write-Host "> cli-anything-photoshop $($a -join ' ')" -ForegroundColor Cyan
  "`n> cli-anything-photoshop $($a -join ' ')" | Out-File $log -Append -Encoding utf8
  $o = & cli-anything-photoshop --json @a 2>&1 | Out-String
  $o | Out-File $log -Append -Encoding utf8
  "exit=$LASTEXITCODE secs=$([math]::Round(((Get-Date)-$t).TotalSeconds,1))" | Out-File $log -Append -Encoding utf8
  if ($LASTEXITCODE -ne 0) { Write-Host $o -ForegroundColor Red }
}

Run-PS ($P+@("layer","set","1","blend_mode","soft_light"))
Run-PS ($P+@("layer","set","1","opacity","45"))
Run-PS ($P+@("layer","set","3","opacity","80"))
Run-PS ($P+@("layer","set","22","blend_mode","overlay"))
Run-PS ($P+@("layer","set","22","opacity","40"))
Run-PS ($P+@("export","render","$here\mona_poster.png","--also","$here\mona_poster.psd","--also","$here\mona_poster.jpg","--overwrite"))
Run-PS @("psd","edit","$here\mona_poster.psd","--hide","glasses 1","--hide","glasses 2","--hide","glasses 3","--hide","glasses 4","--hide","glasses 5","--hide","glasses 6","--hide","glasses 7","--hide","glasses 8","--hide","glasses shine 1","--hide","glasses shine 2","--hide","glasses shine 3","--hide","glasses shine 4","--set-text","kicker=BEFORE THE AI TOUCHED THE","-o","$here\mona_before.png","--overwrite")
Write-Host "ALL DONE - tell Claude 'done'" -ForegroundColor Green
