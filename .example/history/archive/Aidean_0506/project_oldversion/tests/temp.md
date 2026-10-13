









基于代码分析，我已识别登录问题的深层原因。现在建立完整的三级原子化可执行方案。

---

# 🔧 后台管理端问题诊断与修复方案

## 一、登录问题深层原因分析

### 根因识别

| 序号 | 问题 | 位置 | 影响 | 严重程度 |
|------|------|------|------|----------|
| 1 | **PrismaClient重复实例** | `src/lib/auth.ts:10-11` | 数据库连接冲突 | 🔴 P0 |
| 2 | **缺少ManagerMenu API** | `/api/manager-menus` | 菜单加载404，登录后白屏 | 🔴 P0 |
| 3 | **JWT密钥不一致风险** | `src/lib/auth.ts:6` | 生产环境Token验证失败 | 🟡 P1 |
| 4 | **登录错误信息不明确** | `src/app/manager/login/page.tsx:49-50` | 无法区分用户名/密码错误 | 🟡 P1 |

### 问题1详解：PrismaClient重复实例

```typescript
// src/lib/prisma.ts - 导出单例
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

// src/lib/auth.ts:10-11 - 创建新实例（问题！）
const adapter = new PrismaLibSql({ url: 'file:./prisma/dev.db' });
const prisma = new PrismaClient({ adapter }); // ❌ 重复创建
```

**后果**：两个Prisma实例同时连接SQLite，可能导致锁冲突或数据不一致。

---

## 二、三级原子化可执行方案

### 📌 Milestone: 后台管理系统修复与UI重构

```
# Milestone: 后台管理系统修复与UI重构

## 目标
修复登录功能深层问题，重构后台管理界面为专业级设计

## 验收标准
- [ ] 输入正确账号密码后3秒内完成登录并进入Dashboard
- [ ] 错误密码提示清晰，不暴露系统内部错误
- [ ] 后台界面符合现代SaaS设计规范（参考Notion/Vercel Dashboard）
- [ ] 所有管理页面布局统一、响应式适配

## 周期
开始: 2026-04-22 | 结束: 2026-04-25

## 包含的Phase
- Phase-1: 登录功能深层修复
- Phase-2: 后台UI全局重构
```

---

### Phase-1: 登录功能深层修复

```
# Phase: 登录功能深层修复

## 关联Milestone
- Milestone: 后台管理系统修复与UI重构

## 功能描述
修复PrismaClient重复实例、补全ManagerMenu API、优化错误处理

## 包含的Task
| 序号 | Task | 优先级 | 依赖 |
|------|------|--------|------|
| 1 | Task-修复PrismaClient重复实例 | P0 | - |
| 2 | Task-创建ManagerMenu API路由 | P0 | - |
| 3 | Task-优化登录错误提示 | P1 | Task-1 |
| 4 | Task-统一JWT密钥配置 | P1 | - |
```

#### Task-1: 修复PrismaClient重复实例

