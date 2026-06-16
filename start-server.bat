@echo off
echo Starting local server...
echo.
echo Open browser at: http://localhost:5500
echo Press Ctrl+C to stop
echo.
node "%~dp0server.js"
pause
