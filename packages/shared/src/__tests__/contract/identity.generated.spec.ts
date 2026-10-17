// AUTO-GENERATED — DO NOT EDIT
// 由 scripts/contract/gen-contract-tests.mjs 生成（TASK-004 / REQ-NF-001 / ADR-P001）。
// 真源：packages/shared/src/permissions.ts + contracts/03-identity.contract.ts
// 重生成：node scripts/contract/gen-contract-tests.mjs ；CI 以 git diff --exit-code 防漂移/手改。

import { describe, expect, it } from "vitest";
import { ADMIN_DOMAIN_KEYS, ALL_PERMISSION_CODES, SYSTEM_ROLES, PERMISSION_WILDCARD } from "../../permissions";

// 生成期冻结：域数（ADMIN_DOMAINS 键计数）与权限码形（来自 PermissionCodeSchema）
const EXPECTED_DOMAIN_COUNT = 30;
const PERMISSION_CODE_RE = /^admin\.[a-z-]+\.(read|write)$/;

describe("[contract] RBAC 权限注册表（A2 唯一契约源）", () => {
  it("域数稳定（漂移须同步 seed-rbac 并重生成）", () => {
    expect(ADMIN_DOMAIN_KEYS.length).toBe(EXPECTED_DOMAIN_COUNT);
    expect(ALL_PERMISSION_CODES.length).toBe(EXPECTED_DOMAIN_COUNT * 2); // 每域 read+write
  });

  it("每个权限码匹配 admin.<域>.<read|write> 码形", () => {
    for (const code of ALL_PERMISSION_CODES) {
      expect(PERMISSION_CODE_RE.test(code), `非法权限码形: ${code}`).toBe(true);
    }
  });

  it("系统角色权限集 ⊆ 注册表 ∪ 通配（不引用未登记码）", () => {
    const registry = new Set(ALL_PERMISSION_CODES);
    for (const role of SYSTEM_ROLES) {
      for (const p of role.permissions) {
        if (p === PERMISSION_WILDCARD) continue;
        expect(registry.has(p), `${role.code} 引用未登记权限码 ${p}`).toBe(true);
      }
    }
  });
});
