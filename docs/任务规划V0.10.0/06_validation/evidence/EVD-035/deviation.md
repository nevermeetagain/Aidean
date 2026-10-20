EVD-035 偏离说明（交接任务书 §3.2：卡面未列但确需改的文件在此登记）

1. scripts/check-docs-facts.mjs（仅 spec-count 一处期望与 desc）
   - 性质：计数期望同步，非业务代码改动。
   - 依据：交接任务书 §3.3「新增 route/page/spec/@aidean/ui 引用时同步 check-docs-facts 期望值」；
     执行裁决 E10-03（非条件代码卡允许同步计数期望值并把 facts exit 0 写入验收）。
   - 内容：spec 文件总数 184→185（本卡新增 e2e/web/search.spec.ts）；desc 登记归因链
     （TASK-035 184→185；前次 TASK-063 183→184）。执行期间该断言被并行线 TASK-063 先改到 184，
     本卡按两卡叠加后的真实总数 185 落定，归因链在 desc 中可追溯。

2. .git/info/exclude（本地仓库配置，不入提交）
   - 性质：本地环境适配。OpenClaw 会话向工作树根注入 HEARTBEAT/IDENTITY/SOUL/TOOLS/USER.md 五个
     运行时文件，触发守卫① root-pollution「游离根级文件」FAIL；EVD-032 时点 guard 4/4 是因当时
     会话尚未注入。
   - 依据：root-pollution.mjs 文件头注释——游离型污染的正解即「未跟踪且被 .gitignore 忽略」；
     且该五文件非项目产物，不应进入仓库历史（改 .gitignore 反而会扩大提交范围）。
   - 影响面：仅本机根目录清洁判定，CI 与其他协作者不受影响。

3. 未纳入本卡提交的并行线文件（归属澄清，避免误判范围外溢）
   - docs/product/design/功能设计文档.md（M）、docs/任务规划V0.5.0/README.md（M，先前会话遗留）、
     apps/web/app/(admin)/admin/monitoring/、apps/web/components/admin/monitoring/、
     docs/.../evidence/EVD-064/、EVD-087/（??）——均属 Hark 核心线或此前会话，本卡不碰。