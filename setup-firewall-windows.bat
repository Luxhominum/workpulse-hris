@echo off
:: Setup Firewall Rules for WorkPulse HRIS on Windows Host PC
echo Requesting administrator privileges...
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] Harap klik kanan script ini dan pilih "Run as administrator"!
    pause
    exit /b 1
)

echo Mengizinkan port 3000 (Web Frontend) dan 4000 (Backend API) di Windows Firewall...
netsh advfirewall firewall delete rule name="WorkPulse HRIS Ports" >nul 2>&1
netsh advfirewall firewall add rule name="WorkPulse HRIS Ports" dir=in action=allow protocol=TCP localport=3000,4000 profile=any

echo.
echo [SUKSES] Port 3000 & 4000 berhasil dibuka! 
echo Perangkat HP / Laptop di jaringan Wi-Fi kantor sekarang bisa mengakses web app di PC ini.
pause
