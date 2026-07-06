Add-Type -AssemblyName System.Drawing
Get-ChildItem 'C:\Users\timbo\Documents\SaranFou\assets\sp_*.png' | Sort-Object Name | ForEach-Object {
  $i = [Drawing.Image]::FromFile($_.FullName)
  Write-Output "$($_.Name) $($i.Width)x$($i.Height)"
  $i.Dispose()
}