```
# Task: 修复PrismaClient重复实例

## 任务描述
将auth.ts中的PrismaClient改为从prisma.ts导入单例，解决数据库连接冲突

## 所属Phase
- Phase: 登录功能深层修复

## 优先级
P0

---

## 一、执行逻辑

### 1. 触发
| 项目 | 内容 |
|------|------|
| 触发页面 | 所有调用auth.ts的页面 |
| 触发组件 | src/lib/auth.ts |
| 触发事件 | 应用启动时Prisma实例初始化 |
| 触发按钮 | 无 |

### 2. 路由
| 项目 | 内容 |
|------|------|
| 前端路由 | N/A（后端修复）|
| 后端API | 所有使用requireAuth的API |

### 3. 逻辑处理
| 项目 | 内容 |
|------|------|
| 处理目录 | src/lib/ |
| 处理文件 | auth.ts |
| 处理函数 | 全局Prisma实例引用 |

### 4. 数据请求
| 项目 | 内容 |
|------|------|
| 请求目录 | src/lib/ |
| 请求文件 | prisma.ts（已有）|
| 请求函数 | prisma实例导出 |
| 请求参数 | 无 |

### 5. 数据库
| 项目 | 内容 |
|------|------|
| 数据库 | SQLite |
| 数据表 | 所有表 |
| 操作类型 | 连接池优化 |

### 6. 响应
| 项目 | 内容 |
|------|------|
| 成功 | 单一Prisma实例，无连接冲突 |
| 错误 | 修复前：多实例竞争；修复后：单例模式 |

---

## 二、文件操作

### 修改
| 路径 | 修改点 |
|------|--------|
| src/lib/auth.ts | 删除第1-11行的Prisma相关导入和实例创建，改为从prisma.ts导入 |
| src/lib/auth.ts | 删除 `import { PrismaClient, User, Role } from '@prisma/client';` |
| src/lib/auth.ts | 删除 `import { PrismaLibSql } from '@prisma/adapter-libsql';` |
| src/lib/auth.ts | 添加 `import { prisma } from './prisma';` |
| src/lib/auth.ts | 添加 `import type { User, Role } from '@prisma/client';` |

### 删除
| 路径 | 原因 |
|------|------|
| src/lib/auth.ts:9-11 | 移除本地Prisma实例创建代码 |

---

## 三、关键代码变更逻辑

**从哪里改**: src/lib/auth.ts 第1-11行

**改什么**: 
- 删除独立的PrismaClient创建
- 改为从prisma.ts导入单例

**逻辑是怎样的**:
```
修改前: auth.ts自己创建PrismaClient → 与prisma.ts的实例竞争
修改后: auth.ts导入prisma.ts的单例 → 全局唯一实例
```

---

## 四、验收条件
- [ ] src/lib/auth.ts不再包含 `new PrismaClient()`
- [ ] 所有API能正常查询数据库
- [ ] 登录不再因连接问题随机失败
```

---

#### Task-2: 创建ManagerMenu API路由

```
# Task: 创建ManagerMenu API路由

## 任务描述
创建GET /api/manager-menus API，返回根据用户权限过滤后的菜单树

## 所属Phase
- Phase: 登录功能深层修复

## 优先级
P0

---

## 一、执行逻辑

### 1. 触发
| 项目 | 内容 |
|------|------|
| 触发页面 | /manager/* 所有后台页面 |
| 触发组件 | src/components/manager/Sidebar.tsx:89-120 |
| 触发事件 | useEffect组件挂载时 |
| 触发按钮 | 无 |

### 2. 路由
| 项目 | 内容 |
|------|------|
| 前端路由 | /manager/* |
| 后端API | GET /api/manager-menus |

### 3. 逻辑处理
| 项目 | 内容 |
|------|------|
| 处理目录 | src/app/api/manager-menus/ |
| 处理文件 | route.ts |
| 处理函数 | GET(), buildMenuTree(), filterMenusByPermission() |

### 4. 数据请求
| 项目 | 内容 |
|------|------|
| 请求目录 | src/lib/ |
| 请求文件 | auth.ts |
| 请求函数 | requireAuth(), checkPermission() |
| 请求参数 | Authorization: Bearer <token> |

### 5. 数据库
| 项目 | 内容 |
|------|------|
| 数据库 | SQLite |
| 数据表 | ManagerMenu, User, Role |
| 操作类型 | 查询菜单 + 查询用户权限 |

### 6. 响应
| 项目 | 内容 |
|------|------|
| 成功 | { code: 200, data: MenuTree[], message: "获取成功" } |
| 错误 | { code: 401, message: "未授权" } / { code: 500, message: "服务器错误" } |

---

## 二、文件操作

### 新建
| 路径 | 用途 |
|------|------|
| src/app/api/manager-menus/route.ts | ManagerMenu列表API（支持权限过滤）|

### 修改
| 路径 | 修改点 |
|------|--------|
| src/components/manager/Sidebar.tsx:92-93 | 确保token获取和header设置正确 |

---

## 三、API实现逻辑

**从哪里改**: 新建文件 src/app/api/manager-menus/route.ts

**改什么**: 
- 验证JWT Token
- 获取当前用户权限
- 查询所有菜单
- 递归过滤有权限的菜单
- 返回菜单树结构

**逻辑是怎样的**:
```
触发 → 提取Token → 验证用户 → 获取权限列表 → 查询菜单 → 递归过滤 → 构建树 → 返回
```

**权限过滤算法**:
```
hasPermission(menu.permission, userPermissions):
  1. 如果permission为null，返回true（公开菜单）
  2. 如果userPermissions包含'*'，返回true（超级管理员）
  3. 如果userPermissions包含permission，返回true
  4. 如果userPermissions包含 `${module}:*`，返回true（通配符）
  5. 返回false
