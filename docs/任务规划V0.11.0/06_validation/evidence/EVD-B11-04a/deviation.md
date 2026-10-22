EVD-B11-04a · deviation.md
==========================
> 版本: v1.0 | 更新: 2026-10-22 | 变更: 首建（B11-04a Select/Textarea/Label 三原语偏差记录）

## 一、设计与任务书的偏离

### 1.1 `Select.size` Omit 原生 `size`
- 任务书 verbatim：「Select / Textarea / Label ... API 风格与现有原语一致（forwardRef、variants、htmlFor、aria-invalid、disabled）」
- 实际：`SelectHTMLAttributes<HTMLSelectElement>` 原生已带 `size?: number`（多选可见行数），与卡片 §B.2.1 验收①「同 Button 基线」暗含的 scale 变体（sm/md/lg）名字冲突 → 类型编译报 `TS2430`
- 处理：`Omit<SelectHTMLAttributes<HTMLSelectElement>, "size">` 让位 scale 三档；沿用 shadcn/ui 官方 Select 惯例（其原生 size 极少使用，`multiple` 场景靠 className 覆写高度即可）
- 依据：Button 已有 `size?: "sm"|"md"|"lg"` scale 契约；命名一致性优先
- 风险：迁移方若确需 `<select size={5}>`，需改 `multiple` + className 显式高度；本轮 admin 表单 50 处原生 `<select>` 无一使用 `size` 属性（见 `02_事实基线` 与 §B.2.2 待迁清单），故不构成回归

### 1.2 单测运行环境：node + react-dom/server（非 jsdom）
- 任务书：「新建 `packages/ui/src/lib/__tests__/` 下对应单测」；卡片 §B.2.1 验收②「覆盖四条」
- 实际：工作区**无** jsdom、**无** @testing-library/react、vitest.config environment=node；apps/web 侧 vitest 也从未测过 React 组件
- 处理：用 `react-dom/server.renderToStaticMarkup`（React 18 内置、无新依赖）产出 HTML 字符串做类名/属性断言；ref 透传用 `createElement(Comp,{ref})` 检 `el.ref===ref` + `Comp.$$typeof===Symbol.for("react.forward_ref")` 结构断言（SSR 不调用 ref，只能做结构验证）
- 依据：零新增依赖是硬约束（改 lockfile 需先经用户同意）
- 局限：**未覆盖「浏览器挂载后 ref.current 指向 DOM」**——若 Hark 评审认为需要真实挂载验证，需引入 jsdom + @testing-library/react，本卡标为「待确认」

### 1.3 spec 命名 `.spec.tsx`
- 任务书 verbatim 未指定后缀；卡片 §B.2.1 只说「单测」
- 实际：因组件源码是 `.tsx` 且测试内使用 JSX-free 但需 tsx 编译入口（vitest include 需扩 `.spec.tsx`）
- 处理：`packages/ui/vitest.config.ts` 加 `esbuild.jsx = "automatic"` + `include: [..., "src/**/*.spec.tsx"]`（对齐 apps/web/vitest.config.ts 同源方案）
- 副作用：`spec-count` 事实断言 glob 仅扫 `apps/web` + `e2e` 且只匹配 `.endsWith(".spec.ts")`，packages 路径不在扫描域、`.tsx` 后缀也不命中，故 spec-count 保持 205 无需 R10-01 同步

## 二、执行过程中的返工

### 2.1 select.spec.tsx ② 首轮 FAIL
- 现象：`expect(html).toContain("<option value=\"a\">A</option>")` 失败，Received 显示 `<option value="a" selected="">A</option>`
- 根因：`createElement(Select, { defaultValue: "a" })` 让 React 给匹配 `<option>` 加 `selected=""` 属性 → 精确字符串匹配不上
- 处理：去掉 `defaultValue`（本用例断言基线类与子节点渲染，不需要受控值）；一次修好，未触发「两次以上停下」铁律
- 收敛教训：`renderToStaticMarkup` 输出受 React 内部规范化影响（如 `defaultValue` 的 selected 落标），断言应锚定「基线类 / 属性存在」而非「精确 HTML」

## 三、观察项（非本卡范畴，只登记）

