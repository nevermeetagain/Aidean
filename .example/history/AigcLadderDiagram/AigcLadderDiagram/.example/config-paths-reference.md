# Aidean Desktop 配置路径权威参考

> 版本：v1.0 | 日期：2026-03-26
> 本文档为所有竞品分析文档的权威路径参考基准。

---

## 一、Skills 双协议标准说明

### 1.1 两套协议的本质区别

目前 Skills 生态存在**两套不完全兼容的协议**，理解区别是正确实现的前提：

| 维度 | Anthropic SKILL.md 协议 | OpenAI / 通用 AGENTS.md 协议 |
|---|---|---|
| **发起方** | Anthropic（Claude Code）| OpenAI Codex / 社区通用 |
| **核心文件** | `SKILL.md`（每个Skill一个目录）| `AGENTS.md`（单文件，XML块聚合）|
| **发现方式** | Agent扫描`skills/`目录，按需调用 | Agent读取`AGENTS.md`中的`<available_skills>`块 |
| **加载方式** | 渐进式：Agent读取描述→决定是否加载全文 | 全量：`AGENTS.md`启动时全部注入Context |
| **来源** | 每个Skill是独立目录（含SKILL.md + references/ + scripts/）| 所有Skills汇总写入单个AGENTS.md文件 |
| **适用Agent** | Claude Code、OpenCode、cc-switch、skills-hub | Codex、Cursor（部分）、Windsurf（部分）、通用Agent |
| **优势** | Progressive Disclosure，Context效率高 | 兼容性广，任何能读Markdown的Agent均可用 |
| **劣势** | 需要Agent主动支持Skill加载机制 | Context消耗大，Skills越多越臃肿 |

### 1.2 Anthropic SKILL.md 协议详解

```
# 目录结构（每个Skill一个独立目录）
~/.claude/skills/
└── my-skill/
    ├── SKILL.md          # 必须：主文件（含YAML frontmatter）
    ├── references/       # 可选：细分参考文档
    │   ├── api.md
    │   └── examples.md
    └── scripts/          # 可选：可执行脚本
        └── setup.js
```

```markdown
# SKILL.md 标准格式（Anthropic）
---
name: skill-name
description: 一句话描述（用于Agent判断是否加载此Skill）
---

# Skill标题
正文内容...
```

**工作机制**：
1. Agent启动时扫描`skills/`目录，读取每个`SKILL.md`的frontmatter
2. 将`name + description`注入系统提示的`<available_skills>`块
3. 用户提问时，Agent判断是否需要加载某Skill
4. 需要时执行`npx openskills read <skill-name>`（或等效操作）加载全文
5. 全文内容注入当前对话Context

### 1.3 OpenAI / 通用 AGENTS.md 协议详解

```
# 目录结构（单文件汇总）
./.agent/skills/          # 项目级（通用路径）
~/.agent/skills/          # 全局（通用路径）

# AGENTS.md 文件中的Skills块
```

```xml
<!-- AGENTS.md 中的标准XML格式 -->
<skills_system priority="1">
  <available_skills>
    <skill>
      <name>pdf</name>
      <description>Comprehensive PDF manipulation toolkit...</description>
      <location>project</location>  <!-- project | global -->
    </skill>
    <skill>
      <name>frontend-design</name>
      <description>Create distinctive frontend interfaces...</description>
      <location>global</location>
    </skill>
  </available_skills>
</skills_system>
```

**工作机制**：
1. Agent启动时读取`AGENTS.md`文件
2. 解析`<available_skills>`块，将所有Skill描述注入Context
3. **全量注入**（与Anthropic协议的渐进式加载不同）
4. `<location>`指明Skill文件的实际存储位置（project/global）

### 1.4 双协议兼容策略（Aidean Desktop实现方案）

```
安装一个Skill → Aidean Desktop 自动处理双协议：

1. 在中心仓库存储Skill目录（含SKILL.md）
   ~/.aidean/skills/my-skill/

2. 同步到各IDE（Anthropic协议路径）
   ~/.cursor/skills/my-skill/       → symlink/copy
   ~/.claude/skills/my-skill/       → symlink/copy
   ~/.config/opencode/skills/my-skill/ → symlink/copy

3. 同步到通用路径（OpenAI/AGENTS.md协议）
   ~/.agent/skills/my-skill/        → symlink/copy

4. 自动更新项目AGENTS.md（可选，用户确认）
   将Skill信息追加到 ./AGENTS.md 的 <available_skills> 块
```

