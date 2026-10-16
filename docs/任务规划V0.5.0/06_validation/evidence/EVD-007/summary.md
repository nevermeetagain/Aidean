# EVD-007：TASK-007 守卫脚本 交付完成度分析

> 版本: v0.5 | 更新: 2026-10-15 | 变更: TASK-007（S0 自动化守卫：根污染/密钥/模块边界/端口区间，零新依赖）交付取证；rev2 依子智能体 CodeReview 修复 M-1/M-2/M-3/m-2（见 §9）

- 执行者：外部 Agent ｜ 所有权：Agent-Guard ｜ 档位：sonnect
- 归属切片：S0（步行骨架与契约守卫）｜ 来源需求：§9.4 自动化守卫 / REQ-C-02 端口
- 追溯：REQ-C-005、REQ-C-006、REQ-NF-006、REQ-M-010
- 基线：分支 `huaweicloud` @ HEAD `5ea3cb1b`（TASK-006 之后）

## 1. 目标达成（一句话）

`node scripts/guard/run-all.mjs` 在当前 HEAD 四项守卫全部 exit 0（端口/边界既存项以 WARN 呈现，不阻断），并已接入 CI `verify` job；三张负向测试各自对应守卫 exit 1。

## 2. 交付物

新增（`scripts/guard/**`）：
- `_lib.mjs` —— 共享工具：仓库根定位、git 调用（maxBuffer 128MB 防 `ls-files` 全量 ENOBUFS）、tracked 文件列举、文件读取、二进制启发式、统一 PASS/WARN/FAIL 报告器（WARN 不改退出码）。
- `port-ranges.json` —— 端口区间登记表（唯一真源，无凭据）：aidean 3000–3100 / aideanFleet 3100–3200 / aideanBotHot 3200–3300，全部 `confirmed:true`。
- `root-pollution.mjs` —— 守卫①根目录污染。
- `secret-scan.mjs` —— 守卫②密钥/凭据明文。
- `module-boundary.mjs` —— 守卫③模块边界。
- `port-consistency.mjs` —— 守卫④端口区间一致性。
- `run-all.mjs` —— 聚合器（依序 spawn、透传输出、聚合退出码）。

修改（`.github/workflows/ci.yml`）：`verify` job 在「Docs facts」之后、「Contract tests」之前新增 `Guard rails` 步骤：`run: node scripts/guard/run-all.mjs`；并同步门禁链头注释。

## 3. 验收标准逐条核验

| # | 验收标准（规格原文） | 结论 | 证据 |
|---|---|---|---|
| 1 | 四脚本在当前 HEAD 全部 exit 0（端口项允许 WARN） | ✅ 已确认 | `runall.txt`（runall_exit=0，4/4 PASS）；`syntax.txt`（6 文件 `node --check` 全 0） |
| 2 | 加入根级文件/私钥样本/3500 回调时对应脚本 exit 1 | ✅ 已确认 | `neg-root.txt`（exit1，检出新增根级文件）、`neg-secret.txt`（exit1，检出私钥头+password=，值脱敏）、`neg-port.txt`（exit1，seed 回调 3500 越界） |
| 3 | CI verify job 含 guard 步骤 | ✅ 已确认 | `ci.yml` Guard rails 步骤；`python yaml.safe_load` 校验 jobs=[verify,docker-build,e2e-skeleton]、步骤序含 Guard rails（见 §6） |
| 4 | diff 仅落在「允许修改」范围内 | ✅ 已确认 | `diff-scope.txt`：tracked 修改仅 `ci.yml`；新增仅 `scripts/guard/**`；证据落 `EVD-007/**`。均在允许范围 |

补充回归：两文档门禁在本卡后仍绿 —— `gate-docs-rule.txt`（铁律1，exit 0）、`gate-docs-facts.txt`（数字真源 14 断言全过，exit 0）；本卡未引入 lib/route/spec 计数变动。

## 4. 关键设计取舍与证据链

### 4.1 root-pollution
白名单 = `git ls-files` 根级（无斜杠）文件集合（14 个）；污染 = `git ls-files --others --exclude-standard` 里根级、未被 .gitignore 忽略的文件。负向：新建根级 `zz-negtest-pollution.txt`（`git check-ignore` 退出 1=未被忽略）→ exit 1，验证后删除。

