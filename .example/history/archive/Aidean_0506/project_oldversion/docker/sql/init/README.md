# Aidean 数据库初始化脚本

## 执行顺序

按文件名前缀数字顺序执行：

| 序号 | 文件 | 说明 |
|------|------|------|
| 01 | init_extensions.sql | PostgreSQL扩展安装 |
| 02 | create_schemas.sql | Schema创建 |
| 03 | create_tables.sql | 核心业务表创建 |
| 04 | create_indexes.sql | 核心表索引创建 |
| 05 | create_constraints.sql | 核心表外键约束 |
| 06 | create_triggers.sql | 核心表触发器 |
| 07 | partition_setup.sql | 分区表设置（在partition目录） |
| 08 | seed_data.sql | 核心种子数据 |
| 09 | create_agent_tables.sql | **IDE/CLI Agent系统表** |
| 10 | create_agent_indexes.sql | **Agent系统索引** |
| 11 | create_agent_constraints.sql | **Agent系统约束** |
| 12 | create_agent_triggers.sql | **Agent系统触发器** |
| 13 | seed_agent_data.sql | **Agent系统种子数据** |

## 快速执行

```bash
# 按顺序执行所有脚本
for f in $(ls *.sql | sort); do
    echo "执行: $f"
    psql -U root -d aidean -f $f
done
```

## 新增表清单（09-13）

### 分身与学习系统
- `personas` - 用户分身配置表
- `learning_sources` - 学习数据源表
- `conversations` - 对话记录表

### 文档与知识系统
- `documents` - 文档管理表
- `doc_templates` - 文档模板表
- `user_templates` - 用户模板收藏表

### 任务执行系统
- `tasks` - 任务执行表
- `task_steps` - 任务步骤表
- `task_rollbacks` - 任务回滚记录表

### 工具注册系统
- `tool_registries` - 工具注册表
- `tool_executions` - 工具执行日志表

### 远程控制系统
- `remote_channels` - 远程控制通道表
- `remote_commands` - 远程命令表

## 核心功能覆盖

- ✅ 自动进化（Persona + LearningSource）
- ✅ 自动执行（Task + 99%置信度检测）
- ✅ 文件系统（Document + OCR + 向量索引）
- ✅ 文档创作（DocTemplate + 论文格式）
- ✅ Skill/MCP/Agent（ToolRegistry）
- ✅ 工作流（Task.plan JSON DAG）
- ✅ 远程控制（RemoteChannel + RemoteCommand）
- ✅ 执行回滚（TaskRollback + Checkpoint）
