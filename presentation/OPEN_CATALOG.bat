@echo off
REM catalog.html loads catalog-data.json via fetch() — that fails on file://.
REM Serve presentation/ over localhost, then open the catalog in the browser.
setlocal
cd /d "%~dp0"

set PORT=8765
where python >nul 2>&1
if errorlevel 1 (
  echo Python not found. Install Python or open:
  echo   https://neridavid1.github.io/QuestSystem/catalog.html
  pause
  exit /b 1
)

start "" "http://127.0.0.1:%PORT%/catalog.html"
echo Serving creator catalog at http://127.0.0.1:%PORT%/catalog.html
echo Keep this window open while browsing. Press Ctrl+C to stop.
python -m http.server %PORT%
