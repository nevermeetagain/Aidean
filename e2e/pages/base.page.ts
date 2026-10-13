/**
 * Page Object Model - 基类
 * 
 * 执行逻辑：
 * 触发：所有POM子类继承BasePage
 * 路由：通过page.goto()导航
 * 处理：封装常用页面操作（导航/等待/截图/表单填写）
 * 请求：page对象内部处理HTTP
 * 数据库：无直接数据库操作
 * 响应：返回操作结果或元素定位器
 */

import { expect, Page, Locator } from '@playwright/test';

export class BasePage {
  readonly page: Page;
  
  constructor(page: Page) {
    this.page = page;
  }
  
  // ============================================
  // 导航
  // ============================================
  
  /** 导航到指定路径 */
  async goto(path: string) {
    await this.page.goto(path);
    await this.page.waitForLoadState('networkidle');
  }
  
  /** 获取当前URL路径 */
  getCurrentPath(): string {
    return new URL(this.page.url()).pathname;
  }
  
  /** 等待URL包含指定路径 */
  async waitForUrl(path: string) {
    await this.page.waitForURL(`**${path}**`);
  }
  
  // ============================================
  // 等待
  // ============================================
  
  /** 等待页面加载完成 */
  async waitForReady() {
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForLoadState('domcontentloaded');
  }
  
  /** 等待元素可见 */
  async waitForVisible(selector: string) {
    await this.page.locator(selector).waitFor({ state: 'visible' });
  }
  
  /** 等待元素隐藏 */
  async waitForHidden(selector: string) {
    await this.page.locator(selector).waitFor({ state: 'hidden' });
  }
  
  // ============================================
  // 交互
  // ============================================
  
  /** 点击元素 */
  async clickElement(selector: string) {
    await this.page.locator(selector).click();
  }
  
  /** 填写输入框 */
  async fillInput(selector: string, value: string) {
    const input = this.page.locator(selector);
    await input.clear();
    await input.fill(value);
  }
  
  /** 选择下拉选项 */
  async selectOption(selector: string, value: string) {
    await this.page.locator(selector).selectOption(value);
  }
  
  /** 上传文件 */
  async uploadFile(selector: string, filePath: string) {
    await this.page.locator(selector).setInputFiles(filePath);
  }
  
  // ============================================
  // 验证
  // ============================================
  
  /** 验证页面标题包含文本 */
  async verifyTitle(text: string) {
    await expect(this.page).toHaveTitle(new RegExp(text));
  }
  
  /** 验证元素可见 */
  async verifyVisible(selector: string) {
    await expect(this.page.locator(selector)).toBeVisible();
  }
  
  /** 验证元素包含文本 */
  async verifyText(selector: string, text: string) {
    await expect(this.page.locator(selector)).toContainText(text);
  }
  
  /** 验证URL包含路径 */
  async verifyUrl(path: string) {
    await expect(this.page).toHaveURL(new RegExp(path));
  }
  
  // ============================================
  // 截图
  // ============================================
  
  /** 全页截图 */
  async takeScreenshot(name: string) {
    await this.page.screenshot({
      path: `test-results/${name}.png`,
      fullPage: true,
    });
  }
  
  // ============================================
  // Toast/通知
  // ============================================
  
  /** 等待并验证成功Toast */
  async verifySuccessToast(message?: string) {
    const toast = this.page.locator('[data-testid="toast-success"], .toast-success, [role="alert"]').first();
    await toast.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    if (message) {
      await expect(toast).toContainText(message);
    }
  }
  
  /** 等待并验证错误Toast */
  async verifyErrorToast(message?: string) {
    const toast = this.page.locator('[data-testid="toast-error"], .toast-error, [role="alert"]').first();
    await toast.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    if (message) {
      await expect(toast).toContainText(message);
    }
  }
}
