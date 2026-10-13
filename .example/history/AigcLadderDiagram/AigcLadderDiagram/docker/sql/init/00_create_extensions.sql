-- 创建必要的PostgreSQL扩展
-- 执行: psql -U root -d aigc_ladder -f 00_create_extensions.sql

-- pgcrypto: 加密函数
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- uuid-ossp: UUID生成
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- pg_trgm: 全文搜索和模糊匹配
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ltree: 树形结构支持
CREATE EXTENSION IF NOT EXISTS ltree;

-- 验证扩展是否创建成功
SELECT 
    extname as extension,
    extversion as version
FROM pg_extension 
WHERE extname IN ('pgcrypto', 'uuid-ossp', 'pg_trgm', 'ltree');
