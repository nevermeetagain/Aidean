$ErrorActionPreference = 'Stop'
# =============================================================================
# check-gates.ps1  ——  SubTask A.3.1 本地质量门禁脚本
#
# 用法:    pnpm gates    （根 package.json scripts.gates 映射到本脚本）
# 编码:    UTF-8 with BOM（保证 Windows PowerShell 5.1 正确解析中文注释）
#
# 设计约束:
#   1) 六个检查各自独立，任何异常都被捕获并输出 ERROR 行，脚本永不中断；
#   2) 骨架阶段（Phase 0 未完成）允许部分 FAIL —— 例如 build/typecheck 尚不可过，
#      此时脚本给出的是"体检报告"而非阻断信号；
#   3) G-2 硬门禁在 Phase 0 完成后启用：届时 CI 将对本脚本的非零退出码直接阻断 PR。
#
# PS5.1 相关陷阱备忘:
#   a) EAP=Stop 时外部命令经 2>&1 收集的首条 stderr(如 turbo banner)会升级为
#      终止性异常 —— 所有捕获输出的调用须局部降级 ErrorActionPreference 再恢复；
#   b) Get-Content 对无 BOM 文件默认按 ANSI(GBK) 解码，UTF-8 中文注释会破坏行结构
#      (实测 18 行被吞成 16 行导致 DATABASE_URL 匹配失败) —— 必须显式 -Encoding UTF8。
# =============================================================================

$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$results = New-Object 'System.Collections.Generic.List[object]'
$script:BarrelTolerance = 3   # barrel-check 容忍值：阶段早期应为 0 或极少

function Add-Result {
    param([string]$Name, [ValidateSet('PASS','FAIL','ERROR','SKIP')][string]$Status, [string]$Detail)
    $color = switch ($Status) {
        'PASS'  { 'Green' }
        'FAIL'  { 'Red' }
        'ERROR' { 'Yellow' }
        default { 'DarkGray' }
    }
    Write-Host ("[{0,-5}] {1} : {2}" -f $Status, $Name, $Detail) -ForegroundColor $color
    [void]$results.Add([pscustomobject]@{ check = $Name; status = $Status; detail = $Detail })
}

function Test-GateDeps {
    # a) 双层 node_modules 必须同时存在（pnpm workspace 特性：根级虚拟 store + 包级链接）
    try {
        $rootNm = Test-Path (Join-Path $Root 'node_modules')
        $webNm  = Test-Path (Join-Path $Root 'apps\web\node_modules')
        if ($rootNm -and $webNm) {
            Add-Result 'deps-check' 'PASS' ("root=" + $rootNm + ", apps/web=" + $webNm)
        } else {
            Add-Result 'deps-check' 'FAIL' ("root=" + $rootNm + ", apps/web=" + $webNm + " -> 先执行 pnpm install")
        }
    } catch {
        Add-Result 'deps-check' 'ERROR' $_.Exception.Message
    }
}

function Test-GateBuild {
    # b) pnpm build --dry=json 必须成功解析为 JSON 且内容含 "web"
    try {
        $prevEap = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
        try { $raw = & pnpm build --dry=json 2>&1 } finally { $ErrorActionPreference = $prevEap }
        if ($LASTEXITCODE -ne 0) {
            Add-Result 'build-check' 'FAIL' ("pnpm build --dry=json 退出码 " + $LASTEXITCODE)
            return
        }
        $lines = @($raw) | ForEach-Object { "$_" }
        # turbo/pnpm 的 banner 混入时，从第一个 '{' 行开始截取 JSON 体
        $startIdx = $null
        for ($i = 0; $i -lt $lines.Count; $i++) {
            if ($lines[$i] -match '^\s*\{') { $startIdx = $i; break }
        }
        if ($null -eq $startIdx) {
            Add-Result 'build-check' 'FAIL' ('输出中未找到 JSON 起始符: ' + (($lines | Select-Object -First 5) -join ' | '))
            return
        }
        $jsonText = ($lines[$startIdx..($lines.Count - 1)] -join "`n")
        try {
            $parsed = $jsonText | ConvertFrom-Json
        } catch {
            Add-Result 'build-check' 'FAIL' ('JSON 解析失败: ' + $_.Exception.Message)
            return
        }
        $taskHit = @($parsed.tasks | Where-Object { "$($_.taskId)" -like 'web#*' }).Count -gt 0
        if ($taskHit -or $jsonText -match '"web') {
            Add-Result 'build-check' 'PASS' ("dry-run JSON 解析成功, tasks=" + @($parsed.tasks).Count + ", web 任务在图内")
        } else {
            Add-Result 'build-check' 'FAIL' 'JSON 解析成功但内容不含 web'
        }
    } catch {
        Add-Result 'build-check' 'ERROR' $_.Exception.Message
    }
}

