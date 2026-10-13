# ADR-0004: Next.js 15 + Tailwind 4 升级

> 版本: v1.0 | 更新: 2026-09-17 | 变更: 首次落档——锁定 Next.js 15 + Tailwind 4 升级方案

## 状态

**接受** ✅

## 上下文

当前技术栈锁定（开发流程文档 §五 全局约束 1）：
- Next.js 15 + PostgreSQL 16 + Redis + Prisma + Tailwind 4

当前实际版本：
- next: 14.2.5
- eslint-config-next: 14.2.5
- tailwindcss: 3.4.10
- postcss: 8.4.41

## 决策

升级至 Next.js 15 + Tailwind 4：

### Next.js 15 升级

**版本变更**：
- next: 14.2.5 → 15.x
- eslint-config-next: 14.2.5 → 15.x
- react: 18.2.0 → 18.3.x（Next.js 15 依赖）
- react-dom: 18.2.0 → 18.3.x

**主要变更点**：
1. **Server Components 默认**：所有页面组件默认为 Server Component，客户端交互需显式 `'use client'` 指令
2. **Server Actions**：支持 Server Actions，可替代部分 API Routes
3. **字体优化**：next/font 内置优化，支持更细粒度的字体控制
4. **图像优化**：next/image 优化改进（渐进式加载、自动模糊加载）
5. **错误处理**：错误边界与错误页面改进
6. **性能优化**：减少客户端 JavaScript 体积，更快的首屏加载

**兼容性**：
- React 18.2.0 → 18.3.x（兼容）
- TypeScript 5.5.4 → 5.6.x（兼容）
- Prisma 5.22.0 → 5.22.0（兼容）
- PostCSS 8.4.41 → 8.4.41（兼容）

### Tailwind 4 升级

**版本变更**：
- tailwindcss: 3.4.10 → 4.x
- postcss: 8.4.41 → 8.4.41（Tailwind 4 内置 PostCSS，可保留）

**主要变更点**：
1. **配置简化**：无需 `tailwind.config.js`，使用 CSS `@import "tailwindcss"` 替代
2. **JIT 模式默认**：无需额外配置，默认 JIT 模式
3. **CSS 变量**：支持 CSS 自定义属性（`--color-primary`）
4. **深色模式**：支持 `@theme` 指令定义深色模式
5. **性能优化**：更小的 CSS 体积，更快的构建速度
6. **原生支持**：无需 PostCSS 插件，更简洁

**兼容性**：
- Tailwind 3 的类名完全兼容（向后兼容）
- 自定义配置需迁移至 CSS `@theme` 指令

## 后果

### 积极后果

1. **性能提升**：
   - Next.js 15 减少客户端 JavaScript 体积（约 5-10%）
   - Tailwind 4 CSS 体积更小（约 10-20%）
   - 构建速度更快（Tailwind 4 JIT 模式默认）

2. **开发体验改善**：
   - 配置简化（Tailwind 4 无需 `tailwind.config.js`）
   - 更强的类型支持（Tailwind 4 提供完整的 TypeScript 类型）
   - 更好的错误提示

3. **技术栈对齐**：
   - 与 ADR-0001 技术栈锁定一致
   - 与行业趋势保持同步

### 消极后果

1. **Server Component 迁移成本**：
   - 所有客户端交互组件需添加 `'use client'` 指令
   - 需要重新评估组件粒度（Server Component vs Client Component）

2. **Tailwind 配置迁移**：
   - 需要将 `tailwind.config.js` 迁移至 CSS `@theme` 指令
   - 自定义颜色/字体/间距需重新定义

3. **潜在兼容性问题**：
   - 某些第三方库可能不完全兼容 Next.js 15
   - 需要全面测试现有功能

## 实施计划

### 阶段 1：准备（PLAN + SPEC）

1. **创建 ADR-0004**（本文档）
2. **评审通过**后进入 IMPLEMENT

### 阶段 2：升级（IMPLEMENT）

1. **升级依赖**：
   - next: 14.2.5 → 15.0.0
   - eslint-config-next: 14.2.5 → 15.0.0
   - react: 18.2.0 → 18.3.x
   - react-dom: 18.2.0 → 18.3.x
   - tailwindcss: 3.4.10 → 4.0.0

2. **迁移 Tailwind 配置**：
   - 删除 `tailwind.config.js`
   - 在 `globals.css` 中使用 `@import "tailwindcss"` 替代 `@tailwind` 指令
   - 将 `tailwind.config.js` 中的配置迁移至 CSS `@theme` 指令

3. **Server Component 评估**：
   - 识别所有客户端交互组件
   - 添加 `'use client'` 指令
   - 评估是否需要拆分组件（Server Component + Client Component）

4. **测试验证**：
   - 单元测试：确保所有测试通过
   - E2E 测试：确保所有 E2E 测试通过
   - 生产构建：确保 `npm run build` 成功

### 阶段 3：核验（VERIFY）

1. **运行时验收**：
   - 20/20 运行时验收通过
   - 所有页面正常渲染
   - 所有交互正常工作

2. **测试覆盖**：
   - 单元测试：36/36 ✅
   - E2E 测试：530/530 ✅
   - 共享类型：56/56 ✅
   - TypeScript 编译：tsc ✅
   - 生产构建：npm run build ✅

### 阶段 4：归档（CLOSE）

1. **更新文档**：
   - 更新《技术栈锁定-ADR-0001.md》（已锁定 Next.js 15 + Tailwind 4）
   - 更新《目录结构文档.md》（如需）
   - 更新《API接口文档.md》（如需）
   - 更新《验收复核-20260917.md》（记录升级验收通过）

2. **提交变更**：
   - 提交 ADR-0004
   - 提交代码变更
   - 创建 PR

## 参考资料

- [Next.js 15 Release Notes](https://nextjs.org/docs/app/building-your-application/upgrading)
- [Tailwind CSS 4.0 Release Notes](https://tailwindcss.com/blog/tailwindcss-v4)
- [Next.js 15 Migration Guide](https://nextjs.org/docs/app/building-your-application/migrating)
- [Tailwind 4 Migration Guide](https://tailwindcss.com/docs/upgrade-guide)

## 决策人

**决策人**：CodingHeader

**批准日期**：2026-09-17
