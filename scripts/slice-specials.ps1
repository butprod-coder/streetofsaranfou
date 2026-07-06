# Recrop sp_* depuis le storyboard vers dossiers par personnage
$root = Split-Path -Parent $PSScriptRoot
$src = Join-Path $root 'assets\shared\specials\specials_storyboard.png'

if (-not (Test-Path $src)) {
    Write-Error "Missing storyboard - run copy-storyboard.ps1 first"
    exit 1
}

Add-Type -AssemblyName System.Drawing

function Export-Crop($charDir, $name, $x, $y, $w, $h) {
    $outDir = Join-Path $root "assets\$charDir"
    New-Item -ItemType Directory -Force -Path $outDir | Out-Null
    $srcImg = [Drawing.Image]::FromFile($src)
    $bmp = New-Object System.Drawing.Bitmap $w, $h
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.Clear([Drawing.Color]::FromArgb(0, 0, 0, 0))
    $srcRect = New-Object System.Drawing.Rectangle $x, $y, $w, $h
    $dstRect = New-Object System.Drawing.Rectangle 0, 0, $w, $h
    $g.DrawImage($srcImg, $dstRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
    $path = Join-Path $outDir "$name.png"
    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose(); $bmp.Dispose(); $srcImg.Dispose()
    Write-Host "  $charDir/$name ${w}x${h}"
}

Write-Host "Slicing specials from storyboard..."

# KARONUX
Export-Crop 'karonux' 'sp_karonux_explo'  328  58  198  58
Export-Crop 'karonux' 'sp_karonux_fumee'  528  58  168  58
Export-Crop 'karonux' 'sp_karonux_sleep'  748  58  148  58

# JUALOS
Export-Crop 'jualos' 'sp_jualos_pig1'  308  163  168  58
Export-Crop 'jualos' 'sp_jualos_pig2'  518  163  198  58
Export-Crop 'jualos' 'sp_jualos_pig3'  748  163  148  58

# YANU
Export-Crop 'yanu' 'sp_yanu_wolf1' 148  268  128  58
Export-Crop 'yanu' 'sp_yanu_wolf2' 288  268  125  58
Export-Crop 'yanu' 'sp_yanu_wolf3' 438  268  145  58
Export-Crop 'yanu' 'sp_yanu_wolf4' 588  268  145  58
Export-Crop 'yanu' 'sp_yanu_wolf5' 758  268  130  58

# LORENZO
Export-Crop 'lorenzo' 'sp_lorenzo_cig1' 148  373  128  58
Export-Crop 'lorenzo' 'sp_lorenzo_cig2' 398  373  118  40
Export-Crop 'lorenzo' 'sp_lorenzo_cig3' 648  373  128  40

# JO
Export-Crop 'jo' 'sp_jo_tornado1' 148  478  168  58
Export-Crop 'jo' 'sp_jo_tornado2' 398  478  228  58
Export-Crop 'jo' 'sp_jo_tornado3' 698  478  158  58

# KIKOR
Export-Crop 'kikor' 'sp_kikor_roll1' 148  583  128  58
Export-Crop 'kikor' 'sp_kikor_roll2' 298  583  132  58
Export-Crop 'kikor' 'sp_kikor_roll3' 438  583  132  58
Export-Crop 'kikor' 'sp_kikor_roll4' 578  583  132  58
Export-Crop 'kikor' 'sp_kikor_roll5' 718  583  132  58

Write-Host "Done - 22 sprites dans dossiers personnages."