function Test-GateTsc {
    # c) tsc --version 版本可取即可；tsconfig.json 存在时追加 --noEmit 全量 typecheck
    try {
        $prevEap = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
        try {
            $verOut = & pnpm --filter web exec tsc --version 2>&1
        } finally { $ErrorActionPreference = $prevEap }
        $ver = ("$(@($verOut) -join ' ')").Trim()
        if ($LASTEXITCODE -ne 0 -or $ver -notmatch '[0-9]+\.[0-9]+') {
            Add-Result 'tsc-check' 'FAIL' ('无法取得 tsc 版本, exit=' + $LASTEXITCODE + ', out=' + $ver)
            return
        }
        $tsconfig = Join-Path $Root 'apps\web\tsconfig.json'
        if (-not (Test-Path $tsconfig)) {
            Add-Result 'tsc-check' 'SKIP' ("tsc " + $ver + "; tsconfig.json 不存在, 跳过 --noEmit")
            return
        }
        # 带 240s 超时的全量 typecheck（骨架期可能大量类型错误，属预期可恢复失败）
        $sw = [System.Diagnostics.Stopwatch]::StartNew()
        $job = Start-Job -ScriptBlock {
            param($r)
            Set-Location $r
            & pnpm --filter web exec tsc --noEmit 2>&1
            Write-Output ("__EXITCODE__=" + $LASTEXITCODE)
        } -ArgumentList $Root
        if (Wait-Job $job -Timeout 240) {
            $out = @(Receive-Job $job)
            Remove-Job $job -Force
            $sw.Stop()
            $exitLine = ($out | Where-Object { "$_" -match '^__EXITCODE__=' } | Select-Object -Last 1)
            $code = if ($exitLine) { [int]("$exitLine" -replace '^__EXITCODE__=', '') } else { 1 }
            if ($code -eq 0) {
                Add-Result 'tsc-check' 'PASS' ("tsc " + $ver + "; typecheck 0 errors (" + [int]$sw.Elapsed.TotalSeconds + "s)")
            } else {
                $errs = @($out | Where-Object { "$_" -match ': error TS' })
                $head = ($errs | Select-Object -First 3) -join ' | '
                Add-Result 'tsc-check' 'FAIL' ("tsc " + $ver + "; typecheck errors=" + $errs.Count + " (" + [int]$sw.Elapsed.TotalSeconds + "s): " + $head)
            }
        } else {
            # D11 修复：Stop-Job 不杀子进程，需显式清理 pnpm/tsc node 进程
            Stop-Job $job; Remove-Job $job -Force
            try {
                # 终止由本 job 派生的残留 node/tsc 进程（仅匹配命令行含 tsc 的）
                Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
                    Where-Object { $_.CommandLine -match 'tsc' -and $_.CommandLine -match 'Aidean' } |
                    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
            } catch {}
            Add-Result 'tsc-check' 'ERROR' 'typecheck --noEmit 超时(240s), Job 及子进程已终止'
        }
    } catch {
        Add-Result 'tsc-check' 'ERROR' $_.Exception.Message
    }
}

