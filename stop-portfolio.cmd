@echo off
REM Founder OS - stop the whole portfolio (Windows).
REM Frees ports 3000-3012 (launcher + all 12 products). Postgres and Redis are
REM left running. Double-click, or run from a terminal.
setlocal
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0stop-portfolio.ps1"
endlocal
