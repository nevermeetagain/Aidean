-- ============================================================
-- Aidean AI模型天梯图平台 - 数据库初始化脚本
-- 01_init_extensions.sql
-- 功能：安装所有必需的PostgreSQL扩展
-- 环境：PostgreSQL 16+
-- 时区：Asia/Shanghai (UTC+8)
-- 编码：UTF-8
-- ============================================================

-- 1. UUID生成扩展 (用于UUIDv7主键)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
COMMENT ON EXTENSION "uuid-ossp" IS 'UUID生成函数，用于生成UUIDv7主键';

-- 2. 模糊搜索扩展 (用于LIKE优化和相似度搜索)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
COMMENT ON EXTENSION "pg_trgm" IS '三元组模糊搜索，用于模型名/厂商名模糊匹配';

-- 3. 树结构扩展 (用于组织路径/分类层级)
CREATE EXTENSION IF NOT EXISTS "ltree";
COMMENT ON EXTENSION "ltree" IS '树形结构标签路径，用于分类层级和组织路径';

-- 4. 地理信息扩展 (用于地理位置查询预留)
CREATE EXTENSION IF NOT EXISTS "postgis";
COMMENT ON EXTENSION "postgis" IS '地理信息系统扩展，用于地理位置查询预留';

-- 5. 全文搜索中文分词 (使用pg_jieba或zhparser)
-- 注意：zhparser需要在系统层面安装SCWS，Docker镜像中已预装
-- CREATE EXTENSION IF NOT EXISTS "zhparser";
-- COMMENT ON EXTENSION "zhparser" IS '中文全文搜索分词器';

-- 6. 分区管理扩展 (用于自动分区管理)
-- CREATE EXTENSION IF NOT EXISTS "pg_partman";
-- COMMENT ON EXTENSION "pg_partman" IS '分区表自动管理扩展';

-- 7. 加密函数扩展 (用于敏感数据加密)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
COMMENT ON EXTENSION "pgcrypto" IS '加密函数库，用于敏感数据加密';

-- 8. 数组操作扩展
CREATE EXTENSION IF NOT EXISTS "intarray";
COMMENT ON EXTENSION "intarray" IS '整数数组操作优化';

-- 9. 字典扩展 (用于全文搜索)
CREATE EXTENSION IF NOT EXISTS "unaccent";
COMMENT ON EXTENSION "unaccent" IS '去除重音符号，用于多语言搜索';

-- 验证扩展安装
SELECT extname, extversion FROM pg_extension WHERE extname IN (
    'uuid-ossp', 'pg_trgm', 'ltree', 'postgis', 'pgcrypto', 'intarray', 'unaccent'
) ORDER BY extname;
