$root = Split-Path -Parent $PSScriptRoot
$htmlPath = Join-Path $root "index.html"
$assetsDir = Join-Path $root "assets"

$html = [System.IO.File]::ReadAllText($htmlPath)
New-Item -ItemType Directory -Force -Path $assetsDir | Out-Null

$regex = [regex]"(\w+):'data:image/(jpeg|png);base64,([^']+)'"
$matches = $regex.Matches($html)
$manifest = @{}

foreach ($match in $matches) {
    $key = $match.Groups[1].Value
    $mime = $match.Groups[2].Value
    $ext = if ($mime -eq 'jpeg') { 'jpg' } else { 'png' }
    $bytes = [Convert]::FromBase64String($match.Groups[3].Value)
    $outPath = Join-Path $assetsDir "$key.$ext"
    [System.IO.File]::WriteAllBytes($outPath, $bytes)
    $manifest[$key] = $ext
}

$manifestJson = ($manifest | ConvertTo-Json -Depth 1)
[System.IO.File]::WriteAllText((Join-Path $root "assets-manifest.json"), $manifestJson)
Write-Host "Extracted $($matches.Count) images to assets/ (flat)"
Write-Host "Run scripts\reorganize-assets.ps1 pour trier par personnage"
