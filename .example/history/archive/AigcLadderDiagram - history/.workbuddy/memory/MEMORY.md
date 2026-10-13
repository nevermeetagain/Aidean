# 项目长期记忆

## 项目概述
- 项目名称：AI模型天梯图平台 (AigcLadderDiagram)
- 核心功能：AI模型性能天梯图、付费测评、扩展天梯图（Skill/MCP/Agent/API站）
- 技术栈：Next.js 14 全栈（Option B）+ PostgreSQL + Prisma + Redis + Docker

## 关键技术决策
- 2026-03-25：确认 Option B（纯 Next.js 14 全栈方案），废弃前后端分离（Vite+React + Next.js API）
- Server/Client Component 边界规则：Server Component 负责数据库查询和SEO，Client Component 负责交互和图表
- MCP 数据采集：不使用爬虫，使用定时执行脚本（管理员配置参数/周期/触发时间）

## 导航结构最终定稿
- 一级导航：首页、模型、资源、产品、**关于、文档**
- 模型：天梯图、测评、对比
- 资源：资讯、Agent、MCP、Skills
- 产品：知识库（Aidean）、解决方案、业务咨询
- 关于：**仅**合作、招聘（帮助/价格已移入"文档"模块）
- 文档（独立一级导航）：帮助、价格、API

## 2026-03-27 审查与修复
- 共发现 45 个问题（P0:12 / P1:19 / P2:14）
- 核心问题：文档同步滞后（功能设计文档迭代了3个大版本，但需求/交互/目录文档未同步）
- **已修复**：全部 P0（5项）+ 全部 P1（4项）= 9项
- **未修复**：P2（3项，可延后）：my_write.md 废弃标注、MVP 定义、错误页面设计
- 修复摘要：technical_architecture.md 标注过时、task_plan.md 清理旧架构、需求文档 v1.1（+4章）、界面交互文档 v1.1（重构§五+新增§九§十）、功能设计文档修复章节编号+Benchmark relation、目录结构文档 v1.2（+ladder/user/api/components/hooks/constants）
- 详细报告见 2026-03-27 daily log

## 2026-03-27 目录结构 v2.0 升级
- 目录结构文档从 v1.2（~310行）升级到 v2.0（~750+行）
- 核心变更：补充 .env 配置体系（5文件+完整变量清单）、细化 docker/（app/nginx/postgres/redis/ragflow）、深化 src/ 所有二级目录到文件级、新增 validations/errors/middleware 目录、补充 Next.js 错误页面/SEO 文件、补充 CI/CD/logs/test 详细结构
- Docker 镜像使用国内源：pip→清华源、HuggingFace→hf-mirror.com

## 2026-03-30 项目诊断审查
- 完成项目全文档深度诊断报告，发现14个问题（P0:3 / P1:5 / P2:6）
- P0核心问题：无MVP定义、商业模式缺失（定价/变现空白）、导航结构文档矛盾
- P1核心问题：过度设计风险（一人做了10人规划）、无SEO/增长策略、冷启动数据方案缺失、竞品分析不足
- 核心结论：技术设计90分，商业设计30分；建议立即缩小范围定义MVP、补充商业模式

## 2026-03-30 诊断修复（第二批次）
- 修复导航结构文档矛盾：界面交互文档 v1.2 将「文档」错误降为资源二级导航，已修复为独立一级导航
  - 影响文件：界面交互文档 v1.3、需求文档 v1.3、目录结构文档 v2.4
  - 具体修改：导航栏布局图、一级导航明细表、资源下拉菜单（移除文档子菜单）、新增文档下拉菜单、页面列表路由说明、验收标准、目录结构 docs/ 注释
- my_write.md 标注为废弃文档（P2遗留修复）
- 全部 P0+P2 遗留问题已修复，剩余 P1（竞品分析/SEO/冷启动）为策略性工作非文档修复