---

## 二、Skills 配置路径全表

### 2.1 路径约定说明

- `~` = 用户主目录（macOS/Linux: `/Users/用户名` 或 `/home/用户名`；Windows: `C:\Users\用户名`）
- `{workspace}` = 当前项目根目录
- **Windows路径**：将`/`替换为`\`，`~`替换为`%USERPROFILE%`

### 2.2 主流IDE Skills目录（完整表）

| IDE/工具 | 协议 | macOS/Linux全局 | Windows全局 | 项目级 | 备注 |
|---|---|---|---|---|---|
| **Claude Code** | Anthropic | `~/.claude/skills/` | `%USERPROFILE%\.claude\skills\` | `./.claude/skills/` | 官方标准 |
| **Cursor** | Anthropic | `~/.cursor/skills/` | `%USERPROFILE%\.cursor\skills\` | `./.cursor/skills/` | ⚠️ 不支持symlink发现，强制copy |
| **OpenCode** | Anthropic | `~/.config/opencode/skills/` | `%APPDATA%\opencode\skills\` | - | |
| **Windsurf** | Anthropic | `~/.codeium/windsurf/skills/` | `%USERPROFILE%\.codeium\windsurf\skills\` | - | |
| **Trae** | Anthropic | `~/.trae/skills/` | `%USERPROFILE%\.trae\skills\` | `./.trae/skills/` | |
| **Trae CN** | Anthropic | `~/.trae-cn/skills/` | `%USERPROFILE%\.trae-cn\skills\` | - | |
| **Codex** | OpenAI/通用 | `~/.codex/skills/` | `%USERPROFILE%\.codex\skills\` | - | OpenAI官方CLI |
| **Amp** | Anthropic | `~/.config/agents/skills/` | `%APPDATA%\agents\skills\` | - | |
| **Kimi CLI** | 通用 | `~/.config/agents/skills/` | `%APPDATA%\agents\skills\` | - | 与Amp共享路径 |
| **Gemini CLI** | 通用 | `~/.gemini/skills/` | `%USERPROFILE%\.gemini\skills\` | - | |
| **Antigravity** | 通用 | `~/.gemini/antigravity/global_skills/` | `%USERPROFILE%\.gemini\antigravity\global_skills\` | - | |
| **GitHub Copilot** | 通用 | `~/.copilot/skills/` | `%USERPROFILE%\.copilot\skills\` | - | |
| **Cline** | 通用 | `~/.cline/skills/` | `%USERPROFILE%\.cline\skills\` | - | |
| **Roo Code** | 通用 | `~/.roo/skills/` | `%USERPROFILE%\.roo\skills\` | - | |
| **Kilo Code** | 通用 | `~/.kilocode/skills/` | `%USERPROFILE%\.kilocode\skills\` | - | |
| **Augment** | 通用(rules) | `~/.augment/rules/` | `%USERPROFILE%\.augment\rules\` | - | 使用rules目录 |
| **Continue** | 通用 | `~/.continue/skills/` | `%USERPROFILE%\.continue\skills\` | - | |
| **Goose** | 通用 | `~/.config/goose/skills/` | `%APPDATA%\goose\skills\` | - | |
| **Zencoder** | 通用 | `~/.zencoder/skills/` | `%USERPROFILE%\.zencoder\skills\` | - | |
| **Qwen Code** | 通用 | `~/.qwen/skills/` | `%USERPROFILE%\.qwen\skills\` | - | |
| **OpenClaw** | Anthropic | `~/.openclaw/skills/` | `%USERPROFILE%\.openclaw\skills\` | - | |
| **MoltBot** | 通用 | `~/.moltbot/skills/` | `%USERPROFILE%\.moltbot\skills\` | - | |
| **通用（openskills）** | OpenAI/通用 | `~/.agent/skills/` | `%USERPROFILE%\.agent\skills\` | `./.agent/skills/` | openskills --universal |

### 2.3 Cursor symlink 已知问题

```
⚠️ 重要：Cursor 不支持通过 symlink 发现 Skills
原因：Cursor扫描skills目录时不跟随符号链接
参考：https://forum.cursor.com/t/cursor-doesnt-follow-symlinks-to-discover-skills/149693/4

