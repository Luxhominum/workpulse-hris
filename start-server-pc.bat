@echo off
title WorkPulse HRIS - On-Premises Server Host
cd /d "%~dp0"

echo ======================================================================
echo           WorkPulse HRIS - Enterprise Host Engine (Production)
echo ======================================================================
echo.

:: 1. Automated Snapshot Backup Before Launch
echo [1/4] Running automated database & audit log snapshot...
powershell -ExecutionPolicy Bypass -File "%~dp0backend\scripts\backup-database.ps1"
echo.

:: 2. Get Current Host Local IP
for /f "tokens=4" %%a in ('route print ^| findstr 0.0.0.0.*0.0.0.0') do (
    set HOST_IP=%%a
    goto :ip_found
)
:ip_found
if "%HOST_IP%"=="" set HOST_IP=192.168.1.50

:: 3. Launch Backend API (Production Mode)
echo [2/4] Starting WorkPulse Backend Core Engine on Port 4000...
start "WorkPulse Backend API" /min cmd /c "cd /d "%~dp0backend" && npm start"

:: 4. Launch Frontend Web App (Production Mode)
echo [3/4] Starting WorkPulse Frontend Web Portal on Port 3000...
start "WorkPulse Frontend Web" /min cmd /c "cd /d "%~dp0frontend" && npm start"

:: 5. Launch Cloudflare Secure Public Tunnel
echo [4/4] Starting Cloudflare Zero-Trust Secure Tunnel...
set CLOUDFLARED="C:\Program Files (x86)\cloudflared\cloudflared.exe"
if exist %CLOUDFLARED% (
    start "WorkPulse Cloudflare Tunnel" cmd /k ""%CLOUDFLARED%" tunnel --url http://localhost:3000"
) else (
    echo [INFO] Cloudflare tunnel executable not found. Running in Local LAN mode.
)

echo.
echo ======================================================================
echo  WorkPulse HRIS is LIVE on this Server PC!
echo.
echo  * Akses Komputer Ini:
echo    - Portal HRD & Admin : http://localhost:3000/admin
echo    - Presensi Karyawan  : http://localhost:3000
echo.
echo  * Akses Wi-Fi Kantor (HP / Tablet / Laptop di kantor):
echo    - Portal Presensi    : http://%HOST_IP%:3000
echo    - Kios Absensi       : http://%HOST_IP%:3000/kiosk
echo.
echo  * Akses Luar Kantor (Internet / Data 4G-5G Sales):
echo    - Buka jendela "WorkPulse Cloudflare Tunnel" di atas
echo    - Gunakan tautan HTTPS resmi yang muncul (contoh: https://xxx.trycloudflare.com)
echo ======================================================================
echo.
pause