### 3.1 独立克隆首次配置成本
- 现象：`pnpm gates` 首轮 prisma-check FAIL — `apps/web/.env` 是 gitignored，新克隆不带
- 处理：从主克隆 `E:/Code/Aidean/apps/web/.env` 与 `.env.local` 本地拷贝；`.gitignore` 已排除，`git status` 未出现
- 建议：`Aidean-ui`（甲）与 `Aidean-data`（乙）两个工作克隆后续可加 `pnpm run bootstrap-env` 脚本，从 `.env.example` 生成本地占位；本卡不改

### 3.2 组件命名冲突预警
- `Select`：全仓 grep 显示当前 apps/web 有本地文件 `apps/web/components/console/ChannelsPanel.tsx` 等含 `<select>` 原生标签但**未**导入 `@aidean/ui` 的 `Select`（因为原本不存在）；B11-04b 迁移时新增 import 后需注意命名遮蔽（若有局部变量 `Select`）
- `Label` / `Textarea`：同上
- 建议：B11-04b 迁移在每个热区文件 grep 一次 `const Select` / `function Label` 命名冲突，或在 import 处使用 `Select as UISelect` 别名

### 3.3 遗留 model-change-log.ts:6 doc 注释
- B11-09 deviation.md 已记：`apps/web/lib/features/admin/model-change-log.ts:6` doc 注释仍写 `writers/index.ts`（非代码 import，不在白名单）
- 用户 2026-10-22 消息：「收尾：顺手修 model-change-log.ts:6 注释里的旧 `writers/index.ts`」→ 已在 30_分工 v0.3 §零 L29 列入甲队列第 4 项（B11-05 之后），本卡不动

## 四、未验证项（一律标「待确认」）

1. 浏览器挂载 ref 有效性（需 jsdom + @testing-library/react）：待确认
2. `aria-invalid="true"` 对屏幕阅读器的实际播报效果：待确认（需运行态+辅助工具）
3. Tailwind JIT 在生产环境是否把 `focus-visible:ring-2` 编入 CSS bundle：待确认（需 `next build` 产物 grep；本卡不涉 build）
4. `peer-disabled` 变体在 admin 现有页面与 `<Input disabled>` 兄弟节点组合下是否如预期生效：待确认（需 B11-04b 迁移后视觉截图）
5. 与 shadcn/ui 官方同名组件的 API 兼容度（若未来引入 shadcn 官方件替换本占位简化版）：待确认（当前无该计划）

## 五、提交面

- 工作树脏文件（本卡）：
  - M `packages/ui/src/index.ts`
  - M `packages/ui/vitest.config.ts`
  - ?? `packages/ui/src/components/ui/select.tsx`
  - ?? `packages/ui/src/components/ui/textarea.tsx`
  - ?? `packages/ui/src/components/ui/label.tsx`
  - ?? `packages/ui/src/lib/__tests__/select.spec.tsx`
  - ?? `packages/ui/src/lib/__tests__/textarea.spec.tsx`
  - ?? `packages/ui/src/lib/__tests__/label.spec.tsx`
  - ?? `docs/任务规划V0.11.0/06_validation/evidence/EVD-B11-04a/verify.txt`
  - ?? `docs/任务规划V0.11.0/06_validation/evidence/EVD-B11-04a/deviation.md`
- 排除面：`pnpm-lock.yaml`（未变）、`node_modules/**`、`apps/web/.env*`（gitignored）、`.turbo/`、`.next/`
- 提交消息前缀：`B11-04a:`（per 用户任务书 verbatim「提交信息以卡号开头」）

## 六、推送面（长期规则）

- 目标：仅 `nevermeetagain/Aidean` 的 `main`（per 用户 verbatim + 30_分工 §一 L49）
- **绝不推送** `aideanew/Aidean.git`（远端 SSH 别名 `aideanew` 保留但不 push）
- 每次 push 前先 `git pull --rebase`（本卡已在 clone 完成后 pull 至 1d6828e，push 时再 pull 一次）
- PAT 使用一次性内嵌 URL，命令输出经正则 `github_pat_[A-Za-z0-9_]+ → github_pat_****` 遮蔽；不写入 `~/.gitconfig` / `.git/config` / credential manager / 记忆
- 遇 403 立即停手报告用户，不擅自处理凭据（30_分工 §零 L23）