解决方案：Cursor目标必须使用 copy 模式，不能使用 symlink/junction

影响工具：
- skills-hub：Cursor适配器强制 force_copy = true
- cc-switch：同步时对Cursor使用copy模式
- Aidean Desktop：Cursor sync_mode 固定为 Copy
```

---

## 三、MCP 配置文件路径全表

### 3.1 MCP配置格式说明

MCP（Model Context Protocol）配置文件统一使用 **JSON格式**，各工具略有差异：

```json
// 标准MCP配置格式（Claude Desktop / Cursor通用）
{
  "mcpServers": {
    "server-name": {
      "command": "npx",
      "args": ["-y", "package-name"],
      "env": {
        "API_KEY": "your-api-key"
      }
    },
    "sse-server": {
      "url": "http://localhost:3000/mcp",
      "headers": {
        "Authorization": "Bearer token"
      }
    }
  }
}
```

### 3.2 各IDE MCP配置文件路径

| IDE/工具 | macOS | Windows | Linux | 格式说明 |
|---|---|---|---|---|
| **Claude Desktop** | `~/Library/Application Support/Claude/claude_desktop_config.json` | `%APPDATA%\Claude\claude_desktop_config.json` | `~/.config/claude/claude_desktop_config.json` | 独立JSON文件 |
| **Claude Code** | `~/.claude.json`（全局）或`{workspace}/.claude/settings.json` | `%USERPROFILE%\.claude.json` | `~/.claude.json` | 全局JSON或项目级settings |
| **Cursor** | `~/.cursor/mcp.json` | `%USERPROFILE%\.cursor\mcp.json` | `~/.cursor/mcp.json` | 独立JSON文件 |
| **Windsurf** | `~/.codeium/windsurf/mcp_config.json` | `%USERPROFILE%\.codeium\windsurf\mcp_config.json` | `~/.codeium/windsurf/mcp_config.json` | 独立JSON文件 |
| **VS Code** | 无内置MCP，需插件（Continue/Cline等）| 同左 | 同左 | 各插件配置不同 |
| **OpenCode** | `~/.config/opencode/config.json`（mcp字段）| `%APPDATA%\opencode\config.json` | `~/.config/opencode/config.json` | 写入config.json的mcp字段 |
| **Codex** | `~/.codex/config.json` | `%USERPROFILE%\.codex\config.json` | `~/.codex/config.json` | |
| **Zed** | `~/.config/zed/settings.json`（context_servers字段）| `%APPDATA%\Zed\settings.json` | `~/.config/zed/settings.json` | context_servers字段 |
| **Cline** | `{workspace}/.cline/mcp_settings.json` | 同左 | 同左 | 项目级 |
| **mcphub** | `./mcp_settings.json`（自托管）| 同左 | 同左 | 本地部署配置 |

### 3.3 MCP协议类型

| 协议类型 | 说明 | 配置字段 | 适用场景 |
|---|---|---|---|
| **stdio** | 本地进程，通过stdin/stdout通信 | `command` + `args` + `env` | 本地MCP服务器（最常用）|
| **SSE** | Server-Sent Events，HTTP长连接 | `url` + `headers` | 远程MCP服务器 |
| **HTTP** | 标准HTTP请求 | `url` + `headers` | 远程MCP服务器 |
| **WebSocket** | 双向WebSocket | `url` + `headers` | 实时双向通信 |

---

## 四、Agent 配置文件路径全表

### 4.1 Agent定义说明

Agent（子代理）是可以被主Agent调度的专用AI任务执行器，不同工具的Agent实现方式不同：

| 工具 | Agent格式 | 说明 |
|---|---|---|
| **Claude Code** | Markdown文件（`.md`）| 存放在`agents/`目录，含frontmatter定义 |
| **OpenCode** | Markdown文件（`.md`）| 与Claude Code格式兼容 |
| **Cursor** | `.cursorrules` 或 `.cursor/rules/` | Rules形式，非标准Agent |
| **Windsurf** | `.windsurfrules` | Rules形式 |
| **通用（AGENTS.md）** | AGENTS.md内的`<agents>`块 | OpenAI Codex生态 |

### 4.2 Agent文件路径

| 工具 | macOS/Linux全局 | Windows全局 | 项目级 | 格式 |
|---|---|---|---|---|
| **Claude Code** | `~/.claude/agents/` | `%USERPROFILE%\.claude\agents\` | `./.claude/agents/` | `.md` 含frontmatter |
| **OpenCode** | `~/.config/opencode/agents/` | `%APPDATA%\opencode\agents\` | - | `.md` 含frontmatter |
| **Cursor Rules** | `~/.cursor/rules/` | `%USERPROFILE%\.cursor\rules\` | `./.cursor/rules/` | `.mdc` 文件 |
| **Windsurf Rules** | `~/.codeium/windsurf/rules/` | `%USERPROFILE%\.codeium\windsurf\rules\` | `./.windsurfrules` | Markdown |
| **cc-switch** | `~/.cc-switch/agents/` | `%USERPROFILE%\.cc-switch\agents\` | - | 自定义格式 |

### 4.3 Claude Code Agent文件格式

```markdown
---
name: code-reviewer
description: 代码审查专家，分析代码质量和安全问题
model: claude-opus-4-5
tools:
  - read_file
  - search_files
