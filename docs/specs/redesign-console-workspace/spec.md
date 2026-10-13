# 控制台工作区化重构 Spec

> change-id: `redesign-console-workspace` | 语言: 中文 | 版本: v1.1 | 创建: 2026-09-17 | 更新: 2026-09-17

> 批准记录：用户 2026-09-17 明确提出三项诉求（标题栏不统一、板块过多需长滚动、要求点击切换功能板块且专业/通用切换置最右侧），本规格按该指示实施，属用户直接授权的样式与信息架构调整；业务接口与数据流零变更。继承 [开发流程](../../governance/开发流程.md) 四层级与六字段规范。

---

## 为什么（Why）

当前 `/user/console` 将配置、额度、双密钥、调用测试台全部纵向堆叠（page.tsx:100-203），用户需长滚动定位功能；页头为裸面包屑 + H1，与其他采用 PagePlaceholder 产品化页头的页面（about/docs/pricing 等）风格不一致；通用版/专业版切换器（GeneralForm.tsx:253-289）位于左上，切换感知弱。

## 变更清单（What Changes）

- 控制台页头改用 `PagePlaceholder` 产品化页头（面包屑胶囊 + 主色竖条 + 大标题），与全站统一。
- 新增 `ConsoleWorkspace` 客户端组件：五个功能标签（模型配置 / 免费额度 / 平台密钥 / 自有密钥 / 调用测试台）点击切换，一次聚焦一个工作区，消除长滚动。
- 标签栏最右侧为「通用版 / 专业版」分段切换（保留 `data-testid="console-mode-switch"`、`aria-pressed`、consoleStore 持久化 key 与语义；位于「模型配置」标签页内，作为该页工具栏右侧元素）。
- 五个工作区全部保持挂载（`hidden` 切换），保留 GeneralForm 草稿、ProPrioritiesList 草稿、CallPlayground 状态；业务组件与 API 调用零改动。
- `loading.tsx` 同步新结构骨架。
- **BREAKING（视觉/信息架构）**：原纵向层序取消，锚点/截图基线需按新结构更新；旧 DOM 层序（middle 槽位复刻）废弃，归档于本 spec 记录，无代码删除以外的迁移。

## 影响面（Impact）

- Affected specs: `establish-dev-workflow`（流程继承）；无其他受影响规格。
- Affected code:
  - 新建：`apps/web/components/console/ConsoleWorkspace.tsx`
  - 修改：`apps/web/app/(site)/user/console/page.tsx`、`apps/web/app/(site)/user/console/loading.tsx`、`apps/web/components/console/GeneralForm.tsx`（仅移除旧 Switcher 导出，GeneralForm 本体不动）
  - 文档：`docs/product/design/界面交互文档.md`、`docs/governance/目录结构文档.md`、`docs/文档索引.md`

## ADDED Requirements

### Requirement: 控制台页头与全站一致

控制台页面 SHALL 使用与其他一级页面一致的 `PagePlaceholder` 页头壳（面包屑胶囊、主色竖条标题锚点、描述文案），且 SHALL 保留既有服务端取数逻辑与守卫语义不变。

#### Scenario: 访客风格一致性

- **WHEN** 用户访问 `/user/console`
- **THEN** 页面顶部呈现与其他页面同构的页头卡（竖条 + 大标题「控制台」），原裸面包屑 + 纯 H1 不再出现。

### Requirement: 功能板块点击切换

控制台 SHALL 以标签点击方式切换五个功能板块（模型配置/免费额度/平台密钥/自有密钥/调用测试台），同屏仅呈现当前板块；切换 SHALL 不卸载其余板块（`hidden` 隐藏），以保留各表单草稿与调用台状态；默认激活「模型配置」。

#### Scenario: 点击切换不丢草稿

- **WHEN** 用户在专业版优先级中修改未保存数值后点击「免费额度」再点击「模型配置」
- **THEN** 未保存草稿仍保留显示；页面未重新发起数据请求。

#### Scenario: 深链与刷新

- **WHEN** 用户带 `?tab=playground` 参数或刷新当前页
- **THEN** 服务端忽略该参数，客户端挂载后按 URL hash/查询同步激活对应标签；无参数时默认「模型配置」。

### Requirement: 版本切换右置

「通用版 / 专业版」分段切换 SHALL 位于「模型配置」工作区标题行最右侧，语义（role=group、aria-pressed、持久化）保持不变；非模型配置标签页不展示该切换器。

#### Scenario: 右侧切换

- **WHEN** 用户进入「模型配置」标签
- **THEN** 标签页标题行右端出现分段控件，点击「专业版」后配置区切换为优先级编辑，localStorage `aidean-console-mode` 同步为 pro；切到其他标签再回来，选择保持。

## 非目标

- 不修改任何 API、store 持久化结构、CoreInfoCard/FlowGradient 特效、e2e 既有选择器（`console-call-section`、`balance-entry` 等保留）。
- 不引入 `@aidean/ui` 依赖；tabs 原语在本组件内自实现（含 roving tabindex 键盘导航）。
