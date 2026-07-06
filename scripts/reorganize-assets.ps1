# Apres extract-images.ps1 : renomme + dossiers par personnage
$root = Split-Path -Parent $PSScriptRoot
& (Join-Path $PSScriptRoot 'migrate-character-assets.ps1')
& (Join-Path $PSScriptRoot 'rebuild-index.ps1')
