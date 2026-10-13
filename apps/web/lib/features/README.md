# lib/features 使用纪律

> 版本: v1.0 | 更新: 2026-08-27 | 变更: 初始化七域脚手架与跨域调用纪律

## 目录职责

本目录为业务骨架树（tasks.md Task 2.6），按领域划分七个一级域 + 一个子域：

```
ladder / ranking / gateway / billing / wallet / evaluation / package(+redemption)
```

每域固定四件套（占位规范，均为合法 TypeScript 暂空实现）：

| 文件 | 职责 |
| --- | --- |
| `service.ts` | 业务编排层（Route → Service → Repository），导出 `<域>Service` 常量对象 |
| `repository.ts` | Prisma 数据访问层，仅可被**本域** service 调用 |
| `schema.ts` | 契约层，暂转发 `@aidean/shared` 公共契约；后续收敛为本域 Zod schema |
| `types.ts` | 本域内部类型预留空间 |

## 铁律：跨 feature 只能经对方 service 导出调用

- **允许**：A 域需要 B 域能力时，只允许 `import { xxxService } from "@/lib/features/xxx/service"`（或经相对路径引用对方 service 对象），通过其暴露的方法交互。
- **禁止**：
  - 跨域直接 import 对方 `repository.ts`（数据访问永不出域）；
  - 跨域直接 import 对方 `schema.ts` / `types.ts` 内部实现细节；
  - 绕过 service 编排直连 Prisma 或修改他域状态。
- **理由**：保证每个域内聚、边界清晰（高内聚低耦合）；跨域依赖全部收敛到单一出口（service），便于追踪调用关系与后续模块拆分。

## 反例 → 正例

```ts
// ❌ 禁止：billing 直接操作 wallet 的仓储
import { walletRepository } from "@/lib/features/wallet/repository";

// ✅ 正确：经 wallet 域 service 出口
import { walletService } from "@/lib/features/wallet/service";
await walletService.xxx();
```

> 注：当前各域为占位骨架，`schema.ts` 的 `export * from "@aidean/shared"` 仅为契约转发过渡态；各域 schema 收敛后应仅保留本域 schema 定义。
> 变体（implement-billing-module）：`wallet` 域为**读侧门面**——账本读写能力全部内聚于 `billing` 域（资金变动唯一编排入口），wallet 仅保留 `service.ts` 薄委托（无 repository/schema/types），控制台经单一入口取读视图，避免双域写竞争。
