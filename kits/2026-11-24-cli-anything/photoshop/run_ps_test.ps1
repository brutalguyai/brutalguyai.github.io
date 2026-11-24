# brutal guy.ai - Photoshop CLI test (fixed Reel task, 3 runs). Run from this folder.
$ErrorActionPreference = "Continue"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $here
foreach ($i in 1..3) {
  $d = Join-Path $here "run_$i"
  New-Item -ItemType Directory -Force -Path $d | Out-Null
  $log = Join-Path $d "log.txt"
  "=== RUN $i  $(Get-Date -Format o)" | Out-File $log -Encoding utf8
  $P = @("--project", "$d\reel.ps-cli.json")
  $steps = @(
    @("project","new","--profile","instagram_story","-b","#b4c6d6","-n","reel","-o","$d\reel.ps-cli.json","--overwrite"),
    ($P + @("layer","add-shape","rect","--x","0","--y","1500","--width","1080","--height","420","--color","#1b2733","--name","band")),
    ($P + @("layer","add-image","$here\photo.png","--x","140","--y","300","--width","800","--name","photo")),
    ($P + @("layer","add-text","FACT OR HYPE?","--x","540","--y","1700","--size","110","--color","#c2272d","--align","center","--bold","--font","Arial-BoldMT","--name","title")),
    ($P + @("style","add","stroke","-l","-1","-p","color=#ffffff","-p","size=6")),
    ($P + @("export","render","$d\reel.png","--also","$d\reel.psd","--also","$d\reel.jpg","--overwrite"))
  )
  foreach ($s in $steps) {
    $t = Get-Date
    "`n> cli-anything-photoshop --json $($s -join ' ')" | Out-File $log -Append -Encoding utf8
    $out = & cli-anything-photoshop --json @s 2>&1 | Out-String
    $out | Out-File $log -Append -Encoding utf8
    "exit=$LASTEXITCODE secs=$([math]::Round(((Get-Date)-$t).TotalSeconds,1))" | Out-File $log -Append -Encoding utf8
  }
  Write-Host "Run $i finished"
}
Write-Host "ALL DONE - tell Claude 'done'"