---

# 代码审查Agent

你是一位专业的代码审查专家...
```

---

## 五、Rules / CLAUDE.md 路径（补充）

### 5.1 全局Rules文件

| 工具 | macOS/Linux | Windows | 说明 |
|---|---|---|---|
| **Claude Code** | `~/.claude/CLAUDE.md` | `%USERPROFILE%\.claude\CLAUDE.md` | 全局系统提示 |
| **Claude Code（项目）** | `{workspace}/CLAUDE.md` | 同左 | 项目级系统提示 |
| **Cursor** | `~/.cursor/rules/` | `%USERPROFILE%\.cursor\rules\` | 全局Rules（.mdc格式）|
| **Cursor（项目）** | `{workspace}/.cursor/rules/` | 同左 | 项目Rules |
| **Windsurf** | `~/.codeium/windsurf/memories/global_rules.md` | `%USERPROFILE%\.codeium\windsurf\memories\global_rules.md` | 全局Rules |
| **Windsurf（项目）** | `{workspace}/.windsurfrules` | 同左 | 项目Rules |
| **OpenCode** | `~/.config/opencode/AGENTS.md` | `%APPDATA%\opencode\AGENTS.md` | 全局系统提示 |
| **Codex** | `~/.codex/AGENTS.md` | `%USERPROFILE%\.codex\AGENTS.md` | 全局AGENTS.md |
| **通用** | `{workspace}/AGENTS.md` | 同左 | 项目AGENTS.md（OpenAI生态）|

---

## 六、同步策略与特殊规则

### 6.1 三级fallback同步策略（来自skills-hub）

```rust
// 优先级：Symlink > Junction（Windows）> Copy
pub fn sync_dir_hybrid(source: &Path, target: &Path) -> Result<SyncOutcome> {
    // 1. 尝试符号链接（macOS/Linux默认）
    if try_link_dir(source, target).is_ok() {
        return SyncMode::Symlink;
    }
    // 2. Windows专用：Junction（目录联接点，类似symlink）
    #[cfg(windows)]
    if try_junction(source, target).is_ok() {
        return SyncMode::Junction;
    }
    // 3. 最终fallback：完整目录复制
    copy_dir_recursive(source, target)?;
    return SyncMode::Copy;
}
```

### 6.2 强制Copy的特殊情况

| 工具 | 强制Copy原因 | 来源 |
|---|---|---|
| **Cursor** | 不支持通过symlink发现Skills | skills-hub CHANGELOG v0.1.0 |
| **Windows某些路径** | 非管理员账户无法创建symlink | Windows权限限制 |
| **WSL路径** | 跨文件系统symlink可能失效 | 已知兼容性问题 |

### 6.3 路径优先级（openskills标准）

```
优先级由高到低：
1. {workspace}/.agent/skills/    ← 项目级universal（最高优先级）
2. ~/.agent/skills/               ← 全局universal
3. {workspace}/.claude/skills/   ← 项目级Anthropic
4. ~/.claude/skills/              ← 全局Anthropic（最低优先级）
```

---

## 七、各工具完整路径汇总表

```
工具名称          │ Skills目录                          │ MCP配置文件                              │ Agent目录                    │ Rules文件
──────────────────┼─────────────────────────────────────┼──────────────────────────────────────────┼──────────────────────────────┼──────────────
Claude Code       │ ~/.claude/skills/                   │ ~/.claude.json                           │ ~/.claude/agents/            │ ~/.claude/CLAUDE.md
Cursor            │ ~/.cursor/skills/ [CP*]             │ ~/.cursor/mcp.json                       │ ~/.cursor/rules/ (.mdc)      │ ~/.cursor/rules/
Windsurf          │ ~/.codeium/windsurf/skills/         │ ~/.codeium/windsurf/mcp_config.json      │ -                            │ ~/.codeium/windsurf/memories/global_rules.md
Claude Desktop    │ -（不支持Skills）                   │ ~/Library/Application Support/Claude/claude_desktop_config.json │ - │ -
OpenCode          │ ~/.config/opencode/skills/          │ ~/.config/opencode/config.json (mcp字段) │ ~/.config/opencode/agents/   │ ~/.config/opencode/AGENTS.md
Codex             │ ~/.codex/skills/                    │ ~/.codex/config.json                     │ -                            │ ~/.codex/AGENTS.md
Amp               │ ~/.config/agents/skills/            │ -                                        │ -                            │ -
Trae              │ ~/.trae/skills/                     │ -                                        │ -                            │ -
Gemini CLI        │ ~/.gemini/skills/                   │ -                                        │ -                            │ -
Cline             │ ~/.cline/skills/                    │ {workspace}/.cline/mcp_settings.json    │ -                            │ -
Roo Code          │ ~/.roo/skills/                      │ -                                        │ -                            │ -
通用(openskills)  │ ~/.agent/skills/                    │ -                                        │ -                            │ ~/AGENTS.md 或 ./AGENTS.md

