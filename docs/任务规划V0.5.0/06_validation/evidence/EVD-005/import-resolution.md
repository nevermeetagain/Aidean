# TASK-005 契约符号导入方式（证据链）

## 规格要求
TASK-005 执行步骤 2：「断言错误体用 ErrorBodySchema.parse（从 @aidean/shared 导入）」。

## 实测：裸包名在仓库根不可解析（故须改用相对源码导入）
Playwright 从仓库根运行（`playwright.config.ts` 在根，`testDir=./e2e/web`）。实测：

- `packages/shared/package.json` → `main: "./src/index.ts"`（无 dist 产物，纯 TS 源）。
- `@aidean/shared` workspace 符号链接**仅存在于** `apps/web/node_modules/@aidean/shared`；仓库根 `node_modules/@aidean` 缺失。
- `require.resolve("@aidean/shared", { paths: ["<repo-root>"] })` → `MODULE_NOT_FOUND`。
- `require.resolve("@aidean/shared", { paths: ["e2e/web"] })` → `MODULE_NOT_FOUND`。
- `require.resolve("zod", { paths: ["e2e/web"] })` → `MODULE_NOT_FOUND`（根 node_modules 无 zod；zod 由 pnpm 置于 `.pnpm` 并经 `packages/shared/node_modules/zod` 链接）。

## 「允许修改」范围约束
TASK-005 允许修改仅 `e2e/web/walking-skeleton.spec.ts` + `EVD-005/**`；**禁止**修改
`playwright.config.ts` / `tsconfig*.json`（加 `paths` 别名）或 `apps/**`、`packages/**`。
故无法在不越界的前提下让裸包名在根解析生效。

## 采用的等价方案
在 spec 内以**相对源码路径**直接导入同一 `packages/shared` 源文件：
```ts
import { ErrorBodySchema } from "../../packages/shared/src/errors";
import { SystemReadySchema } from "../../packages/shared/src/schemas/system.schema";
```
- 两个源文件各自仅 `import { z } from "zod"`；Playwright 的 TS 加载器会转译被导入的 `.ts`，
  并从 `packages/shared/node_modules/zod` 解析 `zod` → 解析成功（实跑 3 passed 佐证）。
- 语义与裸包名导入完全一致（同一唯一源、同一 zod 校验规则），仅解析入口不同。
- 未新增依赖、未改动任何 `packages/**` 或 `apps/**` 文件。

## 结论
`已确认`：负例/正例两条实跑证明该导入方式在真实 Playwright 运行时可解析、可断言。
裸包名方式在当前 monorepo（根无 workspace 链接 + 冻结配置不可改）下 `证据不足`/不可行，
已以等价相对导入替代并全程留痕；若后续 TASK 允许调整根配置，可平滑切回 `@aidean/shared` 裸导入。
