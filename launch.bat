@echo off
REM ARES-I Mission - Quick Launch Script
REM This script starts the local HTTP server and opens the project

echo.
echo ========================================
echo   ARES-I MISSION LAUNCHER
echo ========================================
echo.

REM Change to project directory
cd /d C:\Users\himan\Downloads\ares-mars-final

echo [1/3] Starting local HTTP server on port 8000...
echo.

REM Start Python HTTP server
python -m http.server 8000

echo.
echo [2/3] Server running!
echo [3/3] Open your browser and go to:
echo.
echo        http://localhost:8000
echo.
echo        OR for mobile testing:
echo        http://[YOUR_IP]:8000
echo.
echo ========================================
echo  Press Ctrl+C to stop the server
echo ========================================
echo.

pause
