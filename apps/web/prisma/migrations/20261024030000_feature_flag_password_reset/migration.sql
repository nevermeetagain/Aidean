-- T120-20 跟进：为已有库补登记安全类开关 auth.password_reset（缺省关闭）。
-- 仅插入、幂等：已存在（新库 seed 已建或运营已改）时不覆盖。无结构变更。
INSERT INTO "feature_flags" ("id", "flag_code", "name", "name_cn", "description", "is_enabled", "category", "priority", "created_at", "updated_at")
VALUES (gen_random_uuid()::text, 'auth.password_reset', '找回密码', '找回密码', '邮箱验证码找回密码（需 SMTP）', false, 'auth', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("flag_code") DO NOTHING;
