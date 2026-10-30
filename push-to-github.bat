@echo off
title Push WorkPulse to GitHub (Luxhominum)
cd /d "%~dp0"

echo ======================================================================
echo       Push WorkPulse HRIS ke GitHub Akun: Luxhominum
echo ======================================================================
echo.
echo Langkah 1: Pastikan Anda sudah membuat repository kosong di GitHub:
echo   1. Buka browser: https://github.com/new
echo   2. Repository name : workpulse-hris
echo   3. Pilih           : Public atau Private (bebas)
echo   4. Jangan centang "Add a README file"
echo   5. Klik tombol hijau "Create repository"
echo.
echo ======================================================================
echo Jika repo 'workpulse-hris' sudah dibuat, tekan tombol apa saja untuk
echo langsung mengunggah source code ke GitHub...
echo ======================================================================
pause

echo.
echo Mengunggah ke https://github.com/Luxhominum/workpulse-hris.git ...
git push -u origin main

if %ERRORLEVEL% equ 0 (
    echo.
    echo ======================================================================
    echo   BERHASIL DIUNGGAH KE GITHUB!
    echo   URL Repo: https://github.com/Luxhominum/workpulse-hris
    echo ======================================================================
) else (
    echo.
    echo [GAGAL] Pastikan repo sudah dibuat di https://github.com/new dengan nama: workpulse-hris
)

echo.
pause
