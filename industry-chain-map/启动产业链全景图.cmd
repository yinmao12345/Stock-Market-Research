@echo off
setlocal
cd /d "%~dp0"
start "industry-chain-map-server" /min npm.cmd start
timeout /t 1 /nobreak >nul
start "" "http://127.0.0.1:4173/"
endlocal
