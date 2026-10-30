@echo off
set "JAVA_HOME=C:\Users\User\.jdks\jbr-21.0.11"
set "PATH=%JAVA_HOME%\bin;%PATH%"
cd /d "c:\Users\User\Documents\antigravity\Project Aneh\hris-attendance\frontend\android"
call gradlew.bat installDebug