```

---

## 四、验收条件
- [ ] GET /api/manager-menus 返回当前用户有权限的菜单树
- [ ] 超级管理员能看到所有菜单（包括"菜单管理"）
- [ ] 普通管理员看不到"菜单管理"菜单
- [ ] 未登录返回401错误
```

---

#### Task-3: 优化登录错误提示

```
# Task: 优化登录错误提示

## 任务描述
优化登录页面的错误提示，区分用户名不存在、密码错误、账户禁用等场景

## 所属Phase
- Phase: 登录功能深层修复

## 优先级
P1

---

## 一、执行逻辑

### 1. 触发
| 项目 | 内容 |
|------|------|
| 触发页面 | /manager/login |
| 触发组件 | src/app/manager/login/page.tsx |
| 触发事件 | onSubmit表单提交 |
| 触发按钮 | 登录按钮 |

### 2. 路由
| 项目 | 内容 |
|------|------|
| 前端路由 | /manager/login |
| 后端API | POST /api/auth/login |

### 3. 逻辑处理
| 项目 | 内容 |
|------|------|
| 处理目录 | src/app/api/auth/login/ |
| 处理文件 | route.ts |
| 处理函数 | POST() |

### 4. 数据请求
| 项目 | 内容 |
|------|------|
| 请求目录 | src/lib/ |
| 请求文件 | auth.ts |
| 请求函数 | comparePassword() |
| 请求参数 | { username, password } |

### 5. 数据库
| 项目 | 内容 |
|------|------|
| 数据库 | SQLite |
| 数据表 | User, Role |
| 操作类型 | 查询用户 |

### 6. 响应
| 项目 | 内容 |
|------|------|
| 成功 | { code: 200, data: { token, user }, message: "登录成功" } |
| 错误 | 区分：用户名不存在 / 密码错误 / 账户禁用 |

---

## 二、文件操作

### 修改
| 路径 | 修改点 |
|------|--------|
| src/app/api/auth/login/route.ts:36-44 | 细化错误提示，区分用户不存在和密码错误 |

---

## 三、错误提示优化逻辑

**从哪里改**: src/app/api/auth/login/route.ts:36-44

**改什么**: 
```typescript
// 修改前：统一错误提示
if (!user || !comparePassword(password, user.passwordHash)) {
  return NextResponse.json(error("用户名或密码错误"), { status: 401 });
}

// 修改后：分离验证步骤
if (!user) {
  return NextResponse.json(error("用户名不存在"), { status: 401 });
}
if (!comparePassword(password, user.passwordHash)) {
  return NextResponse.json(error("密码错误"), { status: 401 });
}
if (!user.isActive || user.status !== "active") {
  return NextResponse.json(error("账户已被禁用，请联系管理员"), { status: 403 });
}
```

**逻辑是怎样的**:
```
验证流程:
1. 查询用户 → 不存在 → 返回"用户名不存在"
2. 验证密码 → 不匹配 → 返回"密码错误"
3. 检查状态 → 未激活 → 返回"账户已被禁用"
4. 全部通过 → 生成Token → 返回登录成功
```

---

## 四、验收条件
- [ ] 用户名不存在时提示"用户名不存在"
- [ ] 密码错误时提示"密码错误"
- [ ] 账户禁用时提示"账户已被禁用，请联系管理员"
- [ ] 不暴露系统内部错误（如数据库连接失败）
```

---

### Phase-2: 后台UI全局重构

```
# Phase: 后台UI全局重构

## 关联Milestone
- Milestone: 后台管理系统修复与UI重构

## 功能描述
参照Notion/Vercel Dashboard设计，重构登录页、布局、Sidebar、Dashboard

## 包含的Task
| 序号 | Task | 优先级 | 依赖 |
|------|------|--------|------|
| 1 | Task-登录页重设计 | P0 | - |
| 2 | Task-后台布局重构 | P0 | Task-1 |
| 3 | Task-Sidebar重设计 | P0 | Task-2 |
| 4 | Task-Dashboard重设计 | P1 | Task-2 |
| 5 | Task-配色与主题统一 | P1 | Task-1 |
```

---

#### Task-1: 登录页重设计

