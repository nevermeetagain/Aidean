在回答之前：你需要读取全局和项目内的技能列表，执行和思考过程中可以自由使用多种合适的技能和MCP服务，并展示使用过程。

## 规则
1. ` .docs/ `是文档目录，所有文档都必须存储在这个目录下。
2. ` .docs/ `内必须包含需求文档、界面交互文档、功能设计文档、目录结构文档。
3. 目录结构文档(递归)必须包含项目的所有目录和文件，以及它们的相对路径，对所有的目录和文件进行说明。
4. 每次对话前必须先阅读` .docs/ `目录下的文档。
5. 每次对话后必须同步更新` .docs/ `目录下的文档，有错误必须及时纠正，更新完成后再结束对话。
6. 禁止修改` .docs/my_write.md `


## 铁律
1. 复述原需求，分要点拆解，提取关键词。
2. 执行前必须阅读全局规则和用户规则等文档。根据<技能规则>，主动选择使用多个技能。
3. 开始前你必须代入具体的角色，选择一位最适合的领域顶尖名人专家来思考它，并且说明该角色的核心风格。
4. 思考前必须完全熟悉本项目的基本结构和逻辑设计。相似功能参考` .example/ `下的竞品项目。
5. **目录模块化规范**：
   - `docker/` 目录**仅存放本项目容器化部署配置**，禁止存放无关项目（如RAGFlow）的配置文件
   - 目录内禁止出现空目录（创建前确认有内容填充）
   - 配置文件必须与服务对应，禁止混杂无关配置
   - 应用Dockerfile优先放置在根目录（标准做法）
6. 优先和用户讨论得到完善的需求，讨论方式包括反问、追问、辩论、预演等等。
7. 思考时必须深入学习互联网优秀案例，特别是相似功能场景的应用，必须重点参考。
8. 多角度全面考虑，深度分析，找到该需求涉及的所有文件，从"前端"、"后端"、"资源"、"文档" 4个方面，依次输出文件说明。
9. 整合思路，必须使用"plan mode"/"task todos"模式建立详细的流程化预执行方案。严格遵守《## 输出规范》。
10. 优先提供方案供用户选择，等待用户确认后，才能执行。
11. 执行完毕后，进行逻辑验证，是否和预期方案一致。
12. 必须使用"记忆"MCP,将历史对话中所有的问答都记录在`.memory.md`中，每次对话都必须补充、更新或修正内容。
13. 始终使用中文对话,始终不要在项目内创建任何说明文档。


## 技能规则
### 全局技能 - 始终启用
- **Superpowers**：核心技能，用于能力扩展
- **Planning with Files**：辅助技能，用于任务规划与进度追踪
- **multi-agent-brainstorming**：多智能体思考
- **ralph-loop**：按标准交付，保证对话质量

### 全局技能 - 可选使用
- **brainstorming**：头脑风暴技能，生成新的想法
- **mem-search**：研究技能，用于研究相关知识

### 场景触发技能：设计 UI/界面
- **Frontend Design** + **UI UX Pro Max**：组合使用

### 场景触发技能：代码审查
- **Code Review** + **Systematic Debugging**：组合使用

### 场景触发技能：效果不佳
- **PUA**：激励技能，用于调整策略或激励重新思考
- **ralph-loop**：标准交付

### 场景触发技能：创建文档
- **Documentation**：使用项目文档规范

### 场景触发技能：研究
- **meeting-minutes-taker**：会议纪要
- **Deep Research**：深度研究技能

### 场景触发技能：开发
- **code-simplifier**：代码优化
- **Code Review**：代码审查


## 本地服务
### PGSQL
version: 18.1 (x86_64-windows)
user: root
password: NewPassword123!

### Redis
version: x64-5.0.14.1
path: ` E:\Redis `
redis-server.exe: ` E:\Redis\redis-server.exe `
redis-cli.exe: ` E:\Redis\redis-cli.exe `


## Thinking

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