## 2026-03-30 AI/AIGC发展趋势分析
- 完成AI/AIGC发展趋势与一人公司方向深度分析报告（~600行）
- 核心数据：全球AI支出$2.52万亿(Gartner 2026)、中国AIGC核心产业超1.2万亿、MCP SDK月下载9700万
- TOP3方向推荐：①AI Agent定制 ②MCP/Skills工具开发 ③垂直AI SaaS
- OPC（一人公司）2026年成为创业新范式，央视等央媒密集报道
- 天梯图项目与推荐方向天然协同，建议"平台+服务"双轮驱动

## 2026-04-01 AI IDE 配置路径数据库 v2.0
- 完成 22 个 AI IDE 工具的配置路径统一汇总（JSON + MD 双格式）
- 数据来源：BaseRule/ 下 3 个独立数据源（workbuddy/opencode/trae）交叉核实
- 基准数据 workbuddy（18 IDEs 本机实测）+ opencode 独有条目（qoder/openclaw/monkeyCode/crush）+4
- 10 项字段差异修正（skills_protocol/ide_style/mcp_transport 按官方文档核实）
- 汇总文件：`.example/ai-ide-config-paths.json` + `.example/ai-ide-config-paths.md`
- 原始数据已转移到 `.example/BaseRule/`（opencode/trae/workbuddy 三个子目录）
- 关键发现：
  - Claude Code 最新版 2.1.89（npm），本机实测 2.1.85
  - Cursor Skills 强制 copy 模式（不支持 symlink）
  - Trae 国际版/国内版配置目录不同（.trae vs .trae-cn）
  - GitHub Copilot CLI vs IDE 插件配置完全独立
  - Warp 终端不支持 Windows
  - Antigravity 复用 Gemini CLI 的 .gemini 目录

## 2026-04-03 文档全面修正（8条统一指令）
- 表格结构：统一为矩阵式（行=评分/排序维度，列=厂商，单元格=模型名），对齐 Demo3/4 实现
- 点击行为：点击模型名跳转详情，与排序规则无关
- 右侧面板：从"右侧固定面板(r:0)"重构为"右下角悬浮Dock(r:24 b:24 z:50)"，默认缩起，后端系统配置开关
- 导航栏：确认6项一级导航（首页/模型/资源/产品/文档/关于）
- OpenCode MCP路径：config.json 和 opencode.json 均可配置，桌面端文档已修正为 opencode.json
- Banner按钮：保留「开始对比」居右侧（13px ghost），移除「收藏夹」
- 统计卡片：后端可配置，不含"数据更新/数据周期"
- 版本号：界面交互文档→v1.4，首页设计→v1.1，需求文档→v1.4，目录结构→v2.4
- 完成全面文档审查（8份文档），发现2个P0（导航结构未同步、task_plan重复行）、5个P1
- 输出 `.docs/首页界面设计.txt` v1.0，约600行，包含：
  - 美学方向："数据编辑室"（Bloomberg Terminal × 数据新闻可视化）
  - 7大模块：导航栏(H) + Banner(B) + 天梯图核心(C) + 数据快报(D) + 生态入口(E) + 页脚(F) + 全局浮层(G)
  - 新增模块（对比临时辅助设计）：平台统计卡片(B2)、数据快报区(D)、生态入口区(E)
  - 完整色彩/排版/动效/响应式/SEO 规范
  - 文件清单：20+ 前端组件 + 4 后端API + 6 资源文件
- 待确认：首页TOP20数量、数据快报区保留、Banner快速操作按钮位置
- **2026-03-27 确认**：首页天梯图展示前200+无限滚动加载；Banner快速操作按钮已移除；数据快报区标注为可选待确认
- **2026-04-03 文档统一**：三项全局规则——①默认浅色背景（light为默认主题）②品牌/项目名为Aidean ③搜索框仅存在于顶部导航栏（筛选栏不含搜索框）。影响文档：界面交互v1.5、需求v1.5、首页设计v1.2、功能设计、目录结构v2.5
