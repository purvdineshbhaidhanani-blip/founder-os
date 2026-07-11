@echo off
REM Founder OS - one-command portfolio startup for Windows.
REM Double-click this file (or run it from a terminal). It starts Postgres and
REM Redis if needed, bootstraps every database, launches the launcher (3000)
REM and all 12 products (3001-3012), waits until they are reachable, and opens
REM http://localhost:3000 in your browser. Leave the window open; close it or
REM press Ctrl+C to stop.
REM
REM   start-portfolio.cmd              dev mode (hot reload)
REM   start-portfolio.cmd --production  optimized build, much lighter on
REM                                      CPU/RAM - recommended if dev mode is
REM                                      slow or unstable with 12 servers up
setlocal
cd /d "%~dp0"
set PROD_FLAG=
if /i "%~1"=="--production" set PROD_FLAG=-Production
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-portfolio.ps1" %PROD_FLAG%
if %ERRORLEVEL% NEQ 0 (
  echo.
  echo Startup failed with error %ERRORLEVEL%. See the messages above.
  pause
)
endlocal