[CP*] = Cursor强制使用Copy模式（不支持symlink发现Skills）

Windows路径：将 ~/.xxx 替换为 %USERPROFILE%\.xxx
            将 ~/Library/... 替换为 %APPDATA%\...
            将 ~/.config/... 替换为 %APPDATA%\...
```

---

## 八、双协议实现逻辑详解

### 8.1 协议识别判断流程

```
安装一个Skill时，Aidean Desktop如何判断使用哪种协议？

答：不需要判断——两种协议同时处理。

                 [安装Skill]
                      │
          ┌───────────┼───────────┐
          ▼           ▼           ▼
   ① 中心仓库    ② Anthropic协议   ③ OpenAI协议
   存储完整目录   同步到38+IDE目录   同步到.agent路径
   (单一真相源)  (按工具适配器)    + 可选更新AGENTS.md
```

### 8.2 Anthropic协议完整实现

```typescript
// 前端：发现Skills（只读frontmatter，不加载全文）
async function discoverSkillsAnthropic(): Promise<SkillRecord[]> {
  return await invoke<SkillRecord[]>('list_skills');
  // Rust端：遍历中心仓库，解析每个SKILL.md的YAML frontmatter
  // 返回：name + description（不含全文——渐进式加载）
}

// 前端：按需加载全文（只在用户查看详情时调用）
async function loadSkillContent(name: string): Promise<string> {
  return await invoke<string>('get_skill_content', { name });
}
```

```rust
// Rust后端：SKILL.md frontmatter解析
fn parse_frontmatter(content: &str) -> Option<SkillFrontmatter> {
  // 匹配 ---\nYAML\n--- 格式
  let re = Regex::new(r"(?s)^---\n(.*?)\n---").unwrap();
  if let Some(caps) = re.captures(content) {
    let yaml_str = caps.get(1)?.as_str();
    return serde_yaml::from_str(yaml_str).ok();
  }
  None
}

