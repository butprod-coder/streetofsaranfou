# Regenerates assets-manifest.json + src/config/assets.js from le dossier assets/
$root = Split-Path -Parent $PSScriptRoot
$assets = Join-Path $root 'assets'
$manifestPath = Join-Path $root 'assets-manifest.json'
$outPath = Join-Path $root 'src\config\assets.js'

$manifest = @{}
Get-ChildItem $assets -Recurse -File | ForEach-Object {
    $base = $_.BaseName
    # Ignore fichiers temporaires (UUID, etc.)
    if ($base -match '^[0-9a-f]{8}-[0-9a-f]{4}-') { return }
    $ext = $_.Extension.TrimStart('.').ToLower()
    if ($ext -eq 'jpeg') { $ext = 'jpg' }
    $manifest[$_.BaseName] = $ext
}

$manifestJson = ($manifest | ConvertTo-Json -Depth 1)
[System.IO.File]::WriteAllText($manifestPath, $manifestJson)

$lines = @()
foreach ($prop in ($manifest.Keys | Sort-Object)) {
    $key = $prop -replace "'", "\'"
    $lines += "  '$key': '$($manifest[$prop])'"
}

$imgMap = '  Object.entries(IMG_EXT).map(([k, e]) => [k, `${ASSET_PATH}/${assetRelPath(k, e)}`])'

$content = @"
/** Chemins des images (assets/<personnage>/ ou assets/shared/). */
import { assetRelPath } from './assetPaths.js';

export const ASSET_PATH = 'assets';

export const IMG_EXT = {
$($lines -join ",`n")
};

export const IMG = Object.fromEntries(
$imgMap
);
"@

[System.IO.File]::WriteAllText($outPath, $content)
Write-Host "Written manifest ($($manifest.Count) assets) + assets.js"
