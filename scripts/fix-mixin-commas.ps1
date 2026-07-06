$gameDir = Join-Path (Split-Path -Parent $PSScriptRoot) "src\game"
foreach ($file in Get-ChildItem $gameDir -Filter "*.js") {
  $c = [System.IO.File]::ReadAllText($file.FullName)
  $n = $c
  # Method on own line: "  }\n\n  name("
  $n = [regex]::Replace($n, '(?m)^(  \})\r?\n(?:\r?\n)+(?=  [a-zA-Z_][a-zA-Z0-9_]*\()', '$1,' + [Environment]::NewLine + [Environment]::NewLine)
  # Method ends inline: "}\n\n  name("
  $n = [regex]::Replace($n, '(?m)(\})\r?\n(?:\r?\n)+(?=  [a-zA-Z_][a-zA-Z0-9_]*\()', '$1,' + [Environment]::NewLine + [Environment]::NewLine)
  if ($n -ne $c) {
    [System.IO.File]::WriteAllText($file.FullName, $n)
    Write-Host "Fixed: $($file.Name)"
  } else {
    Write-Host "No change: $($file.Name)"
  }
}
