param(
  [string]$Directory = "assets/enemies/elites"
)

Add-Type -AssemblyName System.Drawing

function Test-BackdropPixel([System.Drawing.Color]$Color) {
  $max = [Math]::Max($Color.R, [Math]::Max($Color.G, $Color.B))
  $min = [Math]::Min($Color.R, [Math]::Min($Color.G, $Color.B))
  # The generated checkerboard is neutral grey/white. Keep the threshold
  # tight enough to preserve coloured sprites and black outlines.
  return (($max - $min) -le 14 -and $max -ge 118)
}

Get-ChildItem -LiteralPath $Directory -Filter '*.png' | ForEach-Object {
  $source = [System.Drawing.Bitmap]::new($_.FullName)
  $bitmap = [System.Drawing.Bitmap]::new($source.Width, $source.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.DrawImageUnscaled($source, 0, 0)
  $graphics.Dispose()
  $source.Dispose()

  $width = $bitmap.Width
  $height = $bitmap.Height
  $visited = New-Object 'bool[,]' $width, $height
  $queueX = New-Object 'int[]' ($width * $height)
  $queueY = New-Object 'int[]' ($width * $height)

  function Clear-BackdropComponent([int]$startX, [int]$startY, [bool]$allowEnclosed) {
    if ($visited[$startX, $startY]) { return }
    $startColor = $bitmap.GetPixel($startX, $startY)
    if (-not (Test-BackdropPixel $startColor)) { return }

    $head = 0; $tail = 1
    $queueX[0] = $startX; $queueY[0] = $startY
    $visited[$startX, $startY] = $true
    $component = New-Object 'System.Collections.Generic.List[System.Drawing.Point]'
    $touchesEdge = ($startX -eq 0 -or $startY -eq 0 -or $startX -eq ($width - 1) -or $startY -eq ($height - 1))
    $bright = 0; $mid = 0
    while ($head -lt $tail) {
      $x = $queueX[$head]; $y = $queueY[$head]; $head++
      $component.Add([System.Drawing.Point]::new($x, $y))
      $c = $bitmap.GetPixel($x, $y)
      if ($c.R -ge 235 -and $c.G -ge 235 -and $c.B -ge 235) { $bright++ }
      if ($c.R -ge 145 -and $c.R -le 225 -and [Math]::Abs($c.R - $c.G) -le 8 -and [Math]::Abs($c.R - $c.B) -le 8) { $mid++ }
      foreach ($delta in @(@(1,0), @(-1,0), @(0,1), @(0,-1))) {
        $nx = $x + $delta[0]; $ny = $y + $delta[1]
        if ($nx -lt 0 -or $ny -lt 0 -or $nx -ge $width -or $ny -ge $height) { continue }
        if ($visited[$nx, $ny]) { continue }
        $nc = $bitmap.GetPixel($nx, $ny)
        if (-not (Test-BackdropPixel $nc)) { continue }
        $visited[$nx, $ny] = $true
        if ($nx -eq 0 -or $ny -eq 0 -or $nx -eq ($width - 1) -or $ny -eq ($height - 1)) { $touchesEdge = $true }
        $queueX[$tail] = $nx; $queueY[$tail] = $ny; $tail++
      }
    }

    # Edge-connected components are definitely the checkerboard. Enclosed
    # components are cleared only when they have the two-tone checker profile,
    # avoiding removal of white costume details inside a sprite.
    $checkerLike = ($component.Count -ge 18 -and $bright -ge ($component.Count * 0.08) -and $mid -ge ($component.Count * 0.12))
    if ($touchesEdge -or ($allowEnclosed -and $checkerLike -and $component.Count -le 2200)) {
      foreach ($point in $component) {
        $old = $bitmap.GetPixel($point.X, $point.Y)
        $bitmap.SetPixel($point.X, $point.Y, [System.Drawing.Color]::FromArgb(0, $old.R, $old.G, $old.B))
      }
    }
  }

  # First pass clears every background component connected to the canvas edge.
  for ($x = 0; $x -lt $width; $x++) {
    Clear-BackdropComponent $x 0 $false
    Clear-BackdropComponent $x ($height - 1) $false
  }
  for ($y = 0; $y -lt $height; $y++) {
    Clear-BackdropComponent 0 $y $false
    Clear-BackdropComponent ($width - 1) $y $false
  }
  # Second pass handles enclosed checkerboard pockets between limbs/props.
  for ($x = 0; $x -lt $width; $x++) {
    for ($y = 0; $y -lt $height; $y++) {
      Clear-BackdropComponent $x $y $true
    }
  }

  $tmp = "$($_.FullName).tmp.png"
  $bitmap.Save($tmp, [System.Drawing.Imaging.ImageFormat]::Png)
  $bitmap.Dispose()
  Move-Item -LiteralPath $tmp -Destination $_.FullName -Force
  Write-Output "Détouré: $($_.Name)"
}