function Test-GatePrisma {
    # d) 找得到非空 DATABASE_URL 才执行 prisma validate，否则 FAIL 提示设置
    # D11/#44 修复：解析出 DATABASE_URL 后显式注入子进程 env，确保 prisma CLI 能读到
    try {
        $candidates = @('apps\web\.env', 'apps\web\.env.local', 'apps\web\prisma\.env')
        $found = $false; $whereFound = ''; $dbUrl = ''
        foreach ($rel in $candidates) {
            $p = Join-Path $Root $rel
            if (-not (Test-Path -LiteralPath $p)) { continue }
            # 显式 UTF8 读取：该文件可能含中文注释且无 BOM，ANSI 默认解码会吞行导致匹配失败
            $line = @(Get-Content -LiteralPath $p -Encoding UTF8) |
                Where-Object { "$_".Trim() -match '^DATABASE_URL\s*=' } |
                Select-Object -First 1
            if ($line) {
                $val = ("$line" -replace '^DATABASE_URL\s*=\s*', '').Trim().Trim('"').Trim("'").Trim()
                if ($val) { $found = $true; $whereFound = $rel; $dbUrl = $val; break }
            }
        }
        if (-not $found) {
            Add-Result 'prisma-check' 'FAIL' '未找到有效 DATABASE_URL（请在 apps/web/.env 中设置后再跑本门禁）'
            return
        }
        # #44 修复：将 DATABASE_URL 注入当前进程环境变量，使 prisma validate 子进程能继承读取
        $env:DATABASE_URL = $dbUrl
        $prevEap = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
        try {
            $pv = & pnpm --filter web exec prisma validate 2>&1
        } finally { $ErrorActionPreference = $prevEap }
        if ($LASTEXITCODE -eq 0) {
            Add-Result 'prisma-check' 'PASS' ("schema 有效 (DATABASE_URL from " + $whereFound + ")")
        } else {
            $msg = (@($pv) | ForEach-Object { "$_" }) -join ' '
            if ($msg.Length -gt 200) { $msg = $msg.Substring(0, 200) + '...' }
            Add-Result 'prisma-check' 'FAIL' ("prisma validate 失败: " + $msg)
        }
    } catch {
        Add-Result 'prisma-check' 'ERROR' $_.Exception.Message
    }
}

function Test-GateBarrel {
    # e) app/lib 目录下 index.ts barrel 文件数量不得超过容忍值，并列出清单
    try {
        $targets = @()
        foreach ($rel in @('apps\web\app', 'apps\web\lib')) {
            $p = Join-Path $Root $rel
            if (Test-Path $p) { $targets += $p }
        }
        # 注意：必须用 -Filter（provider 层过滤）；-Include 搭配非通配路径会被
        # PowerShell 静默忽略，导致 -Recurse 把所有文件都误计为 barrel
        $files = @()
        if ($targets.Count -gt 0) {
            $files = @(Get-ChildItem -Path $targets -Recurse -File -Filter 'index.ts' -ErrorAction SilentlyContinue |
                Where-Object { $_.FullName -notmatch '\\node_modules\\' })
        }
        if ($files.Count -le $script:BarrelTolerance) {
            Add-Result 'barrel-check' 'PASS' ("index.ts 数量 " + $files.Count + " <= 容忍值 " + $script:BarrelTolerance)
        } else {
            Add-Result 'barrel-check' 'FAIL' ("index.ts 数量 " + $files.Count + " > 容忍值 " + $script:BarrelTolerance)
        }
        if ($files.Count -gt 0) {
            foreach ($f in $files) {
                Write-Host ("    barrel -> " + $f.FullName.Substring($Root.Length + 1)) -ForegroundColor DarkCyan
            }
        } else {
            Write-Host "    barrel -> (none)" -ForegroundColor DarkCyan
        }
    } catch {
        Add-Result 'barrel-check' 'ERROR' $_.Exception.Message
    }
}

