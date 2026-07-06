$assets = Join-Path (Split-Path -Parent $PSScriptRoot) 'assets'
Get-ChildItem $assets -Directory | Sort-Object Name | ForEach-Object {
    $n = (Get-ChildItem $_.FullName -Recurse -File).Count
    Write-Host "$($_.Name): $n"
    Get-ChildItem $_.FullName -Recurse -File | ForEach-Object { Write-Host "  $($_.Name)" }
}
