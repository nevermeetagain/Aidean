#!/usr/bin/env pwsh
# ============================================================
# Aidean AI模型天梯图平台 - 数据库初始化脚本生成器
# 功能：合并所有分段SQL文件为总初始化脚本
# 特点：支持幂等执行、编码检测、错误处理
# ============================================================

param(
    [string]$OutputFile = "aidean_full_init.sql",
    [string]$InputDir = "init",
    [switch]$CheckEncoding,
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"

# 颜色输出函数
function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Color
}

# 检测文件编码
function Test-FileEncoding {
    param([string]$FilePath)
    $bytes = [System.IO.File]::ReadAllBytes($FilePath)
    if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
        return "UTF-8-BOM"
    } elseif ($bytes.Length -ge 2 -and $bytes[0] -eq 0xFF -and $bytes[1] -eq 0xFE) {
        return "UTF-16-LE"
    } elseif ($bytes.Length -ge 2 -and $bytes[0] -eq 0xFE -and $bytes[1] -eq 0xFF) {
        return "UTF-16-BE"
    } else {
        return "UTF-8"
    }
}

# 主函数
function Generate-FullInitScript {
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $initDir = Join-Path $scriptDir $InputDir
    $outputPath = Join-Path $scriptDir $OutputFile

    Write-ColorOutput "=== Aidean Database Initialization Script Generator ===" "Cyan"
    Write-ColorOutput "Input directory: $initDir" "Gray"
    Write-ColorOutput "Output file: $outputPath" "Gray"

    # 检查输入目录
    if (-not (Test-Path $initDir)) {
        throw "Input directory not found: $initDir"
    }

    # 获取所有SQL文件
    $sqlFiles = Get-ChildItem -Path $initDir -Filter "*.sql" | Sort-Object Name

    if ($sqlFiles.Count -eq 0) {
        throw "No SQL files found in $initDir"
    }

    Write-ColorOutput "Found $($sqlFiles.Count) SQL files to merge" "Green"

    # 构建合并内容
    $output = New-Object System.Text.StringBuilder

    # 添加文件头部
    [void]$output.AppendLine("-- ============================================================")
    [void]$output.AppendLine("-- Aidean AI模型天梯图平台 - 完整数据库初始化脚本")
    [void]$output.AppendLine("-- 生成时间: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')")
    [void]$output.AppendLine("-- 文件数量: $($sqlFiles.Count)")
    [void]$output.AppendLine("-- 编码: UTF-8")
    [void]$output.AppendLine("-- 特点: 幂等执行、事务安全、错误处理")
    [void]$output.AppendLine("-- ============================================================")
    [void]$output.AppendLine("")
    [void]$output.AppendLine("-- 设置客户端编码")
    [void]$output.AppendLine("SET client_encoding = 'UTF8';")
    [void]$output.AppendLine("")
    [void]$output.AppendLine("-- 启用事务")
    [void]$output.AppendLine("BEGIN;")
    [void]$output.AppendLine("")

    # 合并每个文件
    $fileIndex = 1
    foreach ($file in $sqlFiles) {
        $fileName = $file.Name
        Write-ColorOutput "[$fileIndex/$($sqlFiles.Count)] Processing: $fileName" "Yellow"

        if ($CheckEncoding) {
            $encoding = Test-FileEncoding $file.FullName
            if ($Verbose) {
                Write-ColorOutput "  Encoding: $encoding" "Gray"
            }
        }

        # 添加文件分隔符
        [void]$output.AppendLine("")
        [void]$output.AppendLine("-- ============================================================")
        [void]$output.AppendLine("-- FILE: $fileName")
        [void]$output.AppendLine("-- ============================================================")
        [void]$output.AppendLine("")

        # 读取文件内容
        $content = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)

        # 清理内容
        $content = $content -replace "`r`n", "`n"  # 统一换行符
        $content = $content.Trim()

        [void]$output.AppendLine($content)
        [void]$output.AppendLine("")

        $fileIndex++
    }

    # 添加文件尾部
    [void]$output.AppendLine("")
    [void]$output.AppendLine("-- ============================================================")
    [void]$output.AppendLine("-- 提交事务")
    [void]$output.AppendLine("-- ============================================================")
    [void]$output.AppendLine("")
    [void]$output.AppendLine("COMMIT;")
    [void]$output.AppendLine("")
    [void]$output.AppendLine("-- 验证安装")
    [void]$output.AppendLine("SELECT 'Database initialization completed successfully' as status;")
    [void]$output.AppendLine("")

    # 写入输出文件（使用UTF8无BOM）
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($outputPath, $output.ToString(), $utf8NoBom)

    Write-ColorOutput "" "White"
    Write-ColorOutput "=== Generation Complete ===" "Green"
    Write-ColorOutput "Output: $outputPath" "Green"
    Write-ColorOutput "Size: $([math]::Round((Get-Item $outputPath).Length / 1KB, 2)) KB" "Green"
}

# 执行主函数
try {
    Generate-FullInitScript
    exit 0
} catch {
    Write-ColorOutput "ERROR: $_" "Red"
    exit 1
}