function Test-GateStore {
    # f) pnpm store status：store 条目被外部（杀软/强杀/磁盘异常）修改时非零退出。
    # next@15 空壳（dist 整树缺失）事故的前置阻断——见台账 §7.27/§7.28
    try {
        $prevEap = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
        try { $storeOut = & pnpm store status 2>&1 } finally { $ErrorActionPreference = $prevEap }
        if ($LASTEXITCODE -eq 0) {
            Add-Result 'store-check' 'PASS' 'pnpm store status: untouched'
        } else {
            $tail = ("$(@($storeOut) | ForEach-Object { "$_" })".Trim())
            if ($tail.Length -gt 160) { $tail = $tail.Substring(0, 160) + '...' }
            Add-Result 'store-check' 'FAIL' ("store 条目异常 -> pnpm install --force --no-frozen-lockfile; " + $tail)
        }
    } catch {
        Add-Result 'store-check' 'ERROR' $_.Exception.Message
    }
}

function Test-GateButton {
    # g) 按钮反模式守卫（N6 悬停可读性）：variant=ghost/outline 叠加「实色深底(bg-primary/foreground/accent)
    #    + 浅字(text-white/background/primary-foreground/slate-50..300)」会在 :hover 经 hover:bg-[var(--muted)]
    #    逃逸 twMerge 而翻近白底，致浅字不可见；应改用 variant=primary / dark。正则已排除 bg-primary/5 半透明
    #    与 text-slate-500 等中灰合法用法，避免误报。
    try {
        $dir = Join-Path $Root 'apps\web\components'
        if (-not (Test-Path $dir)) { Add-Result 'button-antipattern' 'SKIP' 'components 目录不存在'; return }
        $pattern = 'variant="(ghost|outline)"[\s\S]{0,220}?bg-(primary|foreground|accent)(?![\w/-])[\s\S]{0,120}?text-(white|background|primary-foreground|slate-[123]00|slate-50)\b'
        $rx = [regex]::new($pattern)
        $files = @(Get-ChildItem -Path $dir -Recurse -File -Filter '*.tsx' -ErrorAction SilentlyContinue |
            Where-Object { $_.FullName -notmatch '\\node_modules\\' })
        $hits = @()
        foreach ($f in $files) {
            $text = [System.IO.File]::ReadAllText($f.FullName)
            foreach ($m in $rx.Matches($text)) {
                $line = ($text.Substring(0, $m.Index) -split "`n").Count
                $hits += ($f.FullName.Substring($Root.Length + 1) + ':' + $line)
            }
        }
        if ($hits.Count -eq 0) {
            Add-Result 'button-antipattern' 'PASS' ('ghost/outline + 实色深底覆盖 反模式 0 命中 (' + $files.Count + ' tsx)')
        } else {
            Add-Result 'button-antipattern' 'FAIL' ('发现 ' + $hits.Count + ' 处：' + (($hits | Select-Object -First 10) -join ' | ') + ' -> 改用 variant=primary/dark')
        }
    } catch {
        Add-Result 'button-antipattern' 'ERROR' $_.Exception.Message
    }
}

# ---------- 主流程 ----------
Write-Host ''
Write-Host ('== Aidean Gates (' + $Root + ') ==') -ForegroundColor Cyan
Test-GateDeps
Test-GateBuild
Test-GateTsc
Test-GatePrisma
Test-GateBarrel
Test-GateButton
Test-GateStore

Write-Host ''
Write-Host '== Gate Summary ==' -ForegroundColor Cyan
$results | Format-Table check, status, detail -AutoSize | Out-String -Width 220 | Write-Host

$failCount = @($results | Where-Object { $_.status -eq 'FAIL' -or $_.status -eq 'ERROR' }).Count
$passCount = @($results | Where-Object { $_.status -eq 'PASS' }).Count
Write-Host ("Total: " + $results.Count + " | PASS: " + $passCount + " | FAIL/ERROR: " + $failCount) -ForegroundColor $(if ($failCount -gt 0) { 'Red' } else { 'Green' })

if ($failCount -gt 0) { exit 1 } else { exit 0 }

# =============================================================================
# 备注（G-2 门禁启用）:
#   G-2 硬门禁 CI 已于 2026-08-28 实装：.github/workflows/ci.yml
#   （铁律1 文档检查 → prisma generate → 双包 tsc --noEmit → 双包单测 → next build）。
#   本脚本保留为本地体检工具（pnpm gates），CI 与其职责互补不重复。
# =============================================================================