### 4.2 secret-scan
- 扫描 = tracked 文本文件**工作区内容**（CI checkout 后即提交内容）。基线：作用域内扫 661 个源码/配置文件，豁免 26216 个（主体为 `.example/`≈25841 历史底稿 + `docs/` 文档归档；node_modules 未被跟踪，实测 `git ls-files node_modules/*` = 0）。
- 高信号规则（私钥头 / `AKIA[0-9A-Z]{16}` / `\bsk-[A-Za-z0-9]{20,}\b`）命中即泄露；低信号 `password=` **大小写敏感小写**（忠实规格字面，精准命中 DSN/env/配置赋值形态，不误伤 `PASSWORD`/`hashedPassword`/`TEST_PASSWORD` 等代码标识符），再叠加占位值黑名单（example/your/changeme/`${`/process.env/…）与值脱敏输出。
- 作用域豁免：`scripts/guard/`（守卫自身含检测正则字面量）、`.example/`、`参考文档/`、`docs/`、`*.md`/`*.txt`/`*.example`/`*.sample`/`*.lock`/lockfile、测试（`*.spec.*`/`*.test.*`/`__tests__`/`history`）。

### 4.3 module-boundary
- A) `packages/**` 不得引用 `apps/**`：扫 68 源文件，0 违规。
- B) `apps/web/components/**` 不得引用 `@prisma/client` 或 `lib/db`：扫 100 组件文件，`@prisma/client` 0、`lib/db` **1**（`home/ProductSection.tsx` 的 Server Component 直读 DB）。该处为**既存、非本任务引入**的数据访问过渡实现，依 TASK-007「阻塞条件：登记为白名单例外并上报」→ 命中 ALLOWLIST → **WARN 不 FAIL**；新增同类越界仍 FAIL。
- 判定基于 import 说明符抽取（静态 from / require / 动态 import()）。

### 4.4 port-consistency
- (1) Aidean 自身入口端口必须 ∈ aideanSelf[3000,3100]：实测 apps/web dev/start（无显式端口→默认 3000）、e2e/根 playwright baseURL/webServer、Dockerfile `ENV PORT`/`EXPOSE`、auth `AUTH_ISSUER`/`AUTH_ISSUER_CONTAINER` 全部 3000 → 全 PASS。
- (2) seed.ts 回调端口：**仅提取「URL token 含 callback」的 localhost 端口**（排除 `baseUrl:59998`、`mock-upstream:3000` 等非回调端口，避免误判）→ {3200∈aideanFleet∩aideanBotHot, 3000∈aidean}，均落已裁决区间 PASS；`confirmed:false` 区间→WARN；区间外→FAIL（负向 3500 已证）。

## 5. WARN / 例外 / 安全上报（不含任何凭据明文）

1. **模块边界既存例外（WARN）**：`apps/web/components/home/ProductSection.tsx` → `../../lib/db/prisma`。已在 `module-boundary.mjs` ALLOWLIST 登记，建议后续独立任务将取数下沉至 `lib` 层后移除例外。
2. **归档历史令牌（上报）**：`docs/archive/UpdatedHistory.prompts-archive.txt` 含 **4 处** `sk-` 形态令牌（tracked、既存、非本任务引入、归档只读）。secret-scan 依作用域豁免 `docs/` 不阻断本卡；**建议独立安全任务轮换/移除该归档令牌**（本守卫不因此放宽对源码新增泄露的拦截）。
3. **开发种子口令（已复核，非泄露）**：`apps/web/scripts/http-verify-configs.mjs` 内为大写常量形式的本地开发超管口令（与 `seed.ts` 及各 e2e 夹具同源的公开种子值），非小写配置态凭据，故不被 `password=` 规则命中；已复核确认为 dev-only 便利凭据。

## 6. CI 接入与校验

- `python yaml.safe_load` 解析通过；`verify.steps` 顺序含：… Docs facts → **Guard rails** → Contract tests → Prisma generate → Typecheck×2 → Unit×2 → Build。
- guard 步骤零依赖（node 内置 + git），置于安装依赖后、重活（typecheck/build）前，实现快速失败。
- 说明：本机 `gh` CLI 不可用，GitHub Actions 端本 job 的实跑绿灯需在 push 后于 Actions 页观察（与 EVD-006 同一局限）；本地以等价命令 `node scripts/guard/run-all.mjs` + YAML/bash 语法校验替代证明。

## 7. 负向测试方法学（零残留）

四张负向均「临时植入 → 运行捕获（exit 1）→ 立即复原 → 复核工作树」，证据 `neg-root.txt`/`neg-root-committed.txt`/`neg-secret.txt`/`neg-port.txt`：
- 根级·游离型（`neg-root.txt`）：新建未跟踪根文件 `zz-negtest.txt` → root-pollution FAIL（B 类），`DeleteFile` 删除。
- 根级·提交型（`neg-root-committed.txt`，验证 M-2 修复）：对同一探针 `git add` 使其成为 tracked 但不在 `root-allowlist.txt` 基线 → root-pollution FAIL（A 类，证明 CI 干净检出下可拦截提交型污染）→ `git reset` 取消暂存 → `DeleteFile` 删除。
- 密钥（`neg-secret.txt`）：`Add-Content` 追加「私钥头 + `sk-proj-…` + 小写 `password=`」注释行到 `scripts/check-docs-rule.mjs` → secret-scan FAIL（3 命中，值脱敏）→ `git checkout --` 复原。
- 端口（`neg-port.txt`）：`Add-Content` 追加 `localhost:3500/.../callback` 注释行到 `seed.ts` → port-consistency FAIL → `git checkout --` 复原。
复原后 `git diff --name-only` 为空、`git status` 仅余预期未跟踪项（见 `diff-scope.txt`）。

