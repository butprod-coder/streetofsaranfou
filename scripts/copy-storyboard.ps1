$src = 'C:\Users\timbo\.cursor\projects\c-Users-timbo-Documents-SaranFou\assets\c__Users_timbo_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_image-4cca4957-b333-450b-8072-a97108a4880e.png'
$dst = Join-Path (Split-Path -Parent $PSScriptRoot) 'assets\shared\specials\specials_storyboard.png'
Copy-Item $src $dst -Force
Add-Type -AssemblyName System.Drawing
$i = [Drawing.Image]::FromFile($dst)
Write-Host "Storyboard: $($i.Width)x$($i.Height)"
$i.Dispose()
