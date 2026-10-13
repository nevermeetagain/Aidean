## 概述
- "Aidean"网站是一个基于Next.js 15的现代化Web应用，平台提供AI模型性能天梯图展示、详细模型信息查看、多模型对比测评和AI行业资讯订阅等核心功能。
- (参考网站界面)[https://www.mydrivers.com/zhuanti/tianti/cpu/index.html]


## 功能
1. 模型天梯图:排名算法
2. 对比评测
3. 信息同步：新建任务爬取/订阅AI资讯


## 技术架构

### 技术栈参考
- 前端框架 ：（Next.js 或 Vite） + React + TypeScript
- 后端 ：Next.js (App Router) + Node.js + TypeScript
- UI组件库 ：Shadcn/ui + Tailwind CSS
- 数据库 ：PostgreSQL（核心数据）+ Redis（缓存）
- ORM ：Prisma
- 认证 ：NextAuth.js 或 （JWT + bcryptjs）。必须支持微信登录
- 支付 ：微信支付
- 爬虫 ：Playwright + Cheerio（Next.js API Routes + 定时任务）
- 定时任务 ：node-cron
- 部署 ：Vercel（前端）+ Docker（后端服务）

### 架构原则
1. 天梯图、模型列表等高频数据用Redis缓存
2. 爬虫、评测任务用队列异步执行


-----


在回答之前：你需要读取全局和项目内的技能列表，执行和思考过程中可以自由使用多种合适的技能和MCP服务，并展示使用过程。


## 本次需求
1. 移除"discord"链接图标；
2. 移除"github"链接图标；
3. 隐藏"帮助文档"链接图标


## 基础信息
1. 本机在win10上进行代码开发，本机没有开发环境.
2. 当全部完成后，将在"Ubuntu 24.04"云服务器上使用docker部署.
3. 启动命令是"cd ragflow/docker && chmod +x ./entrypoint.sh && docker compose -f docker-compose.yml up -d".


## 铁律
1. 复述原需求。
2. 阅读` ./AGENTS.md `，分析用户需求，根据本项目结构进行拆解。
3. 根据分析结果，找到该需求涉及的所有文件，从"前端"、"后端"、"资源"3个方面，依次输出文件说明
4. 学习项目内前后端代码规范和实现逻辑，特别是相似功能场景的应用，必须重点参考。
5. 多角度全面考虑。从` ./基础问答1.md `、` ./基础问答2.md `、` ./分析报告1.md `、` ./分析报告2.md `获取参考思路
6. 整合思路，必须使用"plan mode"/"task todos"模式建立详细的流程化预执行方案。严格遵守《## 输出规范》。
7. 等待用户输入"同意"后，才能执行。
8. 执行完毕后，进行逻辑验证，是否和预期方案一致。
9. 始终使用中文对话,始终不要在项目内创建任何说明文档。


## 输出规范
适用于"相似功能场景分析"，"异常原因分析"，"预执行方案"等等

1. 使用markdown标准格式输出多层级
2. 层级一：作用
3. 层级二：目录/文件（相对路径）
4. 层级三：作用（类/方法/属性/值）
示例：
```
# 项目内基础配置文件
  ## ./docker.env
    ### HF_HUB_ENABLE_HF_TRANSFER=1（并发下载优化开关）
```

-----

帮我在当前系统(win11)上，为4个IDE安装全局Skill。

使用 "plan mode"/"task todos"模型 逐一完成。


## 指定流程
1. 搜索各IDE官方文档，确定全局Skills安装位置。没有目录则递归创建Skills目录。
2. 使用技能"skill find"确定并刚找到准确的技能。
3. 检查该技能是否存在于本地环境，没有则使用" npx add-skill "方式安装。
4. 检查各IDE是否拥有该技能，没有的IDE则添加。
5. 安装后的技能使用link连接各IDE。
6. 检查各IDE技能是否安装成功，检查各IDE所有技能是否需要更新


## IDE
1. trae
2. opencode
3. claudecode
4. windsurf


## 待安装技能
frontend-design
ui-ux-pro-max UI/UX
PUA
Ralph Loop
Planning with Files
Claude-mem
Superpowers
Web Access
Code Review
Code Simplifier

-----

可以。安装mem-search。按爪给你成功后执行下面任务

查查有没有基于"三省六部制"的开发流工具技能，Team Agnet。最好能在IDE中使用"/meet"手动触发。

## 参考
https://mp.weixin.qq.com/s/iBCNkORwkff3PL1EZD3zqw
https://mp.weixin.qq.com/s/f80LKQH8pGE1HnacOrm-ew
https://github.com/cft0808/edict

## IDE
1. trae
2. opencode
3. claudecode
4. windsurf
-----

帮我重新设计项目规则` AGENTS.md `。

我希望以简单高效的方式，定义项目规则。
1. 要求IDE在某个场景下必须使用某些技能
2. 全局都必须使用Superpowers和Planning with Files，Superpowers为主，Planning with Files为辅
3. 例如：设计时必须使用Frontend Desig、UI UX Pro Max，结合使用。
4. 例如：执行效果不如意时，调用PUA技能
5. 其他场景由你自定义。

最终` AGENTS.md `必须简短精炼

