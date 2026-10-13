# Aidean

> AI 模型与工具的「天梯图」评测平台——让开发者和企业"扫一眼"完成模型选型。

## 这是什么

Aidean 主平台（代号 AigcLadderDiagram）是一个 Next.js 全栈 Web 应用，提供：

- **三类天梯图**：大模型 / Agent / API 站
- **多维排序与筛选**：专业版/应用版、表格/柱状图双视图、自定义排序公式
- **模型详情、对比测评、资源聚合、余额制付费**

技术主栈：Next.js（App Router）+ TypeScript + Tailwind + Prisma + PostgreSQL + Redis，Docker 部署。

## 文档

所有开发文档位于 **[`docs/`](./docs/README.md)**（唯一真源），包含需求、功能设计、目录结构蓝图、环境搭建、数据库、API、测试、界面交互、术语表与架构决策记录（ADR）。

- 文档索引：[`docs/README.md`](./docs/README.md)
- **重新设计后的项目结构蓝图**：[`docs/governance/目录结构文档.md`](./docs/目录结构文档.md)
- 开发环境搭建：[`docs/engineering/开发环境搭建.md`](./docs/开发环境搭建.md)

## 当前状态

- 历史半成品保留在 `.example/history/`（参考底稿，不动）。
- 本轮已完成**项目结构设计与文档体系建设，并按《目录结构文档》蓝图完成代码迁移**。

## 快速开始

```bash
pnpm install
cp .env.example .env.local
pnpm prisma generate && pnpm prisma db push
pnpm dev          # http://localhost:3000
```

> 详细步骤见 [`docs/engineering/开发环境搭建.md`](./docs/开发环境搭建.md)。
