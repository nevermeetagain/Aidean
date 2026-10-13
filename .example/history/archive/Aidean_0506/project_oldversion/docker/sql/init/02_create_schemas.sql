-- ============================================================
-- Aidean AI模型天梯图平台 - 数据库Schema创建
-- 02_create_schemas.sql
-- 功能：创建数据库Schema和角色
-- 环境：PostgreSQL 16+
-- ============================================================

-- 创建应用数据库（如果不存在）
-- CREATE DATABASE aidean
--     WITH
--     OWNER = root
--     ENCODING = 'UTF8'
--     LC_COLLATE = 'zh_CN.UTF-8'
--     LC_CTYPE = 'zh_CN.UTF-8'
--     TIMEZONE = 'Asia/Shanghai'
--     TEMPLATE = template0;

-- 设置时区
SET timezone = 'Asia/Shanghai';

-- 创建应用角色
DO $$
BEGIN
    -- 应用只读角色
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'aidean_reader') THEN
        CREATE ROLE aidean_reader WITH LOGIN PASSWORD 'reader_password_2026';
    END IF;

    -- 应用读写角色
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'aidean_writer') THEN
        CREATE ROLE aidean_writer WITH LOGIN PASSWORD 'writer_password_2026';
    END IF;

    -- 管理员角色
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'aidean_admin') THEN
        CREATE ROLE aidean_admin WITH LOGIN PASSWORD 'admin_password_2026';
    END IF;
END
$$;

-- 授予权限
GRANT CONNECT ON DATABASE aidean TO aidean_reader, aidean_writer, aidean_admin;
GRANT USAGE ON SCHEMA public TO aidean_reader, aidean_writer, aidean_admin;

-- 只读角色权限
GRANT SELECT ON ALL TABLES IN SCHEMA public TO aidean_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO aidean_reader;

-- 读写角色权限
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO aidean_writer;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO aidean_writer;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO aidean_writer;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO aidean_writer;

-- 管理员角色权限
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO aidean_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO aidean_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO aidean_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO aidean_admin;

-- 创建Schema注释
COMMENT ON SCHEMA public IS 'Aidean AI模型天梯图平台 - 主Schema';
