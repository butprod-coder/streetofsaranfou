# Renomme manu->jualos, cedric->yanu, mathieu->karonux et range par personnage
$root = Split-Path -Parent $PSScriptRoot
$assets = Join-Path $root 'assets'

$renames = @{
    'mathieu_sheet' = 'karonux_sheet'
    'mathieu_p' = 'karonux_p'
    'sp_mathieu_explo' = 'sp_karonux_explo'
    'sp_mathieu_fumee' = 'sp_karonux_fumee'
    'sp_mathieu_sleep' = 'sp_karonux_sleep'
    'manu_sheet' = 'jualos_sheet'
    'manu_p' = 'jualos_p'
    'sp_manu_pig1' = 'sp_jualos_pig1'
    'sp_manu_pig2' = 'sp_jualos_pig2'
    'sp_manu_pig3' = 'sp_jualos_pig3'
    'cedric_sheet' = 'yanu_sheet'
    'cedric_p' = 'yanu_p'
    'sp_cedric_wolf1' = 'sp_yanu_wolf1'
    'sp_cedric_wolf2' = 'sp_yanu_wolf2'
    'sp_cedric_wolf3' = 'sp_yanu_wolf3'
    'sp_cedric_wolf4' = 'sp_yanu_wolf4'
    'sp_cedric_wolf5' = 'sp_yanu_wolf5'
}

$playable = @('karonux', 'jualos', 'yanu', 'lorenzo', 'jo', 'kikor', 'gustavax')

function Get-TargetDir($baseName) {
    foreach ($c in $playable) {
        if ($baseName -eq "${c}_sheet" -or $baseName -eq "${c}_p") { return $c }
        if ($baseName -like "sp_${c}_*") { return $c }
    }
    if ($baseName -like 'kikor_e*' -or $baseName -like 'makouille*') { return 'enemies' }
    if ($baseName -like 'cop_*') { return 'shared/police' }
    if ($baseName -like 'w_*') { return 'shared/weapons' }
    if ($baseName -like 'obj_*' -or $baseName -like 'crate*') { return 'shared/decor' }
    if ($baseName -like 'level_bg_*' -or $baseName -eq 'titlebg') { return 'shared/levels' }
    if ($baseName -in @('chicken', 'chicken_gold', 'skateboard')) { return 'shared/pickups' }
    if ($baseName -eq 'specials_storyboard') { return 'shared/specials' }
    return $null
}

# Collecter tous les fichiers (aplatir l'ancienne structure)
$files = Get-ChildItem $assets -Recurse -File -ErrorAction SilentlyContinue
$moved = 0

foreach ($f in $files) {
    $base = $f.BaseName
    $ext = $f.Extension.TrimStart('.')
    $newBase = if ($renames.ContainsKey($base)) { $renames[$base] } else { $base }
    $dir = Get-TargetDir $newBase
    if (-not $dir) {
        Write-Warning "Pas de dossier pour: $base"
        continue
    }
    $destDir = Join-Path $assets $dir
    New-Item -ItemType Directory -Force -Path $destDir | Out-Null
    $dest = Join-Path $destDir "$newBase.$ext"
    if ($f.FullName -ne $dest) {
        Move-Item -LiteralPath $f.FullName -Destination $dest -Force
        $moved++
        if ($base -ne $newBase) { Write-Host "  $base -> $dir/$newBase.$ext" }
    }
}

# Supprimer dossiers vides de l'ancienne structure
@('characters', 'enemies', 'levels', 'decor', 'pickups', 'weapons', 'police', 'specials') | ForEach-Object {
    $old = Join-Path $assets $_
    if (Test-Path $old) {
        Get-ChildItem $old -Recurse -File -ErrorAction SilentlyContinue | Out-Null
        if (-not (Get-ChildItem $old -Recurse -File -ErrorAction SilentlyContinue)) {
            Remove-Item $old -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
}

Write-Host "Migration terminee: $moved fichiers"
