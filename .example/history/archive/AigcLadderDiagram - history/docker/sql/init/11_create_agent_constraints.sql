-- ============================================================
-- Aidean IDE/CLI Agent系统 - 约束创建脚本
-- 11_create_agent_constraints.sql
-- 功能：为新表添加外键约束和检查约束
-- ============================================================

-- ============================================================
-- 1. 分身与学习系统外键约束
-- ============================================================

-- Personas表外键已在创建时定义
-- LearningSources表外键已在创建时定义
-- Conversations表外键
ALTER TABLE conversations ADD CONSTRAINT fk_conversations_persona 
    FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE SET NULL;

-- ============================================================
-- 2. 文档与知识系统外键约束
-- ============================================================

-- Documents表外键已在创建时定义
-- DocTemplates表无外键
-- UserTemplates表外键已在创建时定义

-- Documents表自引用外键（版本管理）
ALTER TABLE documents ADD CONSTRAINT fk_documents_parent 
    FOREIGN KEY (parent_id) REFERENCES documents(id) ON DELETE SET NULL;

-- ============================================================
-- 3. 任务执行系统外键约束
-- ============================================================

-- Tasks表外键已在创建时定义
-- TaskSteps表外键已在创建时定义
-- TaskRollbacks表外键
ALTER TABLE task_rollbacks ADD CONSTRAINT fk_task_rollbacks_task 
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;

ALTER TABLE task_rollbacks ADD CONSTRAINT fk_task_rollbacks_step 
    FOREIGN KEY (step_id) REFERENCES task_steps(id) ON DELETE CASCADE;

-- Tasks表自引用外键（当前步骤）
ALTER TABLE tasks ADD CONSTRAINT fk_tasks_current_step 
    FOREIGN KEY (current_step) REFERENCES task_steps(id) ON DELETE SET NULL;

-- ============================================================
-- 4. 工具注册系统外键约束
-- ============================================================

-- ToolRegistries表外键已在创建时定义
-- ToolExecutions表外键
ALTER TABLE tool_executions ADD CONSTRAINT fk_tool_executions_task 
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL;

-- ============================================================
-- 5. 远程控制系统外键约束
-- ============================================================

-- RemoteChannels表外键已在创建时定义
-- RemoteCommands表外键
ALTER TABLE remote_commands ADD CONSTRAINT fk_remote_commands_task 
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL;

-- ============================================================
-- 6. 添加额外的检查约束
-- ============================================================

-- 置信度范围检查
ALTER TABLE personas ADD CONSTRAINT chk_personas_threshold 
    CHECK (auto_execute_threshold >= 0 AND auto_execute_threshold <= 1);

ALTER TABLE learning_sources ADD CONSTRAINT chk_learning_sources_confidence 
    CHECK (confidence >= 0 AND confidence <= 1);

ALTER TABLE tasks ADD CONSTRAINT chk_tasks_confidence 
    CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1));

ALTER TABLE tasks ADD CONSTRAINT chk_tasks_progress 
    CHECK (progress >= 0 AND progress <= 100);

ALTER TABLE remote_commands ADD CONSTRAINT chk_remote_commands_confidence 
    CHECK (confidence >= 0 AND confidence <= 1);

-- 任务步骤执行时间检查
ALTER TABLE task_steps ADD CONSTRAINT chk_task_steps_duration 
    CHECK (duration IS NULL OR duration >= 0);

ALTER TABLE tool_executions ADD CONSTRAINT chk_tool_executions_latency 
    CHECK (latency >= 0);

-- 文件大小检查
ALTER TABLE documents ADD CONSTRAINT chk_documents_file_size 
    CHECK (file_size >= 0);

-- 版本号检查
ALTER TABLE documents ADD CONSTRAINT chk_documents_version 
    CHECK (version >= 1);

ALTER TABLE doc_templates ADD CONSTRAINT chk_doc_templates_use_count 
    CHECK (use_count >= 0);