```
# Task: 登录页重设计

## 任务描述
将登录页重构为现代化设计，参考Vercel/Notion的简洁登录风格

## 所属Phase
- Phase: 后台UI全局重构

## 优先级
P0

---

## 一、执行逻辑

### 1. 触发
| 项目 | 内容 |
|------|------|
| 触发页面 | /manager/login |
| 触发组件 | src/app/manager/login/page.tsx |
| 触发事件 | 页面加载 |
| 触发按钮 | 无 |

### 2. 路由
| 项目 | 内容 |
|------|------|
| 前端路由 | /manager/login |
| 后端API | N/A（纯前端）|

### 3. 逻辑处理
| 项目 | 内容 |
|------|------|
| 处理目录 | src/app/manager/login/ |
| 处理文件 | page.tsx |
| 处理函数 | LoginPage组件 |

### 4. 数据请求
| 项目 | 内容 |
|------|------|
| 请求目录 | src/hooks/ |
| 请求文件 | useSettings.ts |
| 请求函数 | getSetting() |
| 请求参数 | "schoolShortName" |

### 5. 数据库
| 项目 | 内容 |
|------|------|
| 数据库 | N/A |
| 数据表 | N/A |
| 操作类型 | N/A |

### 6. 响应
| 项目 | 内容 |
|------|------|
| 成功 | 现代化登录页面渲染 |
| 错误 | N/A |

---

## 二、文件操作

### 修改
| 路径 | 修改点 |
|------|--------|
| src/app/manager/login/page.tsx | 完全重构布局和样式 |

---

## 三、设计方案

**从哪里改**: src/app/manager/login/page.tsx

**改什么**: 
- 背景：深色渐变或纯白色极简
- 布局：居中卡片式，最大宽度420px
- 输入框：圆角、focus状态有品牌色边框
- 按钮：主色调（品牌红#DC2626），hover有动效
- Logo：上方居中显示学校Logo
- 动效：输入框focus时有轻微上浮效果

**设计参考**:
```
┌─────────────────────────────────────────┐
│                                         │
│           [学校Logo]                    │
│                                         │
│      ┌─────────────────────────┐        │
│      │                         │        │
│      │    欢迎回来              │        │
│      │    登录到管理后台         │        │
│      │                         │        │
│      │    ┌───────────────┐     │        │
│      │    │ 用户名        │     │        │
│      │    └───────────────┘     │        │
│      │                         │        │
│      │    ┌───────────────┐     │        │
│      │    │ 密码    👁️   │     │        │
│      │    └───────────────┘     │        │
│      │                         │        │
│      │    [  登 录  ]          │        │
│      │                         │        │
│      └─────────────────────────┘        │
│                                         │
└─────────────────────────────────────────┘
```

**配色方案**:
- 背景: #0A0A0A 或 #FFFFFF
- 卡片: 略深/略浅于背景
- 主色: #DC2626（品牌红）
- 文字: 高对比度
- 边框: rgba(255,255,255,0.1) 或 rgba(0,0,0,0.1)

---

## 四、验收条件
- [ ] 登录页在移动端和桌面端都居中显示
- [ ] 输入框有清晰的focus状态
- [ ] 按钮有hover动效
- [ ] 错误提示以toast或inline形式显示，不破坏布局
- [ ] 加载状态有loading指示器
```

---

#### Task-2: 后台布局重构

