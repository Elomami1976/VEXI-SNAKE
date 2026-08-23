@echo off
REM Start a static file server for the Snake game on port 3000
cd /d "%~dp0"
echo Serving Snake game at http://localhost:3000
npx --yes serve . -l 3000
