# WorkPulse HRIS - Automated Daily Database & Photo Backup Script
# Usage: powershell -ExecutionPolicy Bypass -File .\backup-database.ps1

$ErrorActionPreference = "Stop"
$BaseDir = Resolve-Path "$PSScriptRoot\.."
$DbSource = Join-Path $BaseDir "prisma\dev.db"
$SelfiesSource = Join-Path $BaseDir "uploads\selfies"
$BackupDir = Join-Path $BaseDir "backups"

if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$DbBackupFile = Join-Path $BackupDir "workpulse_db_$Timestamp.db"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  WorkPulse HRIS - Daily Auto Backup   " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. Backup SQLite Database (Safe copy while WAL active)
if (Test-Path $DbSource) {
    Copy-Item -Path $DbSource -Destination $DbBackupFile -Force
    $DbSizeKb = [math]::Round((Get-Item $DbBackupFile).Length / 1KB, 2)
    Write-Host " [OK] Database snapshot saved: $DbBackupFile ($DbSizeKb KB)" -ForegroundColor Green
} else {
    Write-Host " [WARN] Database file not found at: $DbSource" -ForegroundColor Yellow
}

# 2. Backup Selfies Folder
if (Test-Path $SelfiesSource) {
    $SelfiesBackupZip = Join-Path $BackupDir "workpulse_selfies_$Timestamp.zip"
    Compress-Archive -Path "$SelfiesSource\*" -DestinationPath $SelfiesBackupZip -Force -ErrorAction SilentlyContinue
    if (Test-Path $SelfiesBackupZip) {
        $ZipSizeKb = [math]::Round((Get-Item $SelfiesBackupZip).Length / 1KB, 2)
        Write-Host " [OK] Selfies archive saved: $SelfiesBackupZip ($ZipSizeKb KB)" -ForegroundColor Green
    }
}

# 3. Retain only last 30 backups (Auto-purge older archives)
$MaxRetentionDays = 30
Get-ChildItem -Path $BackupDir -Filter "workpulse_*" | Where-Object {
    $_.CreationTime -lt (Get-Date).AddDays(-$MaxRetentionDays)
} | Remove-Item -Force

Write-Host " [OK] Backup complete. Retention policy: 30 days." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
