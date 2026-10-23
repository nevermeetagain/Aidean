-- UX-26（2026-10-22 用户裁定 4 / 8）· 管理端导航既有库自动对齐，免去手动「应用推荐分组」。
-- 只动仍是旧出厂名的行：管理员在 /admin/menus 自定义过的名称不覆盖；menu_code / path 不变。
UPDATE "navigation_menus" SET "name" = '厂商管理', "updated_at" = NOW()
 WHERE "menu_code" = 'adm_vendors' AND "name" = '提供商管理';
UPDATE "navigation_menus" SET "name" = '服务平台', "updated_at" = NOW()
 WHERE "menu_code" = 'adm_providers' AND "name" = '模型提供商';
UPDATE "navigation_menus" SET "name" = '兼容矩阵', "updated_at" = NOW()
 WHERE "menu_code" = 'adm_capabilities' AND "name" = '能力矩阵';
-- 协议矩阵已并入兼容矩阵 Tab，/admin/protocols 仅作重定向：停用侧栏叶（停用不删，保历史，与 applyDefaultAdminNav 一致）。
UPDATE "navigation_menus" SET "is_active" = false, "updated_at" = NOW()
 WHERE "menu_code" = 'adm_protocols' AND "is_active" = true;
