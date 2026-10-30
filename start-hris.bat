@echo off
title WorkPulse HRIS - On-Premises Server Launcher
cd /d "%~dp0"

echo ======================================================================
echo           WorkPulse HRIS - On-Premises Server Engine
echo ======================================================================
echo.

:: 1. Automated Snapshot Backup
echo [1/4] Running daily database & photo backup...
powershell -ExecutionPolicy Bypass -File "%~dp0backend\scripts\backup-database.ps1"
echo.

:: 2. ADB Reverse Port Mapping (if phone connected via USB or wireless)
set ADB="%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe"
if exist %ADB% (
    echo [2/4] Setting up port reverse forwarding for smartphone...
    %ADB% reverse tcp:4000 tcp:4000 2>nul
    %ADB% reverse tcp:3000 tcp:3000 2>nul
    echo  [OK] Ports 4000 & 3000 mapped.
) else (
    echo  [INFO] ADB tool not found. Direct Wi-Fi LAN mode active.
)
echo.

:: 3. Launch Backend API (Port 4000)
echo [3/4] Launching Backend API (Port 4000, SQLite WAL Mode)...
start "WorkPulse Backend API" cmd /k "cd /d "%~dp0backend" && npm run dev"

:: 4. Launch Frontend Web & Admin Portal (Port 3000)
echo [4/4] Launching Frontend Web Portal (Port 3000)...
start "WorkPulse Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo ======================================================================
echo  WorkPulse HRIS is now running on this PC!
echo.
echo  * Local PC Access:
echo    - Admin Portal  : http://localhost:3000/admin
echo    - ESS Employee  : http://localhost:3000
echo    - API Health    : http://localhost:4000/api/v1/health
echo.
echo  * Office Wi-Fi LAN Access (Smartphone / Laptop):
echo    - Web Attendance: http://192.168.1.50:3000
echo    - API Server    : http://192.168.1.50:4000/api/v1
echo.
echo  * Remote 4G/5G Access (Cloudflare Tunnel):
echo    To allow field attendance outside office Wi-Fi, run:
echo    "C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://localhost:4000
echo ======================================================================
echo.
pause
