$root = Split-Path -Parent $PSScriptRoot
$htmlPath = Join-Path $root "index.html"
$html = [System.IO.File]::ReadAllText($htmlPath)

$start = $html.IndexOf('class Game extends Phaser.Scene')
$end = $html.IndexOf('new Phaser.Game', $start)
if ($start -lt 0 -or $end -lt 0) { throw "Game class not found" }

$body = $html.Substring($start, $end - $start).TrimEnd()
$body = $body -replace '^class Game extends Phaser\.Scene', 'export class GameScene extends Phaser.Scene'

$header = @'
import Phaser from 'phaser';
import { W, H, FLOOR_TOP, FLOOR_BOTTOM, COL, F, FW, FH, FRAMES, GUST, NUM } from '../config/gameConfig.js';
import { CHARACTERS } from '../config/characters.js';
import { ENEMY_TYPES } from '../config/enemies.js';
import { LEVELS } from '../config/levels.js';
import { WEAPONS, WEAPON_KEYS, POLICE_ITEM } from '../config/weapons.js';
import { CONFIG, PROGRESS, DIFF } from '../config/difficulty.js';
import { padOf, padMenu, PAD } from '../input/gamepad.js';
import { dbgLog, showCrash } from '../debug/crashOverlay.js';
import { combatMixin } from '../game/combat.js';
import { stageMixin } from '../game/stage.js';
import { hudMixin } from '../game/hud.js';
import { policeMixin } from '../game/police.js';
import { decorMixin } from '../game/decor.js';
import { aiMixin } from '../game/ai.js';
import { fighterMixin } from '../game/fighter.js';
import { inputMixin } from '../game/input.js';

'@

$footer = @'

Object.assign(
  GameScene.prototype,
  fighterMixin,
  combatMixin,
  stageMixin,
  hudMixin,
  policeMixin,
  decorMixin,
  aiMixin,
  inputMixin
);
'@

# Split methods into mixin files by markers
$methodNames = @{
  'combat.js' = @(
    'attack','special','melee','hitCrate','spawnBullet','updateBullets',
    'hurt','die','flash','blink','spawnSpark','airKick','strike'
  );
  'stage.js' = @(
    'startStage','stageBanner','spawnWave','spawnBoss','checkClear','advance',
    'playerDown','gameOver','victory','banner'
  );
  'hud.js' = @(
    'buildHUD','updateHUD','updateWeaponHUD','floatText','toggleGod'
  );
  'police.js' = @(
    'callPolice','policeScene','drawPoliceScene','launchPoliceShell',
    'policeExplosion','endPoliceScene'
  );
  'decor.js' = @(
    'spawnDecor','spawnPickup','spawnFire','updateFires','pushOut','shake'
  );
  'ai.js' = @(
    'ai','bossAI','lorenzoCharge','lorenzoPunch','lorenzoCigare',
    'gustAI','gustShock','gustGun','gustRifle','kikorAI','kikorSkate',
    'makouAI','makouCharge','clampBand','clamp'
  );
  'fighter.js' = @(
    'makeFighter','anim','pose','jump','updateJump'
  );
  'input.js' = @(
    'update','updatePickups','padEndScreen','padActions','movePlayer'
  );
}

function Extract-Method($classText, $name) {
  $pattern = "(?ms)^  $name\([^)]*\)\{.*?(?=^  [a-zA-Z_][a-zA-Z0-9_]*\(|^})"
  $m = [regex]::Match($classText, $pattern)
  if (-not $m.Success) {
    Write-Warning "Method not found: $name"
    return $null
  }
  return $m.Value.TrimEnd()
}

# Core: constructor, init, create
$corePattern = '(?ms)^export class GameScene.*?(?=^  makeFighter\()'
$coreMatch = [regex]::Match($body, $corePattern)
$core = $coreMatch.Value.TrimEnd()

$gameDir = Join-Path $root "src\game"
New-Item -ItemType Directory -Force -Path $gameDir | Out-Null

foreach ($file in $methodNames.Keys) {
  $methods = $methodNames[$file]
  $parts = @()
  foreach ($m in $methods) {
    $part = Extract-Method $body $m
    if ($part) { $parts += $part }
  }
  $exportName = $file.Replace('.js','') + 'Mixin'
  $content = "/** GameScene mixin: $file */`nexport const $exportName = {`n"
  $content += ($parts -join "`n`n") + "`n};`n"
  Set-Content -Path (Join-Path $gameDir $file) -Value $content -Encoding UTF8
  Write-Host "Wrote $file ($($parts.Count) methods)"
}

$sceneContent = $header + $core + "`n}`n" + $footer
Set-Content -Path (Join-Path $root "src\scenes\GameScene.js") -Value $sceneContent -Encoding UTF8
Write-Host "GameScene.js written"
