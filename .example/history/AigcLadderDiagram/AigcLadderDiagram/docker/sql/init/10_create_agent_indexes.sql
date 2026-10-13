-- ============================================================
-- Aidean IDE/CLI Agent系统 - 索引创建脚本
-- 10_create_agent_indexes.sql
-- 功能：为新表创建性能优化索引
-- ============================================================

-- ============================================================
-- 1. 分身与学习系统索引
-- ============================================================

-- Personas表索引
CREATE INDEX idx_personas_user_id ON personas(user_id);
CREATE INDEX idx_personas_is_default ON personas(is_default) WHERE is_default = TRUE;
CREATE INDEX idx_personas_is_active ON personas(is_active);
CREATE INDEX idx_personas_created_at ON personas(created_at);

-- LearningSources表索引
CREATE INDEX idx_learning_sources_user_id ON learning_sources(user_id);
CREATE INDEX idx_learning_sources_persona_id ON learning_sources(persona_id);
CREATE INDEX idx_learning_sources_source_type ON learning_sources(source_type);
CREATE INDEX idx_learning_sources_status ON learning_sources(status);
CREATE INDEX idx_learning_sources_applied ON learning_sources(applied);
CREATE INDEX idx_learning_sources_created_at ON learning_sources(created_at);

-- Conversations表索引
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_persona_id ON conversations(persona_id);
CREATE INDEX idx_conversations_type ON conversations(type);
CREATE INDEX idx_conversations_is_learned ON conversations(is_learned);
CREATE INDEX idx_conversations_created_at ON conversations(created_at);

-- ============================================================
-- 2. 文档与知识系统索引
-- ============================================================

-- Documents表索引
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_file_type ON documents(file_type);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_is_learned ON documents(is_learned);
CREATE INDEX idx_documents_vector_id ON documents(vector_id);
CREATE INDEX idx_documents_created_at ON documents(created_at);
CREATE INDEX idx_documents_entities ON documents USING GIN(entities);
CREATE INDEX idx_documents_tags ON documents USING GIN(tags);

-- DocTemplates表索引
CREATE INDEX idx_doc_templates_type ON doc_templates(type);
CREATE INDEX idx_doc_templates_institution ON doc_templates(institution);
CREATE INDEX idx_doc_templates_is_default ON doc_templates(is_default) WHERE is_default = TRUE;
CREATE INDEX idx_doc_templates_is_active ON doc_templates(is_active);

-- UserTemplates表索引
CREATE INDEX idx_user_templates_user_id ON user_templates(user_id);
CREATE INDEX idx_user_templates_template_id ON user_templates(template_id);

-- ============================================================
-- 3. 任务执行系统索引
-- ============================================================

-- Tasks表索引
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_persona_id ON tasks(persona_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_auto_execute ON tasks(auto_execute);
CREATE INDEX idx_tasks_source ON tasks(source);
CREATE INDEX idx_tasks_created_at ON tasks(created_at);

-- TaskSteps表索引
CREATE INDEX idx_task_steps_task_id ON task_steps(task_id);
CREATE INDEX idx_task_steps_status ON task_steps(status);
CREATE INDEX idx_task_steps_step_order ON task_steps(task_id, step_order);
CREATE INDEX idx_task_steps_created_at ON task_steps(created_at);

-- TaskRollbacks表索引
CREATE INDEX idx_task_rollbacks_task_id ON task_rollbacks(task_id);
CREATE INDEX idx_task_rollbacks_step_id ON task_rollbacks(step_id);
CREATE INDEX idx_task_rollbacks_rolled_back_at ON task_rollbacks(rolled_back_at);

-- ============================================================
-- 4. 工具注册系统索引
-- ============================================================

-- ToolRegistries表索引
CREATE INDEX idx_tool_registries_user_id ON tool_registries(user_id);
CREATE INDEX idx_tool_registries_type ON tool_registries(type);
CREATE INDEX idx_tool_registries_name ON tool_registries(name);
CREATE INDEX idx_tool_registries_is_enabled ON tool_registries(is_enabled);
CREATE INDEX idx_tool_registries_is_public ON tool_registries(is_public);
CREATE INDEX idx_tool_registries_created_at ON tool_registries(created_at);

-- ToolExecutions表索引
CREATE INDEX idx_tool_executions_tool_id ON tool_executions(tool_id);
CREATE INDEX idx_tool_executions_task_id ON tool_executions(task_id);
CREATE INDEX idx_tool_executions_status ON tool_executions(status);
CREATE INDEX idx_tool_executions_created_at ON tool_executions(created_at);

-- ============================================================
-- 5. 远程控制系统索引
-- ============================================================

-- RemoteChannels表索引
CREATE INDEX idx_remote_channels_user_id ON remote_channels(user_id);
CREATE INDEX idx_remote_channels_type ON remote_channels(type);
CREATE INDEX idx_remote_channels_is_enabled ON remote_channels(is_enabled);
CREATE INDEX idx_remote_channels_created_at ON remote_channels(created_at);

-- RemoteCommands表索引
CREATE INDEX idx_remote_commands_channel_id ON remote_commands(channel_id);
CREATE INDEX idx_remote_commands_status ON remote_commands(status);
CREATE INDEX idx_remote_commands_intent ON remote_commands(intent);
CREATE INDEX idx_remote_commands_task_id ON remote_commands(task_id);
CREATE INDEX idx_remote_commands_created_at ON remote_commands(created_at);
