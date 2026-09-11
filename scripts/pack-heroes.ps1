param(
  [string]$SourceDirectory = 'C:/Users/timbo/.codex/generated_images/01a0705b-f0d9-7d83-ad82-7589c585781a',
  [string]$RuntimeDirectory = 'C:/Users/timbo/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/powershell',
  [string]$Only = '',
  [string]$PackingFile = 'assets/heroes/packing.json',
  [string]$OutputDirectory = 'assets/heroes'
)
$ErrorActionPreference = 'Stop'
$refs = @(Get-ChildItem $RuntimeDirectory -Filter 'System.Private.Windows*.dll' | Select-Object -ExpandProperty FullName)
$refs += Join-Path $RuntimeDirectory 'System.Drawing.Common.dll'
$refs += Join-Path $RuntimeDirectory 'System.Drawing.Primitives.dll'
foreach ($assembly in $refs) { [Reflection.Assembly]::LoadFrom($assembly) | Out-Null }
Add-Type -Path scripts/SpriteCutout.cs -ReferencedAssemblies $refs
Add-Type -Path scripts/ClassicAtlas.cs -ReferencedAssemblies $refs
$packing = Get-Content $PackingFile -Raw | ConvertFrom-Json -AsHashtable
New-Item -ItemType Directory -Force test-results/hero-source-work | Out-Null
foreach ($id in $packing.Keys) {
  if ($Only -and $id -ne $Only) { continue }
  $spec = $packing[$id]
  if ($spec.rawCopy) {
    Copy-Item -LiteralPath (Join-Path $SourceDirectory $spec.source) -Destination "$OutputDirectory/$id.png"
    continue
  }
  $inputPath = [IO.Path]::GetFullPath("test-results/hero-source-work/$id.png")
  Copy-Item -LiteralPath (Join-Path $SourceDirectory $spec.source) -Destination $inputPath
  [SpriteCutout]::Process($inputPath, $false)
  $cutoutPath = "$inputPath.cutout.png"
  $bitmap = [Drawing.Bitmap]::new($cutoutPath)
  $rectangles = @()
  for ($row = 0; $row -lt $spec.rows.Count - 1; $row++) {
    $columns = if ($spec.rowColumns -and $spec.rowColumns.ContainsKey([string]$row)) { $spec.rowColumns[[string]$row] } else { $spec.columns }
    for ($col = 0; $col -lt 4; $col++) {
      $x1 = [int][Math]::Floor($columns[$col] * $bitmap.Width)
      $x2 = [int][Math]::Floor($columns[$col + 1] * $bitmap.Width)
      $y1 = [int][Math]::Floor($spec.rows[$row] * $bitmap.Height)
      $y2 = [int][Math]::Floor($spec.rows[$row + 1] * $bitmap.Height)
      $rectangles += ,@($x1, $y1, ($x2 - $x1), ($y2 - $y1))
    }
  }
  Write-Output "$id : $($bitmap.Width)x$($bitmap.Height), $($rectangles.Count) poses"
  $bitmap.Dispose()
  [ClassicAtlas]::Pack($cutoutPath, [IO.Path]::GetFullPath("$OutputDirectory/$id.png"), [int[][]]$rectangles, [int[][]]$spec.holes, [int[][]]$spec.exclusions)
}
