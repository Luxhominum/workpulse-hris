@echo off
setlocal enabledelayedexpansion

echo ===================================================
echo   WorkPulse HRIS - Android Production Release Builder
echo ===================================================

if "%JAVA_HOME%"=="" (
    if exist "C:\Program Files\Android\Android Studio\jbr" (
        set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
        set "PATH=!JAVA_HOME!\bin;!PATH!"
    )
)

cd /d "%~dp0frontend"

echo [1/3] Building static web assets for Capacitor...
call node ./scripts/build-cap.js
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Web build failed!
    exit /b %ERRORLEVEL%
)

echo [2/3] Syncing Capacitor Android assets...
call npx cap sync android
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Capacitor sync failed!
    exit /b %ERRORLEVEL%
)

echo [3/3] Assembling Production Release APK via Gradle...
cd android
call gradlew.bat assembleRelease
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Gradle build failed!
    exit /b %ERRORLEVEL%
)

cd ..\..

set RELEASE_APK=frontend\android\app\build\outputs\apk\release\app-release-unsigned.apk
if not exist "!RELEASE_APK!" (
    set RELEASE_APK=frontend\android\app\build\outputs\apk\release\app-release.apk
)

if exist "!RELEASE_APK!" (
    copy /Y "!RELEASE_APK!" "workpulse-v1.1.0-release.apk"
    echo ===================================================
    echo   BUILD SUCCESS!
    echo   Output APK: workpulse-v1.1.0-release.apk
    echo ===================================================
) else (
    echo [WARNING] Release APK not found in expected path. Check frontend\android\app\build\outputs\apk\release\
)

pause
