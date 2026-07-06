# Sert Streets of SaranFou (requis pour Phaser + assets locaux)
$root = Split-Path -Parent $PSScriptRoot

function Test-GameAlreadyRunning($port) {
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:$port/index.html" -UseBasicParsing -TimeoutSec 2
        return $r.StatusCode -eq 200 -and $r.Content -match 'Streets of SaranFou'
    } catch {
        return $false
    }
}

function Open-Browser($port) {
    Start-Process "http://localhost:$port/"
}

function Send-File($context, $filePath) {
    if (-not (Test-Path $filePath -PathType Leaf)) {
        $context.Response.StatusCode = 404
        $context.Response.Close()
        return
    }
    $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
    $types = @{
        '.html' = 'text/html; charset=utf-8'
        '.js'   = 'application/javascript; charset=utf-8'
        '.css'  = 'text/css; charset=utf-8'
        '.png'  = 'image/png'
        '.jpg'  = 'image/jpeg'
        '.jpeg' = 'image/jpeg'
        '.json' = 'application/json'
    }
    $bytes = [System.IO.File]::ReadAllBytes($filePath)
    $context.Response.ContentType = $types[$ext]
    if (-not $context.Response.ContentType) { $context.Response.ContentType = 'application/octet-stream' }
    $context.Response.ContentLength64 = $bytes.Length
    $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    $context.Response.Close()
}

# Jeu déjà servi (ex. précédent play.bat encore actif) → ouvrir le navigateur
foreach ($p in @(8080, 8081, 8082, 8765, 5173)) {
    if (Test-GameAlreadyRunning $p) {
        Write-Host "Jeu deja accessible sur http://localhost:$p/ - ouverture du navigateur."
        Open-Browser $p
        exit 0
    }
}

$listener = $null
$port = $null
foreach ($tryPort in @(8080, 8081, 8082, 8765, 5173)) {
    $candidate = New-Object System.Net.HttpListener
    $candidate.Prefixes.Add("http://localhost:$tryPort/")
    try {
        $candidate.Start()
        $listener = $candidate
        $port = $tryPort
        break
    } catch {
        try { $candidate.Close() } catch {}
    }
}

if (-not $listener) {
    Write-Host ""
    Write-Host "ERREUR: impossible de demarrer le serveur (ports 8080-8082, 8765, 5173 occupes)."
    Write-Host "Fermez les autres fenetres PowerShell du jeu ou redemarrez le PC."
    Write-Host ""
    Read-Host "Appuyez sur Entree pour quitter"
    exit 1
}

$url = "http://localhost:$port/"
Write-Host "Streets of SaranFou - $url"
Write-Host "Ctrl+C pour arreter"
Open-Browser $port

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $raw = $context.Request.Url.LocalPath
        $rel = $raw.TrimStart('/').Replace('/', [IO.Path]::DirectorySeparatorChar)
        if ([string]::IsNullOrEmpty($rel)) { $rel = 'index.html' }
        $filePath = Join-Path $root $rel
        $fullRoot = [IO.Path]::GetFullPath($root)
        $fullFile = [IO.Path]::GetFullPath($filePath)
        if (-not $fullFile.StartsWith($fullRoot, [StringComparison]::OrdinalIgnoreCase)) {
            $context.Response.StatusCode = 403
            $context.Response.Close()
            continue
        }
        Send-File $context $fullFile
    }
} finally {
    if ($listener) {
        try { $listener.Stop() } catch {}
    }
}
