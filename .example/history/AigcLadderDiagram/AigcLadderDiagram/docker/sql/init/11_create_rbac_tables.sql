-- ============================================================
-- Aidean AI模型天梯图平台 - RBAC权限体系表创建脚本
-- 11_create_rbac_tables.sql
-- 功能：创建角色、权限、组织架构、订阅套餐等核心缺失表
-- 环境：PostgreSQL 16+
-- 命名规范：snake_case, 复数形式, 全部小写
-- ============================================================

-- ============================================================
-- 1. RBAC权限体系表
-- ============================================================

-- 1.1 角色表
CREATE TABLE IF NOT EXISTS roles (
    -- 核心审计字段（所有表必须包含）
    id BIGINT NOT NULL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by BIGINT,
    updated_by BIGINT,
    
    -- 状态字段（所有表必须包含）
    status SMALLINT NOT NULL DEFAULT 1 CHECK (status IN (0, 1, 2)),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- 版本与租户
    version INT NOT NULL DEFAULT 1,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    
    -- 业务字段
    code VARCHAR(50) NOT NULL,  -- admin, editor, user, guest
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT FALSE,  -- 系统内置角色不可删除
    sort_order INT DEFAULT 0,
    
    -- 扩展字段
    ext_json JSONB DEFAULT '{}',
    ext_jsonb_index JSONB DEFAULT '{}',
    
    -- 约束
    CONSTRAINT uk_roles_code_tenant UNIQUE (tenant_id, code)
);

COMMENT ON TABLE roles IS '角色表：RBAC角色定义，支持多租户';
COMMENT ON COLUMN roles.status IS '状态：0-禁用 1-正常 2-弃用';
COMMENT ON COLUMN roles.code IS '角色编码：admin, editor, user, guest';
COMMENT ON COLUMN roles.is_system IS '是否系统内置：true-不可删除 false-可删除';

-- 1.2 权限表
CREATE TABLE IF NOT EXISTS permissions (
    -- 核心审计字段
    id BIGINT NOT NULL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    
    -- 状态字段
    status SMALLINT NOT NULL DEFAULT 1 CHECK (status IN (0, 1, 2)),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    
    version INT NOT NULL DEFAULT 1,
    
    -- 业务字段
    code VARCHAR(100) NOT NULL UNIQUE,  -- model:create, model:update
    name VARCHAR(100) NOT NULL,
    resource VARCHAR(50) NOT NULL,  -- model, skill, user, system
    action VARCHAR(50) NOT NULL,    -- create, read, update, delete, execute
    description TEXT,
    
    -- 扩展字段
    ext_json JSONB DEFAULT '{}',
    ext_jsonb_index JSONB DEFAULT '{}'
);

COMMENT ON TABLE permissions IS '权限表：资源-操作权限定义';
COMMENT ON COLUMN permissions.status IS '状态：0-禁用 1-正常 2-弃用';
COMMENT ON COLUMN permissions.resource IS '资源类型：model, skill, user, system等';
COMMENT ON COLUMN permissions.action IS '操作类型：create, read, update, delete, execute';