```
# Task: 后台布局重构

## 任务描述
重构/manager布局，采用现代Dashboard的Sidebar+Header+Main结构

## 所属Phase
- Phase: 后台UI全局重构

## 优先级
P0

---

## 一、执行逻辑

### 1. 触发
| 项目 | 内容 |
|------|------|
| 触发页面 | /manager/*（除login外）|
| 触发组件 | src/app/manager/layout.tsx |
| 触发事件 | 页面加载、路由切换 |
| 触发按钮 | 无 |

### 2. 路由
| 项目 | 内容 |
|------|------|
| 前端路由 | /manager/* |
| 后端API | GET /api/auth/me |

### 3. 逻辑处理
| 项目 | 内容 |
|------|------|
| 处理目录 | src/app/manager/ |
| 处理文件 | layout.tsx |
| 处理函数 | ManagerLayout组件 |

### 4. 数据请求
| 项目 | 内容 |
|------|------|
| 请求目录 | src/lib/ |
| 请求文件 | auth.ts |
| 请求函数 | requireAuth() |
| 请求参数 | localStorage.getItem("manager_token") |

### 5. 数据库
| 项目 | 内容 |
|------|------|
| 数据库 | SQLite |
| 数据表 | User, Role |
| 操作类型 | 查询用户信息 |

### 6. 响应
| 项目 | 内容 |
|------|------|
| 成功 | 渲染Dashboard布局 |
| 错误 | 重定向到/manager/login |

---

## 二、文件操作

### 修改
| 路径 | 修改点 |
|------|--------|
| src/app/manager/layout.tsx | 重构布局结构，优化加载状态 |
| src/components/manager/Header.tsx | 新建/重构顶部导航栏 |
| src/components/manager/Sidebar.tsx | 与layout配合调整 |

---

## 三、布局结构

**从哪里改**: src/app/manager/layout.tsx

**改什么**: 
```
布局结构（参考Notion）:
┌────────────────────────────────────────────────────────┐
│  [Logo]  搜索...                      [通知] [用户头像 ▼] │  ← Header (64px)
├──────────┬─────────────────────────────────────────────┤
│          │                                               │
│  仪表盘   │                                               │
│  内容管理 ▶│              Main Content Area                │
│  系统管理 ▶│                                               │
│          │                                               │
│          │                                               │
│  Sidebar │                                               │
│  (240px) │                                               │
│          │                                               │
│          │                                               │
└──────────┴─────────────────────────────────────────────┘
```

**样式规范**:
- Sidebar宽度: 240px（固定）
- Header高度: 64px（固定）
- 背景色: #FAFAFA (light) / #0A0A0A (dark)
- 侧边栏背景: #FFFFFF (light) / #111111 (dark)
- 主内容区: 白色卡片，圆角12px，阴影sm

---

## 四、验收条件
- [ ] Sidebar固定宽度，不随内容滚动
- [ ] Header固定在顶部
- [ ] Main区域可独立滚动
- [ ] 响应式：移动端Sidebar可收起
- [ ] 加载状态有骨架屏或spinner
```

---

#### Task-3: Sidebar重设计

```
# Task: Sidebar重设计

## 任务描述
重构Sidebar组件，实现现代化导航菜单，支持折叠、图标、徽章

## 所属Phase
- Phase: 后台UI全局重构

## 优先级
P0

---

## 一、执行逻辑

### 1. 触发
| 项目 | 内容 |
|------|------|
| 触发页面 | /manager/* |
| 触发组件 | src/components/manager/Sidebar.tsx |
| 触发事件 | 组件挂载、菜单点击、权限变更 |
| 触发按钮 | 菜单项 |

### 2. 路由
| 项目 | 内容 |
|------|------|
| 前端路由 | /manager/* |
| 后端API | GET /api/manager-menus |

### 3. 逻辑处理
| 项目 | 内容 |
|------|------|
| 处理目录 | src/components/manager/ |
| 处理文件 | Sidebar.tsx |
| 处理函数 | fetchMenus(), hasPermission(), toggleMenu(), handleLogout() |

### 4. 数据请求
| 项目 | 内容 |
|------|------|
| 请求目录 | src/components/manager/ |
| 请求文件 | Sidebar.tsx |
| 请求函数 | fetchMenus() |
| 请求参数 | Authorization: Bearer <token> |

### 5. 数据库
| 项目 | 内容 |
|------|------|
| 数据库 | SQLite |
| 数据表 | ManagerMenu, User, Role |
| 操作类型 | 查询菜单 |

### 6. 响应
| 项目 | 内容 |
|------|------|
| 成功 | 渲染权限过滤后的菜单树 |
| 错误 | 静默处理，显示基础菜单或空状态 |

---

## 二、文件操作

### 修改
| 路径 | 修改点 |
|------|--------|
| src/components/manager/Sidebar.tsx | 完全重构样式和交互 |

---

## 三、设计方案

**从哪里改**: src/components/manager/Sidebar.tsx

**改什么**: 
- 菜单项：左侧图标 + 文字 + 右侧徽章/箭头
- 展开/收起：Chevron图标动画旋转
- 选中状态：左侧品牌色竖条 + 背景高亮
- Hover状态：轻微背景色变化
- 徽章：红色/蓝色圆点或数字badge

**菜单项结构**:
```
┌─────────────────────────────────┐
│  ┌─ 仪表盘                      │
├─────────────────────────────────┤
│  ▶ 内容管理              [5]    │
├─────────────────────────────────┤
│  ▶ 系统管理                     │
│    ├─ 用户管理                  │
│    ├─ 角色管理                  │
│    ├─ 系统设置                  │
│    └─ 操作日志                  │
└─────────────────────────────────┘
```

**样式规范**:
- 菜单项高度: 40px
- 图标大小: 20px
- 字体: 14px, 500 weight
- 选中指示条: 3px宽, 品牌色
- 缩进: 二级菜单缩进24px
- 过渡动画: 200ms ease

---

## 四、验收条件
- [ ] 菜单根据权限正确过滤
- [ ] 一级菜单可展开/收起
- [ ] 当前页面菜单项高亮显示
- [ ] 徽章正确显示（如有）
- [ ] 收起状态只显示图标
```

