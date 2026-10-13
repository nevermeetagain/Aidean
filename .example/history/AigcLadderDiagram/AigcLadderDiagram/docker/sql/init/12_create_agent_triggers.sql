-- ============================================================
-- Aidean IDE/CLI Agent系统 - 触发器创建脚本
-- 12_create_agent_triggers.sql
-- 功能：自动更新 updated_at 字段
-- ============================================================

-- 创建触发器函数（如果不存在）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 1. 分身与学习系统触发器
-- ============================================================

CREATE TRIGGER trigger_personas_updated_at
    BEFORE UPDATE ON personas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_conversations_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 2. 文档与知识系统触发器
-- ============================================================

CREATE TRIGGER trigger_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_doc_templates_updated_at
    BEFORE UPDATE ON doc_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 3. 任务执行系统触发器
-- ============================================================

CREATE TRIGGER trigger_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- TaskSteps不更新，保持原始记录

-- ============================================================
-- 4. 工具注册系统触发器
-- ============================================================

CREATE TRIGGER trigger_tool_registries_updated_at
    BEFORE UPDATE ON tool_registries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ToolExecutions不更新，保持原始记录

-- ============================================================
-- 5. 远程控制系统触发器
-- ============================================================

CREATE TRIGGER trigger_remote_channels_updated_at
    BEFORE UPDATE ON remote_channels
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RemoteCommands不更新，保持原始记录

-- ============================================================
-- 6. 审计日志触发器
-- ============================================================

-- 创建任务状态变更审计触发器
CREATE OR REPLACE FUNCTION audit_task_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        -- 可以在这里插入到审计日志表
        -- 或者发布通知
        PERFORM pg_notify('task_status_change', json_build_object(
            'task_id', NEW.id,
            'old_status', OLD.status,
            'new_status', NEW.status,
            'changed_at', NOW()
        )::text);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_tasks_status_audit
    AFTER UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION audit_task_status_change();

-- 创建学习应用触发器
CREATE OR REPLACE FUNCTION notify_learning_applied()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.applied = FALSE AND NEW.applied = TRUE THEN
        PERFORM pg_notify('learning_applied', json_build_object(
            'source_id', NEW.id,
            'persona_id', NEW.persona_id,
            'applied_at', NEW.applied_at
        )::text);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_learning_sources_applied
    AFTER UPDATE ON learning_sources
    FOR EACH ROW
    EXECUTE FUNCTION notify_learning_applied();