-- 1.3 用户角色关联表
CREATE TABLE IF NOT EXISTS user_roles (
    -- 核心审计字段
    id BIGINT NOT NULL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- 状态字段
    status SMALLINT NOT NULL DEFAULT 1 CHECK (status IN (0, 1, 2)),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    
    version INT NOT NULL DEFAULT 1,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    
    -- 业务字段
    user_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    granted_by BIGINT,  -- 授权人
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,  -- 角色有效期（可选）
    
    -- 扩展字段
    ext_json JSONB DEFAULT '{}',
    ext_jsonb_index JSONB DEFAULT '{}',
    
    -- 约束
    CONSTRAINT uk_user_roles UNIQUE (user_id, role_id, tenant_id),
    CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

COMMENT ON TABLE user_roles IS '用户角色关联表：多租户环境下用户角色分配';
COMMENT ON COLUMN user_roles.status IS '状态：0-禁用 1-正常 2-弃用';
COMMENT ON COLUMN user_roles.granted_by IS '授权人ID：记录谁授予的角色';
COMMENT ON COLUMN user_roles.expires_at IS '过期时间：NULL表示永久有效';

-- 1.4 角色权限关联表
CREATE TABLE IF NOT EXISTS role_permissions (
    -- 核心审计字段
    id BIGINT NOT NULL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- 状态字段
    status SMALLINT NOT NULL DEFAULT 1 CHECK (status IN (0, 1, 2)),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    
    version INT NOT NULL DEFAULT 1,
    
    -- 业务字段
    role_id BIGINT NOT NULL,
    permission_id BIGINT NOT NULL,
    conditions JSONB DEFAULT NULL,  -- 权限条件：{"own_data_only": true}
    
    -- 扩展字段
    ext_json JSONB DEFAULT '{}',
    ext_jsonb_index JSONB DEFAULT '{}',
    
    -- 约束
    CONSTRAINT uk_role_permissions UNIQUE (role_id, permission_id),
    CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

COMMENT ON TABLE role_permissions IS '角色权限关联表：角色拥有的权限';
COMMENT ON COLUMN role_permissions.status IS '状态：0-禁用 1-正常 2-弃用';
COMMENT ON COLUMN role_permissions.conditions IS '权限条件JSON：如仅允许操作自己的数据';

-- ============================================================
-- 2. 组织架构表
-- ============================================================

-- 2.1 部门表
CREATE TABLE IF NOT EXISTS departments (
    -- 核心审计字段
    id BIGINT NOT NULL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by BIGINT,
    updated_by BIGINT,
    
    -- 状态字段
    status SMALLINT NOT NULL DEFAULT 1 CHECK (status IN (0, 1, 2)),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- 版本与租户
    version INT NOT NULL DEFAULT 1,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    
    -- 层级字段
    parent_id BIGINT,
    org_path LTREE,
    level INT DEFAULT 1,
    
    -- 业务字段
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    manager_id BIGINT,
    
    -- 扩展字段
    ext_json JSONB DEFAULT '{}',
    ext_jsonb_index JSONB DEFAULT '{}',
    
    -- 约束
    CONSTRAINT uk_departments_code_tenant UNIQUE (tenant_id, code),
    CONSTRAINT fk_departments_parent FOREIGN KEY (parent_id) REFERENCES departments(id) ON DELETE SET NULL
);

COMMENT ON TABLE departments IS '部门表：组织架构部门管理，支持层级结构';
COMMENT ON COLUMN departments.status IS '状态：0-禁用 1-正常 2-弃用';
COMMENT ON COLUMN departments.org_path IS '层级路径：LTREE类型，支持层级查询';
COMMENT ON COLUMN departments.level IS '层级深度：根部门为1';
COMMENT ON COLUMN departments.manager_id IS '部门负责人ID';

-- 2.2 团队表
CREATE TABLE IF NOT EXISTS teams (
    -- 核心审计字段
    id BIGINT NOT NULL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by BIGINT,
    updated_by BIGINT,
    
    -- 状态字段
    status SMALLINT NOT NULL DEFAULT 1 CHECK (status IN (0, 1, 2)),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- 版本与租户
    version INT NOT NULL DEFAULT 1,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    
    -- 业务字段
    department_id BIGINT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    leader_id BIGINT,
    max_members INT DEFAULT 10,
    
    -- 扩展字段
    ext_json JSONB DEFAULT '{}',
    ext_jsonb_index JSONB DEFAULT '{}',
    
    -- 约束
    CONSTRAINT fk_teams_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
);

COMMENT ON TABLE teams IS '团队表：项目/业务团队管理';
COMMENT ON COLUMN teams.status IS '状态：0-禁用 1-正常 2-弃用';
COMMENT ON COLUMN teams.max_members IS '最大成员数：默认10人';

-- 2.3 团队成员表
CREATE TABLE IF NOT EXISTS team_members (
    -- 核心审计字段
    id BIGINT NOT NULL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- 状态字段
    status SMALLINT NOT NULL DEFAULT 1 CHECK (status IN (0, 1, 2)),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    
    version INT NOT NULL DEFAULT 1,
    
    -- 业务字段
    team_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    role_in_team VARCHAR(50) DEFAULT 'member',  -- leader, member, guest
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- 扩展字段
    ext_json JSONB DEFAULT '{}',
    ext_jsonb_index JSONB DEFAULT '{}',
    
    -- 约束
    CONSTRAINT uk_team_members UNIQUE (team_id, user_id),
    CONSTRAINT fk_team_members_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    CONSTRAINT fk_team_members_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

COMMENT ON TABLE team_members IS '团队成员表：团队-用户关联';
COMMENT ON COLUMN team_members.status IS '状态：0-禁用 1-正常 2-弃用';
COMMENT ON COLUMN team_members.role_in_team IS '团队内角色：leader-负责人 member-成员 guest-访客';

-- ============================================================
-- 3. 付费订阅套餐表
-- ============================================================

-- 3.1 订阅套餐表
CREATE TABLE IF NOT EXISTS subscription_plans (
    -- 核心审计字段
    id BIGINT NOT NULL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by BIGINT,
    updated_by BIGINT,
    
    -- 状态字段
    status SMALLINT NOT NULL DEFAULT 1 CHECK (status IN (0, 1, 2)),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- 版本
    version INT NOT NULL DEFAULT 1,
    
    -- 业务字段
    code VARCHAR(50) NOT NULL UNIQUE,  -- free, pro, enterprise
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price_monthly NUMERIC(10,2),
    price_yearly NUMERIC(10,2),
    currency VARCHAR(3) DEFAULT 'CNY',
    
    -- 配额配置
    quotas JSONB NOT NULL DEFAULT '{
        "api_calls_per_day": 100,
        "models_max": 5,
        "storage_mb": 100,
        "team_members_max": 1,
        "skills_max": 10,
        "agents_max": 3
    }',
    
    features JSONB DEFAULT '[]',  -- 功能开关列表
    sort_order INT DEFAULT 0,
    
    -- 扩展字段
    ext_json JSONB DEFAULT '{}',
    ext_jsonb_index JSONB DEFAULT '{}'
);

COMMENT ON TABLE subscription_plans IS '订阅套餐表：定义各等级套餐的配额和价格';
COMMENT ON COLUMN subscription_plans.status IS '状态：0-禁用 1-正常 2-弃用';
COMMENT ON COLUMN subscription_plans.code IS '套餐编码：free, pro, enterprise';
COMMENT ON COLUMN subscription_plans.quotas IS '配额配置JSON：API调用次数、模型数、存储空间等';
COMMENT ON COLUMN subscription_plans.features IS '功能列表JSON：该套餐可使用的功能';

-- 3.2 用户配额表
CREATE TABLE IF NOT EXISTS user_quotas (
    -- 核心审计字段
    id BIGINT NOT NULL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    
    -- 状态字段
    status SMALLINT NOT NULL DEFAULT 1 CHECK (status IN (0, 1, 2)),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- 版本
    version INT NOT NULL DEFAULT 1,
    
    -- 业务字段
    user_id BIGINT NOT NULL,
    plan_id BIGINT,
    
    -- API调用配额
    api_calls_limit INT,
    api_calls_used INT DEFAULT 0,
    api_calls_reset_at TIMESTAMPTZ,
    
    -- 存储配额
    storage_limit_mb INT,
    storage_used_mb INT DEFAULT 0,
    
    -- 模型配额
    models_limit INT,
    models_created INT DEFAULT 0,
    
    -- 团队配额
    team_members_limit INT,
    team_members_count INT DEFAULT 0,
    
    -- Skill配额
    skills_limit INT,
    skills_created INT DEFAULT 0,
    
    -- Agent配额
    agents_limit INT,
    agents_created INT DEFAULT 0,
    
    -- 额外购买的配额包
    extra_quotas JSONB DEFAULT '{}',
    
    -- 扩展字段
    ext_json JSONB DEFAULT '{}',
    ext_jsonb_index JSONB DEFAULT '{}',
    
    -- 约束
    CONSTRAINT uk_user_quotas_user UNIQUE (user_id),
    CONSTRAINT fk_user_quotas_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_quotas_plan FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE SET NULL
);

COMMENT ON TABLE user_quotas IS '用户配额表：记录用户实际配额使用情况';
COMMENT ON COLUMN user_quotas.status IS '状态：0-禁用 1-正常 2-弃用';
COMMENT ON COLUMN user_quotas.api_calls_reset_at IS 'API调用次数重置时间：通常每日重置';
COMMENT ON COLUMN user_quotas.extra_quotas IS '额外购买的配额包JSON';