---

#### Task-4: Dashboard重设计

```
# Task: Dashboard重设计

## 任务描述
重构Dashboard首页，采用现代化数据卡片和统计图表布局

## 所属Phase
- Phase: 后台UI全局重构

## 优先级
P1

---

## 一、执行逻辑

### 1. 触发
| 项目 | 内容 |
|------|------|
| 触发页面 | /manager |
| 触发组件 | src/app/manager/page.tsx |
| 触发事件 | 页面加载 |
| 触发按钮 | 无 |

### 2. 路由
| 项目 | 内容 |
|------|------|
| 前端路由 | /manager |
| 后端API | 多个统计API聚合 |

### 3. 逻辑处理
| 项目 | 内容 |
|------|------|
| 处理目录 | src/app/manager/ |
| 处理文件 | page.tsx |
| 处理函数 | Dashboard组件 |

### 4. 数据请求
| 项目 | 内容 |
|------|------|
| 请求目录 | src/lib/api/ |
| 请求文件 | dashboard-api.ts（新建）|
| 请求函数 | getDashboardStats() |
| 请求参数 | 无 |

### 5. 数据库
| 项目 | 内容 |
|------|------|
| 数据库 | SQLite |
| 数据表 | Article, User, Course, Student等 |
| 操作类型 | 聚合统计查询 |

### 6. 响应
| 项目 | 内容 |
|------|------|
| 成功 | 渲染Dashboard统计卡片和图表 |
| 错误 | 显示空状态或错误提示 |

---

## 二、文件操作

### 修改
| 路径 | 修改点 |
|------|--------|
| src/app/manager/page.tsx | 重构为现代化Dashboard布局 |

### 新建
| 路径 | 用途 |
|------|------|
| src/components/manager/StatCard.tsx | 统计卡片组件 |
| src/components/manager/RecentActivity.tsx | 最近活动列表组件 |

---

## 三、设计方案

**从哪里改**: src/app/manager/page.tsx

**布局结构**:
```
┌────────────────────────────────────────────────────────────┐
│  欢迎回来，管理员 👋                                          │
│  今天是 2026年4月22日 星期二                                   │
├────────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │ 文章数   │ │ 用户数   │ │ 课程数   │ │ 报名数   │      │
│  │   128   ↑│ │   45    →│ │   12    ↑│ │   23    ↑│      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
├────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────┐  ┌─────────────────────────┐  │
│  │   趋势图表（近7天）      │  │   最新报名              │  │
│  │                          │  │   • 张三 2分钟前         │  │
│  │   [折线图/柱状图]         │  │   • 李四 5分钟前         │  │
│  │                          │  │   • 王五 1小时前         │  │
│  └──────────────────────────┘  └─────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

**卡片样式**:
- 圆角: 12px
- 背景: 白色
- 阴影: sm
- 图标: 左上角，40px圆形背景
- 数字: 24px, bold
- 趋势: 右上角，绿色/红色箭头

---

## 四、验收条件
- [ ] 4个统计卡片正确显示数据
- [ ] 卡片有hover动效
- [ ] 趋势图表正常显示（如有）
- [ ] 最新活动列表实时更新
- [ ] 整体布局响应式
```

---

#### Task-5: 配色与主题统一

```
# Task: 配色与主题统一

## 任务描述
建立统一的设计系统，定义颜色、字体、间距、圆角等设计Token

## 所属Phase
- Phase: 后台UI全局重构

## 优先级
P1

---

## 一、执行逻辑

