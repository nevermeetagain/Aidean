-- ============================================================
-- Aidean AI模型天梯图平台 - RBAC权限体系索引创建脚本
-- 12_create_rbac_indexes.sql
-- 功能：为RBAC相关表创建索引
-- ============================================================

-- ============================================================
-- 1. 角色表索引
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_roles_tenant ON roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_roles_status ON roles(status);
CREATE INDEX IF NOT EXISTS idx_roles_is_active ON roles(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_roles_is_system ON roles(is_system);
CREATE INDEX IF NOT EXISTS idx_roles_sort ON roles(sort_order);

-- ============================================================
-- 2. 权限表索引
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_permissions_status ON permissions(status);
CREATE INDEX IF NOT EXISTS idx_permissions_resource ON permissions(resource);
CREATE INDEX IF NOT EXISTS idx_permissions_action ON permissions(action);
CREATE INDEX IF NOT EXISTS idx_permissions_resource_action ON permissions(resource, action);

-- ============================================================
-- 3. 用户角色关联表索引
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_tenant ON user_roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_status ON user_roles(status);
CREATE INDEX IF NOT EXISTS idx_user_roles_granted_at ON user_roles(granted_at);
CREATE INDEX IF NOT EXISTS idx_user_roles_expires ON user_roles(expires_at) WHERE expires_at IS NOT NULL;

-- ============================================================
-- 4. 角色权限关联表索引
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_status ON role_permissions(status);

-- ============================================================
-- 5. 部门表索引
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_departments_tenant ON departments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_departments_status ON departments(status);
CREATE INDEX IF NOT EXISTS idx_departments_parent ON departments(parent_id);
CREATE INDEX IF NOT EXISTS idx_departments_org_path ON departments USING GIST (org_path);
CREATE INDEX IF NOT EXISTS idx_departments_manager ON departments(manager_id);

-- ============================================================
-- 6. 团队表索引
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_teams_tenant ON teams(tenant_id);
CREATE INDEX IF NOT EXISTS idx_teams_status ON teams(status);
CREATE INDEX IF NOT EXISTS idx_teams_department ON teams(department_id);
CREATE INDEX IF NOT EXISTS idx_teams_leader ON teams(leader_id);

-- ============================================================
-- 7. 团队成员表索引
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_status ON team_members(status);
CREATE INDEX IF NOT EXISTS idx_team_members_role ON team_members(role_in_team);

-- ============================================================
-- 8. 订阅套餐表索引
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_subscription_plans_status ON subscription_plans(status);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_is_active ON subscription_plans(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_subscription_plans_sort ON subscription_plans(sort_order);

-- ============================================================
-- 9. 用户配额表索引
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_user_quotas_user ON user_quotas(user_id);
CREATE INDEX IF NOT EXISTS idx_user_quotas_plan ON user_quotas(plan_id);
CREATE INDEX IF NOT EXISTS idx_user_quotas_status ON user_quotas(status);
CREATE INDEX IF NOT EXISTS idx_user_quotas_reset ON user_quotas(api_calls_reset_at);

