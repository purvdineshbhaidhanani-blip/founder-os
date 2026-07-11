# Founder OS — stop the whole portfolio (Windows, PowerShell).
#
#   ./stop-portfolio.ps1
#   (or run stop-portfolio.cmd)
#
# Frees ports 3000-3012 by stopping the launcher and all 12 product servers.
# Does NOT stop PostgreSQL or Redis (other apps may rely on them) — pass
# -IncludeServices to also stop the Founder OS Docker containers if you used
# them.

param([switch]$IncludeServices)

$ErrorActionPreference = "SilentlyContinue"
Set-Location -Path $PSScriptRoot

Write-Host "== Stopping Founder OS portfolio ==" -ForegroundColor Cyan

Set-Location -Path (Join-Path $PSScriptRoot "infrastructure\launcher")
node scripts/stop-portfolio.mjs

if ($IncludeServices) {
  Write-Host "Stopping Founder OS Docker containers (if any)…"
  docker stop founderos-pg founderos-redis 2>$null | Out-Null
}

Write-Host "Done." -ForegroundColor Green