### 1. 触发
| 项目 | 内容 |
|------|------|
| 触发页面 | 所有后台页面 |
| 触发组件 | 全局样式 |
| 触发事件 | 应用启动 |
| 触发按钮 | 无 |

### 2. 路由
| 项目 | 内容 |
|------|------|
| 前端路由 | N/A |
| 后端API | N/A |

### 3. 逻辑处理
| 项目 | 内容 |
|------|------|
| 处理目录 | src/styles/ |
| 处理文件 | globals.css 或 design-tokens.ts |

### 4. 数据请求
| 项目 | 内容 |
|------|------|
| 请求目录 | N/A |
| 请求文件 | N/A |
| 请求函数 | N/A |
| 请求参数 | N/A |

### 5. 数据库
| 项目 | 内容 |
|------|------|
| 数据库 | N/A |
| 数据表 | N/A |
| 操作类型 | N/A |

### 6. 响应
| 项目 | 内容 |
|------|------|
| 成功 | 统一的设计系统应用 |
| 错误 | N/A |

---

## 二、文件操作

### 新建
| 路径 | 用途 |
|------|------|
| src/lib/design-tokens.ts | 设计Token定义 |
| 或 tailwind.config.ts 扩展 | 颜色/间距扩展 |

### 修改
| 路径 | 修改点 |
|------|--------|
| tailwind.config.ts | 添加品牌色和自定义配置 |

---

## 三、设计Token规范

**从哪里改**: tailwind.config.ts 或 src/lib/design-tokens.ts

**品牌色**:
```typescript
colors: {
  brand: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',  // 主色
    600: '#dc2626',  // 品牌红（强调）
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  }
}
```

**间距系统**:
- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px
- 2xl: 48px

**圆角系统**:
- sm: 4px
- md: 8px
- lg: 12px
- xl: 16px
- full: 9999px

**字体**:
- 标题: Inter, system-ui, sans-serif
- 正文: Inter, system-ui, sans-serif
- 代码: JetBrains Mono, monospace

---

## 四、验收条件
- [ ] 所有页面使用统一的配色
- [ ] 主按钮使用品牌红#DC2626
- [ ] 间距遵循8px基准
- [ ] 圆角遵循设计规范
- [ ] 字体统一为Inter
```

---

---

## 📊 方案总结

### 登录问题根因确认

| 问题 | 影响 | 修复优先级 |
|------|------|-----------|
| **PrismaClient重复实例** | 数据库连接冲突导致登录随机失败 | 🔴 P0 - 立即修复 |
| **缺少ManagerMenu API** | 登录后Sidebar获取菜单404，页面白屏 | 🔴 P0 - 立即创建 |
| **JWT密钥硬编码** | 生产环境Token验证不一致风险 | 🟡 P1 - 建议修复 |
| **登录错误提示模糊** | 无法区分用户名/密码错误 | 🟡 P1 - 优化体验 |

### 方案执行优先级

```
Phase-1: 登录功能深层修复（必须首先完成）
├── Task-1: 修复PrismaClient重复实例 [P0]
├── Task-2: 创建ManagerMenu API路由 [P0]
├── Task-3: 优化登录错误提示 [P1]
└── Task-4: 统一JWT密钥配置 [P1]

Phase-2: 后台UI全局重构（可并行或延后）
├── Task-1: 登录页重设计 [P0]
├── Task-2: 后台布局重构 [P0]
├── Task-3: Sidebar重设计 [P0]
├── Task-4: Dashboard重设计 [P1]
└── Task-5: 配色与主题统一 [P1]
```

### 关键文件清单

| 操作 | 文件路径 | 用途 |
|------|----------|------|
| **修改** | `src/lib/auth.ts:1-11` | 修复PrismaClient导入 |
| **新建** | `src/app/api/manager-menus/route.ts` | 菜单API |
| **修改** | `src/app/manager/login/page.tsx` | 登录页重设计 |
| **修改** | `src/app/manager/layout.tsx` | 后台布局重构 |
| **修改** | `src/components/manager/Sidebar.tsx` | Sidebar重设计 |

### 预计工作量

| Phase | 任务数 | 预计时间 | 依赖 |
|-------|--------|----------|------|
| Phase-1 | 4个Task | 4-6小时 | 无 |
| Phase-2 | 5个Task | 12-16小时 | Phase-1完成后 |