// Rust后端：同步到Anthropic协议路径（38+工具）
pub fn sync_anthropic(central: &Path, skill_name: &str) -> Vec<SyncResult> {
  get_detected_adapters()
    .iter()
    .map(|adapter| {
      let target = home_dir().join(&adapter.skills_dir).join(skill_name);
      let mode = sync_to_target(central, &target, adapter.force_copy);
      SyncResult { tool: adapter.key, mode }
    })
    .collect()
}
```

### 8.3 OpenAI/通用协议完整实现

```rust
// Rust后端：生成AGENTS.md的<available_skills>XML块
pub fn generate_skills_xml(skills: &[SkillRecord]) -> String {
  let skill_tags = skills.iter().map(|s| format!(
    "    <skill>\n      <name>{}</name>\n      <description>{}</description>\n      <location>{}</location>\n    </skill>",
    s.name, s.description,
    if s.is_project_scope { "project" } else { "global" }
  )).collect::<Vec<_>>().join("\n");

  format!(r#"<skills_system priority="1">
  <usage>
How to use skills:
- Invoke: Bash("npx openskills read <skill-name>")
  </usage>
  <available_skills>
{}
  </available_skills>
</skills_system>"#, skill_tags)
}

// Rust后端：增量更新AGENTS.md（只替换<available_skills>块）
pub fn update_agents_md(path: &Path, skills: &[SkillRecord]) -> Result<()> {
  let existing = if path.exists() {
    fs::read_to_string(path)?
  } else {
    String::new()
  };

  let new_xml = generate_skills_xml(skills);

  // 精确替换：只更新skills_system块，保留文件其他内容
  let re = Regex::new(r"(?s)<skills_system[^>]*>.*?</skills_system>").unwrap();
  let updated = if re.is_match(&existing) {
    re.replace(&existing, new_xml.as_str()).to_string()
  } else {
    format!("{}\n\n{}", existing.trim_end(), new_xml)
  };

  // 原子写入（防止写入中途损坏）
  let tmp = path.with_extension("md.tmp");
  fs::write(&tmp, &updated)?;
  fs::rename(&tmp, path)?;
  Ok(())
}
```

### 8.4 三级fallback同步（来自skills-hub，MIT）

```rust
// 同步模式选择（按优先级）
fn sync_to_target(source: &Path, target: &Path, force_copy: bool) -> SyncMode {
  // 检查是否已是最新版本
  if target.exists() && content_hash_match(source, target) {
    return SyncMode::UpToDate;
  }

  // 清理旧目标
  let _ = remove_target(target);

  // 强制copy（Cursor专用）
  if force_copy {
    copy_dir_recursive(source, target).unwrap();
    return SyncMode::Copy;
  }

  // macOS/Linux：优先symlink
  #[cfg(unix)] {
    if std::os::unix::fs::symlink(source, target).is_ok() {
      return SyncMode::Symlink;
    }
  }

  // Windows：Junction点（不需要管理员权限，功能类似symlink）
  #[cfg(windows)] {
    if junction::create(source, target).is_ok() {
      return SyncMode::Junction;
    }
  }

  // 最终fallback：完整目录复制
  copy_dir_recursive(source, target).unwrap();
  SyncMode::Copy
}

// 强制copy的情况：
// 1. adapter.force_copy = true（Cursor）
// 2. 非管理员Windows账户（symlink需要权限）
// 3. WSL跨文件系统路径
```

### 8.5 双协议兼容性：能否互相识别？

```
问：安装在Anthropic路径的Skill，Codex能读取吗？
答：不能直接读取。需要先运行 openskills sync 或 Aidean Desktop
    生成AGENTS.md后，Codex才能通过OpenAI协议读取。

问：安装在OpenAI路径(~/.agent/skills)的Skill，Claude Code能读取吗？
答：可以。Claude Code扫描skills目录时，~/.agent/skills的优先级
    高于~/.claude/skills（4级优先级第2位）。

问：Aidean Desktop如何确保两种协议路径内容一致？
答：中心仓库是唯一数据源。所有路径的内容都是中心仓库的symlink/copy。
    更新时只需更新中心仓库，symlink路径自动生效（copy路径需重新同步）。

问：openskills CLI和Aidean Desktop能共存吗？
答：完全兼容。两者使用相同的目录结构和AGENTS.md格式。
    用户可以混合使用，操作结果互相可见。
```

### 8.6 场景推荐

| 场景 | 推荐协议 | 理由 |
|---|---|---|
| **纯Claude Code用户** | Anthropic协议 | 原生渐进式加载，Context效率最高 |
| **纯Codex用户** | OpenAI协议 | 必须AGENTS.md格式 |
| **多工具用户（主流）**| 双协议 | Aidean Desktop自动处理，无需手动 |
| **Skills开发者** | Anthropic协议 | 独立目录，易于开发和测试 |
| **团队协作** | OpenAI协议 | AGENTS.md单文件，版本控制友好 |
| **Context敏感（大型项目）**| Anthropic协议 | 渐进式加载避免Context爆炸 |
