# 数据库重置脚本
# 使用方法: .\scripts\reset-db.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🗄️  Aidean 数据库重置工具" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# 数据库配置
$DB_HOST = "localhost"
$DB_PORT = "5432"
$DB_USER = "root"
$DB_PASS = "NewPassword123!"
$DB_NAME = "aidean"

# 步骤1: 重新创建数据库
Write-Host "步骤1: 删除并重新创建数据库..." -ForegroundColor Yellow

# 创建临时SQL文件
$dropSql = @"
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE datname = '$DB_NAME' 
AND pid <> pg_backend_pid();

DROP DATABASE IF EXISTS $DB_NAME;
CREATE DATABASE $DB_NAME;
"@

$tempFile = [System.IO.Path]::GetTempFileName()
$dropSql | Out-File -FilePath $tempFile -Encoding UTF8

# 执行SQL（连接到postgres数据库）
$env:PGPASSWORD = $DB_PASS
try {
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -f $tempFile 2>&1
    Write-Host "✅ 数据库已重新创建" -ForegroundColor Green
} catch {
    Write-Host "❌ 数据库操作失败: $_" -ForegroundColor Red
    Write-Host "请确保 PostgreSQL 正在运行且配置正确" -ForegroundColor Yellow
}
Remove-Item $tempFile

# 步骤2: 执行SQL初始化脚本
Write-Host "`n步骤2: 执行SQL初始化脚本..." -ForegroundColor Yellow

$sqlDir = Join-Path $PSScriptRoot "..\docker\sql\init"
$sqlFiles = Get-ChildItem -Path $sqlDir -Filter "*.sql" | Sort-Object Name

foreach ($file in $sqlFiles) {
    Write-Host "执行: $($file.Name)" -ForegroundColor Gray
    try {
        $env:PGPASSWORD = $DB_PASS
        psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $file.FullName 2>&1 | Out-Null
        Write-Host "  ✅ 完成" -ForegroundColor Green
    } catch {
        Write-Host "  ⚠️ 警告: $_" -ForegroundColor Yellow
    }
}

# 步骤3: 生成Prisma客户端
Write-Host "`n步骤3: 生成Prisma客户端..." -ForegroundColor Yellow
try {
    npx prisma generate 2>&1 | Out-Null
    Write-Host "✅ Prisma客户端已生成" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Prisma generate 失败，请手动执行: npx prisma generate" -ForegroundColor Yellow
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "✅ 数据库重置完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "`n后续步骤:" -ForegroundColor White
Write-Host "1. npm run db:seed (如果需要种子数据)" -ForegroundColor Gray
Write-Host "2. npm run dev (启动开发服务器)" -ForegroundColor Gray
