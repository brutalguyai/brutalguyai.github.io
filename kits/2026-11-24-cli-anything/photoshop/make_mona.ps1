# brutal guy.ai - Mona Lisa poster built ONLY with cli-anything-photoshop commands
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $here
$log = Join-Path $here "mona_log.txt"
"=== $(Get-Date -Format o)" | Out-File $log -Encoding utf8
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
Run-PS @("project","new","--profile","instagram_story","-b","#070b10","-n","mona","-o","$here\mona.ps-cli.json","--overwrite")

Run-PS ($P+@("layer","add-image","$here\mona.jpg","--x","-151","--y","0","--width","1500","--name","painting"))
Run-PS ($P+@("filter","add","brightness_contrast","-l","-1","-p","contrast=15"))
Run-PS ($P+@("layer","add-solid","#1b2733","--name","grade"))
Run-PS ($P+@("layer","set","1","blend_mode","soft_light"))
Run-PS ($P+@("layer","set","1","opacity","45"))
Run-PS ($P+@("layer","add-shape","rect","--x","0","--y","1300","--width","1080","--height","700","--color","#070b10","--name","bottom fade"))
Run-PS ($P+@("filter","add","gaussian_blur","-l","-1","-p","radius=110"))
Run-PS ($P+@("layer","add-shape","rect","--x","0","--y","-120","--width","1080","--height","420","--color","#070b10","--name","top fade"))
Run-PS ($P+@("filter","add","gaussian_blur","-l","-1","-p","radius=90"))
Run-PS ($P+@("layer","set","3","opacity","80"))
Run-PS ($P+@("layer","add-shape","rect","--x","384","--y","488","--width","300","--height","14","--color","#050505","--name","glasses 1"))
Run-PS ($P+@("layer","add-shape","rect","--x","392","--y","488","--width","134","--height","56","--color","#050505","--name","glasses 2"))
Run-PS ($P+@("layer","add-shape","rect","--x","406","--y","544","--width","106","--height","14","--color","#050505","--name","glasses 3"))
Run-PS ($P+@("layer","add-shape","rect","--x","420","--y","558","--width","78","--height","14","--color","#050505","--name","glasses 4"))
Run-PS ($P+@("layer","add-shape","rect","--x","542","--y","488","--width","134","--height","56","--color","#050505","--name","glasses 5"))
Run-PS ($P+@("layer","add-shape","rect","--x","556","--y","544","--width","106","--height","14","--color","#050505","--name","glasses 6"))
Run-PS ($P+@("layer","add-shape","rect","--x","570","--y","558","--width","78","--height","14","--color","#050505","--name","glasses 7"))
Run-PS ($P+@("layer","add-shape","rect","--x","528","--y","502","--width","12","--height","14","--color","#050505","--name","glasses 8"))
Run-PS ($P+@("layer","add-shape","rect","--x","420","--y","502","--width","14","--height","14","--color","#ffffff","--name","glasses shine 1"))
Run-PS ($P+@("layer","add-shape","rect","--x","448","--y","502","--width","14","--height","14","--color","#ffffff","--name","glasses shine 2"))
Run-PS ($P+@("layer","add-shape","rect","--x","570","--y","502","--width","14","--height","14","--color","#ffffff","--name","glasses shine 3"))
Run-PS ($P+@("layer","add-shape","rect","--x","598","--y","502","--width","14","--height","14","--color","#ffffff","--name","glasses shine 4"))
Run-PS ($P+@("layer","add-text","AI JUST EDITED THE","--x","540","--y","150","--size","52","--color","#f3f3f4","--align","center","--font","Arial-Black","--name","kicker","--tracking","50"))
Run-PS ($P+@("style","add","drop_shadow","-l","-1","-p","distance=6","-p","size=18","-p","opacity=80"))
Run-PS ($P+@("layer","add-text","MONA LISA","--x","540","--y","285","--size","130","--color","#f3f3f4","--align","center","--font","Arial-Black","--name","headline"))
Run-PS ($P+@("style","add","drop_shadow","-l","-1","-p","distance=6","-p","size=18","-p","opacity=80"))
Run-PS ($P+@("layer","add-text","ZERO CLICKS.","--x","540","--y","1580","--size","128","--color","#f3f3f4","--align","center","--font","Arial-Black","--name","title"))
Run-PS ($P+@("style","add","outer_glow","-l","-1","-p","color=#c2272d","-p","size=40","-p","opacity=55"))
Run-PS ($P+@("layer","add-shape","rect","--x","390","--y","1625","--width","300","--height","7","--color","#c2272d","--name","red line"))
Run-PS ($P+@("layer","add-text","FACT OR HYPE?","--x","540","--y","1730","--size","74","--color","#c2272d","--align","center","--font","Arial-Black","--name","tagline","--tracking","80"))
Run-PS ($P+@("layer","add-text","@brutal_guy.ai","--x","540","--y","1850","--size","32","--color","#b4c6d6","--align","center","--font","Arial-BoldMT","--name","handle","--tracking","100"))
Run-PS ($P+@("layer","add-solid","#808080","--name","film grain"))
Run-PS ($P+@("filter","add","add_noise","-l","-1","-p","amount=8","-p","monochromatic=true","-p","distribution=gaussian"))
Run-PS ($P+@("layer","set","22","blend_mode","overlay"))
Run-PS ($P+@("layer","set","22","opacity","40"))
Run-PS ($P+@("export","render","$here\mona_poster.png","--also","$here\mona_poster.psd","--also","$here\mona_poster.jpg","--overwrite"))
Run-PS @("psd","edit","$here\mona_poster.psd","--hide","glasses 1","--hide","glasses 2","--hide","glasses 3","--hide","glasses 4","--hide","glasses 5","--hide","glasses 6","--hide","glasses 7","--hide","glasses 8","--hide","glasses shine 1","--hide","glasses shine 2","--hide","glasses shine 3","--hide","glasses shine 4","--set-text","kicker=BEFORE THE AI TOUCHED THE","-o","$here\mona_before.png","--overwrite")
Write-Host "ALL DONE - tell Claude 'done'" -ForegroundColor Green
