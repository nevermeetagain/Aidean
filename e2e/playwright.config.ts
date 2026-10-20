import path from 'node:path'
import { defineConfig } from '@playwright/test'
import root from '../playwright.config'

// TASK-037（2026-10-20）：唯一配置已收敛到根 playwright.config.ts。
// 本文件仅作旧脚本/守卫的兼容壳，不重复定义 projects；所有相对路径按仓库根绝对化，
// 确保以 `--config e2e/playwright.config.ts` 运行时仍解析到同一批用例。
// 端口锚点（scripts/guard/port-consistency.mjs 读取）：http://localhost:3000
const rootDir = path.resolve(__dirname, '..')

const projects = (root.projects ?? []).map((project) => ({
  ...project,
  ...(project.testDir ? { testDir: path.resolve(rootDir, project.testDir) } : {}),
}))

const globalSetup = Array.isArray(root.globalSetup)
  ? root.globalSetup.map((file) => path.resolve(rootDir, file))
  : root.globalSetup
    ? path.resolve(rootDir, root.globalSetup)
    : undefined

export default defineConfig({
  ...root,
  testDir: path.resolve(rootDir, 'e2e'),
  globalSetup,
  projects,
})
