@echo off
REM CrossFit-Streaming-Overlay starten (Windows)
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js wurde nicht gefunden. Bitte die LTS-Version von https://nodejs.org installieren.
  pause
  exit /b 1
)
if "%PORT%"=="" set PORT=8080
start "" cmd /c "timeout /t 2 >nul & start http://localhost:%PORT%/control.html"
node server.js
pause
