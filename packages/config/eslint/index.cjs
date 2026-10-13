/**
 * Aidean 共享 ESLint 配置（@aidean/config/eslint）
 *
 * 用法示例（消费方 .eslintrc.cjs）：
 *   const base = require('@aidean/config/eslint');
 *   module.exports = { ...base };
 *
 * Next.js 应用建议在安装 eslint-config-next 后自行叠加：
 *   module.exports = { extends: ['next/core-web-vitals'] };
 * 本文件刻意不硬依赖 eslint-config-next，保证任何工作区引入即可用。
 */
/** @type {import('eslint').Linter.Config} */
module.exports = {
  env: {
    browser: true,
    node: true,
    es2022: true,
  },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  ignorePatterns: ['node_modules/', '.next/', 'dist/', 'coverage/', '**/*.d.ts'],
  rules: {},
};
