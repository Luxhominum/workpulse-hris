Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "C:\Users\User\Documents\antigravity\Project Aneh\hris-attendance"

' 1. Run Automated Backup
WshShell.Run "powershell -ExecutionPolicy Bypass -WindowStyle Hidden -File ""C:\Users\User\Documents\antigravity\Project Aneh\hris-attendance\backend\scripts\backup-database.ps1""", 0, True

' 2. Start Backend API Daemon Silently
WshShell.Run "cmd /c cd /d ""C:\Users\User\Documents\antigravity\Project Aneh\hris-attendance\backend"" && npm run dev", 0, False

' 3. Start Frontend Web Daemon Silently
WshShell.Run "cmd /c cd /d ""C:\Users\User\Documents\antigravity\Project Aneh\hris-attendance\frontend"" && npm run dev", 0, False

' 4. Attempt Wireless / USB Port Mapping
WshShell.Run "powershell -ExecutionPolicy Bypass -WindowStyle Hidden -Command ""$adb = '$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe'; if (Test-Path $adb) { & $adb reverse tcp:4000 tcp:4000 2>$null; & $adb reverse tcp:3000 tcp:3000 2>$null }""", 0, False
