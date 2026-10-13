const { chromium } = require("@playwright/test");
(async () => {
  try {
    const browser = await chromium.launch({ headless: true, channel: "chrome" });
    const page = await browser.newPage();
    const resp = await page.goto("http://localhost:3000/api/v1/system/health", { timeout: 20000 });
    console.log("LAUNCH OK status=", resp.status());
    await browser.close();
    console.log("PROBE DONE");
  } catch (e) {
    console.log("LAUNCH FAILED:", e.message.slice(0, 300));
    process.exit(1);
  }
})();
