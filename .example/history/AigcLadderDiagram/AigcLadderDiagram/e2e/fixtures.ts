import { test as base, expect, Page } from '@playwright/test';

interface HelperFixtures {
  waitForPageReady: () => Promise<void>;
  apiClient: {
    get: (url: string) => Promise<any>;
    post: (url: string, body: any) => Promise<any>;
    put: (url: string, body: any) => Promise<any>;
    delete: (url: string) => Promise<any>;
  };
}

export const test = base.extend<HelperFixtures>({
  waitForPageReady: async ({ page }: { page: Page }, use) => {
    await use(async () => {
      await page.waitForLoadState('networkidle');
    });
  },

  apiClient: async ({ page }: { page: Page }, use) => {
    const baseUrl = process.env.E2E_BASE_URL || 'http://localhost:3000';
    const client = {
      async get(url: string) {
        const response = await page.request.get(`${baseUrl}${url}`);
        return response.json();
      },
      async post(url: string, body: any) {
        const response = await page.request.post(`${baseUrl}${url}`, { data: body });
        return response.json();
      },
      async put(url: string, body: any) {
        const response = await page.request.put(`${baseUrl}${url}`, { data: body });
        return response.json();
      },
      async delete(url: string) {
        const response = await page.request.delete(`${baseUrl}${url}`);
        return response.json();
      },
    };
    await use(client);
  },
});

export { expect };
