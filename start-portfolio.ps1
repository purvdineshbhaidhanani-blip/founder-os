# Founder OS — one-command portfolio startup for Windows (PowerShell).
#
#   Right-click > Run with PowerShell, or:  ./start-portfolio.ps1
#   For a lighter, much more stable run (recommended if dev mode struggles
#   with 12 concurrent servers):        ./start-portfolio.ps1 -Production
#   (start-portfolio.cmd calls this for you with the right execution policy.)
#
# It will:
#   1. verify Node.js is installed
#   2. start PostgreSQL (Windows service or Docker) if not already running
#   3. start Redis (Windows service, Memurai, or Docker) if not already running
#   4. install launcher deps, then run the cross-platform orchestrator which:
#        - bootstraps every product's DB, .env, migrations and seed data
#        - starts the launcher (3000) + all 12 products (3001-3012)
#        - waits until every server answers HTTP
#        - opens http://localhost:3000 in your browser
#   Leave this window open; press Ctrl+C to stop everything.

param([switch]$Production)

$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

function Test-Port([int]$Port) {
  try {
    $c = New-Object System.Net.Sockets.TcpClient
    $iar = $c.BeginConnect("127.0.0.1", $Port, $null, $null)
    $ok = $iar.AsyncWaitHandle.WaitOne(1000)
    if ($ok -and $c.Connected) { $c.Close(); return $true }
    $c.Close(); return $false
  } catch { return $false }
}

function Wait-Port([int]$Port, [int]$Seconds = 30) {
  for ($i = 0; $i -lt $Seconds; $i++) {
    if (Test-Port $Port) { return $true }
    Start-Sleep -Seconds 1
  }
  return $false
}

Write-Host "== Founder OS portfolio startup ==" -ForegroundColor Cyan

# 1. Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "Node.js is not installed or not on PATH. Install Node 20+ from https://nodejs.org and re-run." -ForegroundColor Red
  exit 1
}
Write-Host ("Node {0} detected." -f (node --version))

# 2. PostgreSQL on 5432
if (Test-Port 5432) {
  Write-Host "PostgreSQL already running on 5432."
} else {
  Write-Host "PostgreSQL not reachable on 5432 — attempting to start it…"
  $pgSvc = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($pgSvc) {
    Write-Host ("  starting Windows service {0}…" -f $pgSvc.Name)
    Start-Service $pgSvc.Name -ErrorAction SilentlyContinue
  } elseif (Get-Command docker -ErrorAction SilentlyContinue) {
    Write-Host "  no Postgres service found — starting a Docker container (founderos-pg)…"
    docker start founderos-pg 2>$null | Out-Null
    if (-not (Test-Port 5432)) {
      docker run -d --name founderos-pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16 | Out-Null
    }
  }
  if (-not (Wait-Port 5432 30)) {
    Write-Host "Could not start PostgreSQL on 5432. Start it manually (service or Docker) and re-run." -ForegroundColor Red
    exit 1
  }
  Write-Host "PostgreSQL is up."
}

# 3. Redis on 6379
if (Test-Port 6379) {
  Write-Host "Redis already running on 6379."
} else {
  Write-Host "Redis not reachable on 6379 — attempting to start it…"
  $redisSvc = Get-Service -Name "Redis","Memurai" -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($redisSvc) {
    Write-Host ("  starting Windows service {0}…" -f $redisSvc.Name)
    Start-Service $redisSvc.Name -ErrorAction SilentlyContinue
  } elseif (Get-Command docker -ErrorAction SilentlyContinue) {
    Write-Host "  no Redis service found — starting a Docker container (founderos-redis)…"
    docker start founderos-redis 2>$null | Out-Null
    if (-not (Test-Port 6379)) {
      docker run -d --name founderos-redis -p 6379:6379 redis:7 | Out-Null
    }
  }
  if (-not (Wait-Port 6379 30)) {
    Write-Host "Could not start Redis on 6379. Install Redis/Memurai or Docker, then re-run." -ForegroundColor Red
    exit 1
  }
  Write-Host "Redis is up."
}

# 4. Launcher deps + orchestrator (bootstrap + start + wait + open browser)
Set-Location -Path (Join-Path $PSScriptRoot "infrastructure\launcher")
if (-not (Test-Path "node_modules")) {
  Write-Host "Installing launcher dependencies…"
  npm install
}

Write-Host "Handing off to the cross-platform orchestrator…" -ForegroundColor Cyan
if ($Production) {
  node scripts/start-portfolio.mjs --production
} else {
  node scripts/start-portfolio.mjs
}