## 8. 完成度结论

- 状态：**已确认（PASS，可进入下一步）**。四条验收标准全部满足并附命令级证据；两文档门禁回归绿。
- 前提：基于 HEAD `5ea3cb1b` 工作区；守卫判定读工作区内容，CI 上等价于检出内容。
- 局限：① Actions 端绿灯待 push 后观察（gh 不可用）；② secret-scan 作用域豁免 `docs/`，文档内新贴密钥不拦截（以归档上报补偿，属工程折中）；③ 端口区间表 `confirmed` 全真源于用户 2026-10-14 口径，子平台区间若 P-1/P-2 再裁决须同步 `port-ranges.json`。
- 风险与后续：ProductSection 例外应择机消除；归档 `sk-` 令牌建议独立安全任务处置。

## 9. 子智能体 CodeReview（rev1）与修复处置

审查范围：ci.yml + scripts/guard 7 文件。结论：验收 1–4 达成，但提出 1 致命潜伏缺陷 + 2 有效性缺口 + 2 Minor。逐条苏格拉底复核：

- **M-1（采纳修复）**：`port-consistency.mjs` `portsFrom` 用 `while(exec)` 但 `apps/web/package.json` 调用传入正则**缺 `g`**，非全局 `exec` 停在 index 0 → 一旦命中即无限循环 push→OOM（当前 dev/start 无显式端口故不触发，属潜伏雷）。修复：根因加固——`portsFrom` 内部强制以带 `g` 副本运行 + 零宽匹配前移 `lastIndex`（对任何调用方稳健）；并补调用处 `/g`。复验：改动后 `node --check` 全 0、run-all 仍 exit 0。
- **M-2（采纳修复）**：root-pollution 原以「当前 ls-files 根级」为白名单，CI 干净检出下新提交的根级文件本身即 tracked→入白名单→必 PASS，对「提交型污染」无效。修复：新增提交态基线 `scripts/guard/root-allowlist.txt`（HEAD 5ea3cb1b 的 14 根级文件快照），改判为「tracked 根级 ⊖ 基线 → FAIL」＋保留「未跟踪游离 → FAIL」＋「基线漂移 → WARN」。新增负向 `neg-root-committed.txt` 实证提交型污染被拦截（exit 1）。
- **M-3（采纳增强）**：`password=` 原大小写敏感，漏 `PASSWORD=`（最常见 env/常量硬编码形态，如 `http-verify-configs.mjs` 的开发口令）。修复：放开为 `/i` 但保留 `(^|[^\w])` 前缀边界（仍排除 `hashedPassword`/`TEST_PASSWORD`/`REDIS_PASSWORD` 等单词字符前导者），并把 seed.ts 公开开发种子口令（`admin123`/`test123`）入占值黑名单以维持 HEAD exit 0。不引入冒号 `password:` 匹配（会刷屏 25+ 测试夹具、破坏验收 1）——此残余记为已知局限。复验：neg-secret 现 3 命中（含 password=/大小写），run-all 仍 exit 0。
- **m-2（采纳）**：`sk-` 规则原不匹配新式 `sk-proj-<base62>`。修复：`/\bsk-(?:proj-)?[A-Za-z0-9]{20,}\b/`（不含裸 `-`/`_` 于字符类，避免 `foo-sk-bar` 误伤）。neg-secret 已实证 `sk-proj-…` 命中。
- **m-1（文档处置，不改码）**：`port-ranges.json` 当前区间全 `confirmed:true`，故「未裁决→WARN」分支不可达；且 3100/3200/3300 为相邻区间包含式边界重叠（seed 的 3200 归类 aideanFleet 而非 aideanBotHot，二者皆 confirmed，退出码不受影响）。判定：区间口径系用户 2026-10-14 明示的包含式定义，不虚设 `confirmed:false` 占位；WARN 分支保留为面向未来（新平台未裁决时启用）的防御代码。此局限已记于 §8。

修复后全量复验：`node --check` 6 文件 0；`run-all` exit 0（root-pollution「14 tracked∈14 基线」、secret-scan 0 命中、module-boundary 1 WARN、port-consistency 全 PASS）；四张负向各 exit 1；两文档门禁仍 exit 0。复审结论：**可判 PASS**。
