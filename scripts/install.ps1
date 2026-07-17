# Founder OS — install/verify script for Windows (PowerShell).
# Checks prerequisites, installs npm dependencies, builds, and runs
# diagnostics. Never installs system packages or downloads/executes a remote
# script on your behalf — it tells you what's missing and how to get it.

$ErrorActionPreference = "Stop"
$RequiredNodeMajor = 18

Write-Host "Founder OS — install"
Write-Host "====================="

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "X Node.js is not installed. Install Node.js >= 18.18.0 from https://nodejs.org/ and re-run this script."
    exit 1
}

$NodeVersion = (node -p "process.versions.node")
$NodeMajor = [int]($NodeVersion.Split(".")[0])
if ($NodeMajor -lt $RequiredNodeMajor) {
    Write-Host "X Node.js v$NodeVersion found, but Founder OS requires >= 18.18.0."
    exit 1
}
Write-Host "OK Node.js v$NodeVersion"

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "X npm is not installed (usually ships with Node.js)."
    exit 1
}
Write-Host "OK npm $(npm -v)"

if (Get-Command ollama -ErrorAction SilentlyContinue) {
    Write-Host "OK ollama found"
} else {
    Write-Host "!  ollama is not installed. Founder OS agents run locally against Ollama."
    Write-Host "   Install it from https://ollama.com/download, then run: ollama pull llama3.1"
    Write-Host "   (Founder OS still installs/builds without it -- you only need it to execute agents.)"
}

Write-Host ""
Write-Host "Installing npm dependencies..."
npm ci

Write-Host ""
Write-Host "Building..."
npm run build

Write-Host ""
Write-Host "Running diagnostics (founder doctor)..."
try { node dist/cli/founder.js doctor } catch { }

Write-Host ""
Write-Host "Install complete. Next steps:"
Write-Host "  node dist/cli/founder.js agent list"
Write-Host "  node dist/cli/founder.js run market-research-agent `"Find me a SaaS idea for dentists.`""
Write-Host "  node dist/cli/founder.js --help"
Write-Host ""
Write-Host "See docs/CLI_GUIDE.md and docs/INSTALL.md for more."
