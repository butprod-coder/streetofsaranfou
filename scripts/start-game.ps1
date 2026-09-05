param([int]$Port = 3000)
$ErrorActionPreference = 'Stop'
$gameRoot = Split-Path -Parent $PSScriptRoot
$gameUrl = "http://localhost:$Port"
try {
    $null = & curl.exe -fsS --max-time 2 "$gameUrl/health"
    if ($LASTEXITCODE -eq 0) {
        try { Start-Process $gameUrl } catch { Write-Host "Le jeu est deja lance : $gameUrl" }
        exit 0
    }
} catch {}

$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
$nodePath = if ($nodeCommand) { $nodeCommand.Source } else { $null }
if (-not $nodePath) {
    $bundledNode = Join-Path ([Environment]::GetFolderPath('UserProfile')) '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
    if (Test-Path -LiteralPath $bundledNode) { $nodePath = $bundledNode }
}
if (-not $nodePath) { Write-Host 'Installe Node.js 22 ou plus recent depuis https://nodejs.org, puis relance play.bat.'; exit 1 }
$version = & $nodePath -p 'parseInt(process.versions.node, 10)'
if ([int]$version -lt 22) { Write-Host 'Node.js 22 ou plus recent est necessaire.'; exit 1 }
Set-Location -LiteralPath $gameRoot
if (-not (Test-Path -LiteralPath (Join-Path $gameRoot 'node_modules\ws\package.json'))) {
    $packageManager = Get-Command pnpm.cmd -ErrorAction SilentlyContinue
    if ($packageManager) { & $packageManager.Source install --prod --frozen-lockfile }
    else {
        $npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
        if ($npmCommand) { & $npmCommand.Source install --omit=dev --ignore-scripts }
        else { Write-Host 'Dependances absentes. Depuis ce dossier, lance pnpm install ou npm install.'; exit 1 }
    }
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
$env:PORT = $Port.ToString()
$runtimeDir = Join-Path $gameRoot '.runtime'
New-Item -ItemType Directory -Path $runtimeDir -Force | Out-Null
$serverProcess = Start-Process -FilePath $nodePath -ArgumentList 'server/index.js' -WorkingDirectory $gameRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $runtimeDir 'server.log') -RedirectStandardError (Join-Path $runtimeDir 'error.log')
try {
    $started = $false
    for ($attempt = 0; $attempt -lt 25; $attempt++) {
        if ($serverProcess.HasExited) { break }
        try {
            $health = Invoke-RestMethod -Uri "$gameUrl/health" -TimeoutSec 1
            if ($health.game -eq 'saranfou') { $started = $true; break }
        } catch {}
        Start-Sleep -Milliseconds 200
    }
    if (-not $started) { Write-Host "Le serveur n'a pas demarre. Consulte .runtime/error.log."; exit 1 }
    Write-Host "Streets of SaranFou est pret : $gameUrl"
    Write-Host 'Laisse cette fenetre ouverte pendant la partie. Ctrl+C pour arreter.'
    Start-Process $gameUrl
    $serverProcess.WaitForExit()
} finally {
    if (-not $serverProcess.HasExited) { Stop-Process -Id $serverProcess.Id -ErrorAction SilentlyContinue }
}
