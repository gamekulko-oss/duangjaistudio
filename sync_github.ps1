# Script สำหรับ Auto-Sync ไปยัง GitHub
$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $PSScriptRoot
$watcher.IncludeSubdirectories = $true
$watcher.EnableRaisingEvents = $true

# กองไฟล์ที่ไม่ต้องการให้ Trigger (เช่น .git)
$exclude = ".git|node_modules|Thumbs.db"

Write-Host "------------------------------------------------" -ForegroundColor Green
Write-Host "🚀 Auto-Sync started! Monitoring your changes..." -ForegroundColor Green
Write-Host "Press Ctrl+C to stop the sync." -ForegroundColor Yellow
Write-Host "------------------------------------------------"

$action = {
    $path = $EventArgs.FullPath
    $name = $EventArgs.Name
    
    # ตรวจสอบว่าไม่ใช่ไฟล์ใน .git หรือไฟล์ที่เรายกเว้น
    if ($path -notmatch $exclude) {
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        Write-Host "[$timestamp] Detected change in: $name" -ForegroundColor Cyan
        
        # รันคำสั่ง Git
        git add .
        git commit -m "Auto-sync: $timestamp"
        git push origin main
        
        Write-Host "✅ Synced to GitHub successfully!" -ForegroundColor Green
        Write-Host "------------------------------------------------"
    }
}

# ลงทะเบียนเหตุการณ์เมื่อมีการสร้าง, แก้ไข, ลบ หรือเปลี่ยนชื่อไฟล์
Register-ObjectEvent $watcher "Changed" -Action $action
Register-ObjectEvent $watcher "Created" -Action $action
Register-ObjectEvent $watcher "Deleted" -Action $action
Register-ObjectEvent $watcher "Renamed" -Action $action

# รัน Loop ค้างไว้
while ($true) { Start-Sleep -Seconds 1 }
