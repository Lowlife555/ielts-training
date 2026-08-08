@echo off
setlocal enabledelayedexpansion
title IELTS Training Launcher
cd /d D:\ielts-training

echo ============================================
echo   IELTS 6.5 Training Platform Launcher
echo ============================================
echo.

echo [1/3] Starting API server and frontend dev server...
:: Start concurrently in a minimized window
start "IELTS-Training" /min cmd /c "npm run dev"

echo [2/3] Waiting for servers to be ready...

:: Poll health check endpoint until server responds
:wait_loop
timeout /t 2 /nobreak >nul
powershell -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:3001/api/health' -UseBasicParsing -TimeoutSec 2; exit 0 } catch { exit 1 }" >nul 2>&1
if %ERRORLEVEL% neq 0 goto :wait_loop

echo [3/3] Opening browser...
start "" http://localhost:5174

echo.
echo ============================================
echo   Platform is running!  ^(http://localhost:5174^)
echo.
echo   Close ALL browser tabs of the IELTS site
echo   to auto-stop all servers.
echo ============================================
echo.

:: Give browser time to establish connections
timeout /t 4 /nobreak >nul

:: Monitor connections - when browser tabs close,
:: TCP connections to dev server and API server drop
:monitor
timeout /t 3 /nobreak >nul

:: Check for ESTABLISHED connections on Vite dev server (5174)
netstat -ano 2>nul | findstr ":5174" | findstr "ESTABLISHED" >nul
if %ERRORLEVEL% equ 0 goto :monitor

:: Check for ESTABLISHED connections on API server (3001)
netstat -ano 2>nul | findstr ":3001" | findstr "ESTABLISHED" >nul
if %ERRORLEVEL% equ 0 goto :monitor

:: Double-check after a brief pause to avoid false triggers
timeout /t 3 /nobreak >nul
netstat -ano 2>nul | findstr ":5174" | findstr "ESTABLISHED" >nul
if %ERRORLEVEL% equ 0 (
    netstat -ano 2>nul | findstr ":3001" | findstr "ESTABLISHED" >nul
    if %ERRORLEVEL% equ 0 goto :shutdown
)
goto :monitor

:shutdown
echo.
echo Browser closed. Stopping all servers...

:: Kill the server window and all its child processes
taskkill /F /FI "WINDOWTITLE eq IELTS-Training" /T >nul 2>&1

:: Fallback: kill any remaining node processes on our ports
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":3001" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a /T >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":5174" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a /T >nul 2>&1
)

echo All servers stopped.
echo.
echo This window will close in 3 seconds...
timeout /t 3 /nobreak >nul
exit
