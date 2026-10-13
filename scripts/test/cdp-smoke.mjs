import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { cp, mkdir, stat, writeFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";

const CHROME_VERSION_URL = "http://127.0.0.1:9222/json/version";
const SCREEN_DIR = ".tmp/cdp-smoke/screens";
const DEEP_DIR = ".tmp/cdp-smoke/deep";

process.on("unhandledRejection", (reason) => {
  console.error("[UNHANDLED_REJECTION]", reason);
  process.exitCode = 1;
});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function setDesktopViewport(cdp, sessionId) {
  await sendWithRetry(
    cdp,
    "Emulation.setDeviceMetricsOverride",
    {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    },
    { sessionId }
  );
}

async function waitForIdle(cdp, sessionId, { timeoutMs = 8000, quietMs = 600 } = {}) {
  const startedAt = Date.now();
  let last = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    // eslint-disable-next-line no-await-in-loop
    const pending = await evalInPage(cdp, sessionId, "window.__cdpPendingNetwork || 0");
    if (Number(pending) === 0) {
      if (Date.now() - last >= quietMs) return;
    } else {
      last = Date.now();
    }
    // eslint-disable-next-line no-await-in-loop
    await delay(200);
  }
}

async function pathExists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function ensureStandaloneAssets() {
  const standaloneRoot = ".next/standalone";
  const srcStatic = ".next/static";
  const dstStatic = `${standaloneRoot}/.next/static`;
  const srcPublic = "public";
  const dstPublic = `${standaloneRoot}/public`;

  assert(await pathExists(standaloneRoot), "Missing .next/standalone. Please run npm run build first.");
  assert(await pathExists(srcStatic), "Missing .next/static. Please run npm run build first.");
  assert(await pathExists(srcPublic), "Missing public/. Please check project structure.");

  await cp(srcStatic, dstStatic, { recursive: true, force: true });
  await cp(srcPublic, dstPublic, { recursive: true, force: true });
}

async function findFreePort(startPort = 3211) {
  for (let port = startPort; port < startPort + 400; port++) {
    // eslint-disable-next-line no-await-in-loop
    const ok = await new Promise((resolve) => {
      const srv = createServer();
      srv.once("error", () => resolve(false));
      srv.listen(port, "127.0.0.1", () => {
        srv.close(() => resolve(true));
      });
    });
    if (ok) return port;
  }
  throw new Error("No free port found");
}

function startStandaloneServer({ port }) {
  const child = spawn("node", ["server.js"], {
    cwd: ".next/standalone",
    env: { ...process.env, PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true
  });

  let stdout = "";
  let stderr = "";
  child.stdout?.on("data", (d) => (stdout += d.toString()));
  child.stderr?.on("data", (d) => (stderr += d.toString()));

  return {
    child,
    getLogs: () => ({ stdout, stderr })
  };
}

async function stopProcess(child) {
  if (!child || child.killed) return;
  child.kill("SIGTERM");
  await delay(300);
  if (!child.killed) {
    child.kill("SIGKILL");
    await delay(200);
  }
}

async function getFirstPageTargetId(cdp) {
  const res = await sendWithRetry(cdp, "Target.getTargets", {});
  const targetInfos = res.targetInfos ?? [];

  const page = targetInfos.find((t) => {
    const url = String(t.url ?? "");
    return t.type === "page" && !url.startsWith("chrome-extension://");
  });

  return page?.targetId ?? null;
}

async function createFreshTargetId(cdp) {
  try {
    const created = await sendWithRetry(cdp, "Target.createTarget", { url: "about:blank" });
    return created.targetId;
  } catch {
    return null;
  }
}

async function fetchWithTimeout(url, { timeoutMs = 8000 } = {}) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    const text = await res.text();
    return { status: res.status, headers: res.headers, text };
  } finally {
    clearTimeout(t);
  }
}

async function waitHttpOk(url, { timeoutMs = 15000, intervalMs = 250 } = {}) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (res.status === 200) return true;
    } catch {
      // ignore
    }
    // eslint-disable-next-line no-await-in-loop
    await delay(intervalMs);
  }
  return false;
}

async function waitHttpOkAny(urls, options) {
  for (const url of urls) {
    // eslint-disable-next-line no-await-in-loop
    const ok = await waitHttpOk(url, options);
    if (ok) return url;
  }
  return null;
}

class CdpClient {
  /** @param {string} wsUrl */
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();

    this.ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(String(ev.data));
      if (msg.id) {
        const p = this.pending.get(msg.id);
        if (!p) return;
        this.pending.delete(msg.id);
        if (msg.error) {
          const method = p.method ? `[${p.method}] ` : "";
          p.reject(new Error(method + (msg.error.message ?? "CDP error")));
        }
        else p.resolve(msg.result);
        return;
      }

      if (msg.method) {
        const arr = this.listeners.get(msg.method);
        if (arr) {
          for (const fn of arr) fn(msg.params ?? {}, msg.sessionId);
        }
      }
    });
  }

  async waitOpen() {
    if (this.ws.readyState === WebSocket.OPEN) return;
    await new Promise((resolve, reject) => {
      const onOpen = () => {
        cleanup();
        resolve();
      };
      const onErr = () => {
        cleanup();
        reject(new Error("Failed to open CDP WebSocket"));
      };
      const cleanup = () => {
        this.ws.removeEventListener("open", onOpen);
        this.ws.removeEventListener("error", onErr);
      };
      this.ws.addEventListener("open", onOpen);
      this.ws.addEventListener("error", onErr);
    });
  }

  /** @param {string} method @param {any} params @param {{sessionId?: string, timeoutMs?: number}} opts */
  send(method, params = {}, opts = {}) {
    const id = this.nextId++;
    const payload = { id, method, params };
    if (opts.sessionId) payload.sessionId = opts.sessionId;
    this.ws.send(JSON.stringify(payload));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject, method, params });
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`CDP timeout: ${method}`));
        }
      }, typeof opts.timeoutMs === "number" ? opts.timeoutMs : 15000);
    });
  }

  /** @param {string} method @param {(params:any, sessionId?:string)=>void} fn */
  on(method, fn) {
    const arr = this.listeners.get(method) ?? [];
    arr.push(fn);
    this.listeners.set(method, arr);
  }

  close() {
    try {
      this.ws.close();
    } catch {
      // ignore
    }
  }
}

async function getChromeWsUrl() {
  const r = await fetchWithTimeout(CHROME_VERSION_URL, { timeoutMs: 2500 });
  assert(r.status === 200, `Chrome 9222 not reachable: ${r.status}`);
  const json = JSON.parse(r.text);
  assert(json.webSocketDebuggerUrl, "Missing webSocketDebuggerUrl");
  return String(json.webSocketDebuggerUrl);
}

async function ensureScreensDir() {
  await mkdir(SCREEN_DIR, { recursive: true });
}

async function ensureDeepDir() {
  await mkdir(DEEP_DIR, { recursive: true });
}

async function savePng(base64, filePath) {
  await mkdir(filePath.split("/").slice(0, -1).join("/"), { recursive: true });
  const buf = Buffer.from(base64, "base64");
  await writeFile(filePath, buf);
}

async function appendJsonl(filePath, obj) {
  const line = JSON.stringify(obj) + "\n";
  await writeFile(filePath, line, { flag: "a" });
}

function jsStringEscape(s) {
  return s.replaceAll("\\", "\\\\").replaceAll("`", "\\`").replaceAll("$", "\\$");
}

async function evalInPage(cdp, sessionId, expression) {
  const res = await cdp.send(
    "Runtime.evaluate",
    { expression, returnByValue: true, awaitPromise: true },
    { sessionId }
  );
  return res.result?.value;
}

async function sendWithRetry(cdp, method, params = {}, opts = {}, retries = 1) {
  try {
    return await cdp.send(method, params, opts);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (retries > 0 && msg.toLowerCase().includes("no browser is open")) {
      await delay(300);
      return await sendWithRetry(cdp, method, params, opts, retries - 1);
    }
    throw e;
  }
}

async function waitLoad(cdp, sessionId) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 15000) {
    // eslint-disable-next-line no-await-in-loop
    const state = await evalInPage(cdp, sessionId, "document.readyState");
    if (state === "complete") return;
    // eslint-disable-next-line no-await-in-loop
    await delay(200);
  }
  throw new Error("Page load timeout");
}

async function waitPathIncludes(cdp, sessionId, expectedSubstring, { timeoutMs = 15000 } = {}) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    // eslint-disable-next-line no-await-in-loop
    const path = await evalInPage(cdp, sessionId, "location.pathname");
    if (String(path).includes(expectedSubstring)) return String(path);
    // eslint-disable-next-line no-await-in-loop
    await delay(200);
  }
  throw new Error(`Timeout waiting path includes: ${expectedSubstring}`);
}

async function safeNavigate(cdp, sessionId, url) {
  await sendWithRetry(cdp, "Page.navigate", { url }, { sessionId });
  await waitLoad(cdp, sessionId);
  await installPendingNetworkHook(cdp, sessionId);
  await waitForIdle(cdp, sessionId);
}

async function setInputValue(cdp, sessionId, selector, value) {
  const v = jsStringEscape(String(value));
  const sel = jsStringEscape(selector);
  await evalInPage(
    cdp,
    sessionId,
    `(() => {
      const el = document.querySelector(\`${sel}\`);
      if (!el) throw new Error('Missing input: ${sel}');
      el.focus();
      el.value = \`${v}\`;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()`
  );
}

async function clickSelector(cdp, sessionId, selector) {
  const sel = jsStringEscape(selector);
  await evalInPage(
    cdp,
    sessionId,
    `(() => {
      const el = document.querySelector(\`${sel}\`);
      if (!el) throw new Error('Missing clickable: ${sel}');
      el.scrollIntoView({ block: 'center', inline: 'center' });
      el.click();
      return true;
    })()`
  );
}

async function selectValue(cdp, sessionId, selector, value) {
  const sel = jsStringEscape(selector);
  const v = jsStringEscape(String(value));
  await evalInPage(
    cdp,
    sessionId,
    `(() => {
      const el = document.querySelector(\`${sel}\`);
      if (!el) throw new Error('Missing select: ${sel}');
      el.value = \`${v}\`;
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return el.value;
    })()`
  );
}

async function clickButtonByText(cdp, sessionId, tag, text) {
  const t = jsStringEscape(String(text));
  const tg = jsStringEscape(String(tag));
  await evalInPage(
    cdp,
    sessionId,
    `(() => {
      const els = Array.from(document.querySelectorAll(\`${tg}\`));
      const el = els.find((x) => (x.textContent ?? '').trim() === \`${t}\`);
      if (!el) throw new Error('Missing button text: ' + \`${t}\`);
      el.scrollIntoView({ block: 'center', inline: 'center' });
      el.click();
      return true;
    })()`
  );
}

async function clickFirstDetailLink(cdp, sessionId) {
  const result = await evalInPage(
    cdp,
    sessionId,
    `(() => {
      const links = Array.from(document.querySelectorAll('a[aria-label^="查看模型详情："]'));
      const el = links[0];
      if (!el) throw new Error('Missing detail link: a[aria-label^="查看模型详情："]');
      const label = el.getAttribute('aria-label') ?? '';
      el.scrollIntoView({ block: 'center', inline: 'center' });
      el.click();
      return { label, href: el.getAttribute('href') ?? '' };
    })()`
  );

  return result;
}

async function installPendingNetworkHook(cdp, sessionId) {
  await evalInPage(
    cdp,
    sessionId,
    `(() => {
      if (window.__cdpPendingInstalled) return true;
      window.__cdpPendingInstalled = true;
      window.__cdpPendingNetwork = 0;

      const origFetch = window.fetch;
      window.fetch = async (...args) => {
        window.__cdpPendingNetwork++;
        try {
          return await origFetch(...args);
        } finally {
          window.__cdpPendingNetwork--;
        }
      };

      return true;
    })()`
  );
}

async function markInteractables(cdp, sessionId, { rootSelector = "body", max = 200 } = {}) {
  const root = jsStringEscape(rootSelector);
  const res = await evalInPage(
    cdp,
    sessionId,
    `(() => {
      const root = document.querySelector(\`${root}\`) || document.body;
      const selector = [
        'a',
        'button',
        'input',
        'select',
        'textarea',
        '[role="button"]',
        '[role="link"]'
      ].join(',');

      const els = Array.from(root.querySelectorAll(selector));
      const visible = (el) => {
        const st = window.getComputedStyle(el);
        if (st.display === 'none' || st.visibility === 'hidden' || st.opacity === '0') return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      };

      let n = 0;
      const out = [];
      for (const el of els) {
        if (!visible(el)) continue;
        if (n >= ${max}) break;
        n++;
        const id = el.getAttribute('data-cdp-auto-id') || String(n);
        el.setAttribute('data-cdp-auto-id', id);
        const tag = (el.tagName || '').toLowerCase();
        const type = (el.getAttribute('type') || '').toLowerCase();
        const role = (el.getAttribute('role') || '').toLowerCase();
        const text = (el.textContent || '').trim().slice(0, 80);
        const ariaLabel = (el.getAttribute('aria-label') || '').trim().slice(0, 120);
        const href = (el.getAttribute('href') || '').trim();
        const name = (el.getAttribute('name') || '').trim();
        const placeholder = (el.getAttribute('placeholder') || '').trim();
        out.push({ id, tag, type, role, text, ariaLabel, href, name, placeholder });
      }

      return out;
    })()`
  );

  return Array.isArray(res) ? res : [];
}

async function safeClickByAutoId(cdp, sessionId, id) {
  const safeId = jsStringEscape(String(id));
  return await evalInPage(
    cdp,
    sessionId,
    `(() => {
      const el = document.querySelector('[data-cdp-auto-id="${safeId}"]');
      if (!el) return { ok: false, reason: 'missing' };
      el.scrollIntoView({ block: 'center', inline: 'center' });
      el.click();
      return { ok: true };
    })()`
  );
}

async function setValueByAutoId(cdp, sessionId, id, value) {
  const safeId = jsStringEscape(String(id));
  const v = jsStringEscape(String(value));
  return await evalInPage(
    cdp,
    sessionId,
    `(() => {
      const el = document.querySelector('[data-cdp-auto-id="${safeId}"]');
      if (!el) return { ok: false, reason: 'missing' };
      el.scrollIntoView({ block: 'center', inline: 'center' });
      el.focus();
      el.value = \`${v}\`;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return { ok: true };
    })()`
  );
}

async function toggleCheckboxByAutoId(cdp, sessionId, id) {
  const safeId = jsStringEscape(String(id));
  return await evalInPage(
    cdp,
    sessionId,
    `(() => {
      const el = document.querySelector('[data-cdp-auto-id="${safeId}"]');
      if (!el) return { ok: false, reason: 'missing' };
      if (el.tagName.toLowerCase() !== 'input') return { ok: false, reason: 'not-input' };
      if ((el.getAttribute('type') || '').toLowerCase() !== 'checkbox') return { ok: false, reason: 'not-checkbox' };
      el.scrollIntoView({ block: 'center', inline: 'center' });
      el.click();
      return { ok: true, checked: el.checked };
    })()`
  );
}

async function cycleSelectByAutoId(cdp, sessionId, id) {
  const safeId = jsStringEscape(String(id));
  return await evalInPage(
    cdp,
    sessionId,
    `(() => {
      const el = document.querySelector('[data-cdp-auto-id="${safeId}"]');
      if (!el) return { ok: false, reason: 'missing' };
      if (el.tagName.toLowerCase() !== 'select') return { ok: false, reason: 'not-select' };
      const opts = Array.from(el.options || []).map((o) => o.value).filter((v) => v !== '');
      if (!opts.length) return { ok: false, reason: 'no-options' };
      const idx = Math.min(1, opts.length - 1);
      el.value = opts[idx];
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return { ok: true, value: el.value };
    })()`
  );
}

function isInternalDemoHref(href, demoPath) {
  if (!href) return false;
  if (href.startsWith("http://") || href.startsWith("https://") || href.startsWith("mailto:")) return false;
  if (!href.startsWith("/")) return false;
  return href.startsWith(demoPath) || href.startsWith(`${demoPath}/models/`);
}

async function deepTraversePage(
  cdp,
  sessionId,
  { demoName, demoPath, scope, actionLogPath, stepDir, maxActions = 60 }
) {
  const beforePath = String(await evalInPage(cdp, sessionId, "location.pathname"));
  const beforeTitle = String(await evalInPage(cdp, sessionId, "document.title"));
  await appendJsonl(actionLogPath, { type: "scope_start", demoName, scope, path: beforePath, title: beforeTitle, ts: Date.now() });

  const elements = await markInteractables(cdp, sessionId, { rootSelector: "body", max: 220 });
  await appendJsonl(actionLogPath, { type: "discovered", demoName, scope, count: elements.length, ts: Date.now() });

  let step = 0;
  const shot = async (label) => {
    step += 1;
    await capture(cdp, sessionId, `${stepDir}/${String(step).padStart(3, "0")}-${label}.png`);
  };

  await shot("start");

  const prioritized = [...elements].sort((a, b) => {
    const pri = (x) => {
      if (x.tag === "input") return 1;
      if (x.tag === "select") return 2;
      if (x.tag === "button" || x.role === "button") return 3;
      if (x.tag === "a" || x.role === "link") return 4;
      return 9;
    };
    return pri(a) - pri(b);
  });

  let actions = 0;
  for (const el of prioritized) {
    if (actions >= maxActions) break;
    const meta = { id: el.id, tag: el.tag, type: el.type, role: el.role, text: el.text, ariaLabel: el.ariaLabel, href: el.href };

    try {
      if (el.tag === "input") {
        if (["hidden", "submit", "button"].includes(el.type)) continue;

        if (el.type === "checkbox") {
          actions += 1;
          const r = await toggleCheckboxByAutoId(cdp, sessionId, el.id);
          await waitForIdle(cdp, sessionId);
          await appendJsonl(actionLogPath, { type: "toggle", demoName, scope, meta, result: r, ts: Date.now() });
          await shot(`toggle-${el.id}`);
          continue;
        }

        const value =
          (el.ariaLabel && el.ariaLabel.includes("搜索")) || (el.placeholder && el.placeholder.includes("搜索"))
            ? "GPT"
            : "test";

        actions += 1;
        const r = await setValueByAutoId(cdp, sessionId, el.id, value);
        await delay(200);
        await waitForIdle(cdp, sessionId);
        await appendJsonl(actionLogPath, { type: "input", demoName, scope, meta, value, result: r, ts: Date.now() });
        await shot(`input-${el.id}`);
        continue;
      }

      if (el.tag === "select") {
        actions += 1;
        const r = await cycleSelectByAutoId(cdp, sessionId, el.id);
        await delay(200);
        await waitForIdle(cdp, sessionId);
        await appendJsonl(actionLogPath, { type: "select", demoName, scope, meta, result: r, ts: Date.now() });
        await shot(`select-${el.id}`);
        continue;
      }

      if (el.tag === "button" || el.role === "button") {
        const t = (el.text || "") + " " + (el.ariaLabel || "");
        if (/(退出|删除|移除|注销|支付|购买)/.test(t)) continue;

        actions += 1;
        const before = String(await evalInPage(cdp, sessionId, "location.pathname"));
        const r = await safeClickByAutoId(cdp, sessionId, el.id);
        await delay(250);
        await waitForIdle(cdp, sessionId);
        const after = String(await evalInPage(cdp, sessionId, "location.pathname"));
        await appendJsonl(actionLogPath, { type: "click_button", demoName, scope, meta, before, after, result: r, ts: Date.now() });
        await shot(`btn-${el.id}`);

        if (!after.startsWith(demoPath)) {
          await evalInPage(cdp, sessionId, "history.back()");
          await waitLoad(cdp, sessionId);
          await waitForIdle(cdp, sessionId);
          await appendJsonl(actionLogPath, {
            type: "nav_back",
            demoName,
            scope,
            from: after,
            to: String(await evalInPage(cdp, sessionId, "location.pathname")),
            ts: Date.now()
          });
          await shot(`back-${el.id}`);
        }
        continue;
      }

      if (el.tag === "a" || el.role === "link") {
        if (!isInternalDemoHref(el.href, demoPath)) continue;

        actions += 1;
        const before = String(await evalInPage(cdp, sessionId, "location.pathname"));
        const r = await safeClickByAutoId(cdp, sessionId, el.id);
        await delay(350);
        await waitForIdle(cdp, sessionId);
        const after = String(await evalInPage(cdp, sessionId, "location.pathname"));
        await appendJsonl(actionLogPath, { type: "click_link", demoName, scope, meta, before, after, result: r, ts: Date.now() });
        await shot(`link-${el.id}`);

        if (after !== before) {
          await evalInPage(cdp, sessionId, "history.back()");
          await waitLoad(cdp, sessionId);
          await waitForIdle(cdp, sessionId);
          await appendJsonl(actionLogPath, {
            type: "nav_back",
            demoName,
            scope,
            from: after,
            to: String(await evalInPage(cdp, sessionId, "location.pathname")),
            ts: Date.now()
          });
          await shot(`back-${el.id}`);
        }
        continue;
      }
    } catch (e) {
      await appendJsonl(actionLogPath, {
        type: "action_error",
        demoName,
        scope,
        meta,
        error: String(e instanceof Error ? e.message : e),
        ts: Date.now()
      });
    }
  }

  const endPath = String(await evalInPage(cdp, sessionId, "location.pathname"));
  await appendJsonl(actionLogPath, { type: "scope_end", demoName, scope, path: endPath, actions, ts: Date.now() });
  return { actions, discovered: elements.length };
}

async function runHomeFlow(cdp, { baseUrl }) {
  const deepMode = process.argv.includes("--deep");
  const headerOnly = process.argv.includes("--header-only");
  const demoName = "home";
  const demoPath = "/";
  const demoStartTs = Date.now() / 1000;

  let targetId = await createFreshTargetId(cdp);
  if (!targetId) targetId = await getFirstPageTargetId(cdp);
  assert(targetId, "No available page target in Chrome");

  const attached = await sendWithRetry(cdp, "Target.attachToTarget", { targetId, flatten: true });
  const sessionId = attached.sessionId;

  const errors = {
    consoleError: 0,
    runtimeException: 0,
    logError: 0,
    logErrorEntries: [],
    networkFailed: 0,
    networkFailedEntries: [],
    networkAborted: 0,
    networkAbortedEntries: []
  };

  cdp.on("Runtime.exceptionThrown", (params, sid) => {
    if (sid !== sessionId) return;
    errors.runtimeException += 1;
  });

  cdp.on("Runtime.consoleAPICalled", (params, sid) => {
    if (sid !== sessionId) return;
    if (params.type === "error") {
      errors.consoleError += 1;
    }
  });

  cdp.on("Log.entryAdded", (params, sid) => {
    if (sid !== sessionId) return;
    if (params.entry?.level === "error") {
      if (typeof params.entry.timestamp === "number" && params.entry.timestamp < demoStartTs) return;

      errors.logError += 1;

      if (errors.logErrorEntries.length < 50) {
        errors.logErrorEntries.push({
          source: params.entry.source,
          text: params.entry.text,
          url: params.entry.url,
          lineNumber: params.entry.lineNumber,
          timestamp: params.entry.timestamp
        });
      }
    }
  });

  cdp.on("Network.loadingFailed", (params, sid) => {
    if (sid !== sessionId) return;

    const entry = {
      requestId: params.requestId,
      type: params.type,
      errorText: params.errorText,
      canceled: params.canceled,
      blockedReason: params.blockedReason,
      timestamp: params.timestamp
    };

    const errorText = String(params.errorText ?? "");
    const aborted = errorText.includes("net::ERR_ABORTED") || params.canceled === true;

    if (aborted) {
      errors.networkAborted += 1;
      if (errors.networkAbortedEntries.length < 50) {
        errors.networkAbortedEntries.push(entry);
      }
      return;
    }

    errors.networkFailed += 1;
    if (errors.networkFailedEntries.length < 50) {
      errors.networkFailedEntries.push(entry);
    }
  });

  try {
    await sendWithRetry(cdp, "Page.enable", {}, { sessionId });
    await sendWithRetry(cdp, "Runtime.enable", {}, { sessionId });
    await sendWithRetry(cdp, "Log.enable", {}, { sessionId });
    await sendWithRetry(cdp, "Network.enable", {}, { sessionId });

    await setDesktopViewport(cdp, sessionId);

    await sendWithRetry(cdp, "Page.navigate", { url: `${baseUrl}${demoPath}` }, { sessionId });
    await waitLoad(cdp, sessionId);
    await installPendingNetworkHook(cdp, sessionId);
    await waitForIdle(cdp, sessionId);

    await captureHeader(cdp, sessionId, `${SCREEN_DIR}/${demoName}-header.png`);
    if (headerOnly) return { demoName, ok: true, errors };

    const kb = await evalInPage(
      cdp,
      sessionId,
      `(() => {
        const inHeader = Array.from(document.querySelectorAll('a')).find((a) => String(a.textContent || '').includes('知识库产品'));
        const inEcosystem = document.querySelector('a[aria-label="Aidean 知识库"]');
        return {
          headerHref: inHeader?.getAttribute('href') || '',
          ecosystemHref: inEcosystem?.getAttribute('href') || ''
        };
      })()`
    );

    if (kb?.ecosystemHref && !String(kb.ecosystemHref).startsWith("http")) {
      throw new Error(`Invalid ecosystem knowledge base href: ${String(kb.ecosystemHref)}`);
    }

    if (!deepMode) {
      await setInputValue(cdp, sessionId, "#site-search", "GPT");
      await delay(200);

      await clickSelector(cdp, sessionId, 'button[aria-label="更多榜单"]');
      await delay(250);
      await clickButtonByText(cdp, sessionId, "button", "大模型性价比天梯图");
      await delay(250);

      await clickButtonByText(cdp, sessionId, "button", "专业版");
      await delay(150);
      await clickButtonByText(cdp, sessionId, "button", "应用版");
      await delay(150);

      await clickButtonByText(cdp, sessionId, "button", "排行榜");
      await delay(150);
      await clickButtonByText(cdp, sessionId, "button", "柱状图");
      await delay(150);

      await clickSelector(cdp, sessionId, 'button[aria-label="收藏"]');
      await delay(120);
      await clickSelector(cdp, sessionId, 'button[aria-label="对比"]');
      await delay(120);
      await clickSelector(cdp, sessionId, 'button[aria-label="客服"]');
      await delay(120);

      await capture(cdp, sessionId, `${SCREEN_DIR}/${demoName}.png`);
      return { demoName, ok: true, errors, meta: { kb } };
    }

    await ensureDeepDir();
    const demoDir = `${DEEP_DIR}/${demoName}`;
    await mkdir(demoDir, { recursive: true });
    const actionLogPath = `${demoDir}/actions.jsonl`;
    const listDir = `${demoDir}/home`;
    await mkdir(listDir, { recursive: true });

    await appendJsonl(actionLogPath, { type: "home_start", demoName, url: `${baseUrl}${demoPath}`, ts: Date.now(), kb });
    await capture(cdp, sessionId, `${listDir}/000-home.png`);
    await clickSelector(cdp, sessionId, 'button[aria-label="更多榜单"]');
    await delay(250);
    await capture(cdp, sessionId, `${listDir}/010-boards.png`);
    await appendJsonl(actionLogPath, { type: "home_end", demoName, ts: Date.now() });

    return { demoName, ok: true, errors, deep: { dir: demoDir }, meta: { kb } };
  } catch (err) {
    return { demoName, ok: false, error: err instanceof Error ? err.message : String(err), errors };
  } finally {
    try {
      await cdp.send("Target.detachFromTarget", { sessionId });
    } catch {
      // ignore
    }

    try {
      await cdp.send("Target.closeTarget", { targetId });
    } catch {
      // ignore
    }
  }
}

async function capture(cdp, sessionId, filePath) {
  try {
    const { data } = await cdp.send(
      "Page.captureScreenshot",
      { format: "png", captureBeyondViewport: true },
      { sessionId, timeoutMs: 45000 }
    );
    await savePng(data, filePath);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (!msg.includes("CDP timeout: Page.captureScreenshot")) throw e;

    // Fallback: less expensive capture (no beyond viewport) with longer timeout.
    const { data } = await cdp.send(
      "Page.captureScreenshot",
      { format: "png", captureBeyondViewport: false },
      { sessionId, timeoutMs: 90000 }
    );
    await savePng(data, filePath);
  }
}

async function captureHeader(cdp, sessionId, filePath) {
  await evalInPage(cdp, sessionId, "window.scrollTo(0, 0)");
  await evalInPage(
    cdp,
    sessionId,
    `(() => {
      const ids = ['site-search', 'demo5-search'];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el instanceof HTMLInputElement) {
          el.value = '';
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    })()`
  );
  await delay(150);
  const { data } = await cdp.send(
    "Page.captureScreenshot",
    {
      format: "png",
      captureBeyondViewport: false,
      clip: { x: 0, y: 0, width: 1440, height: 120, scale: 1 }
    },
    { sessionId, timeoutMs: 45000 }
  );
  await savePng(data, filePath);
}

async function runDemoFlow(cdp, { baseUrl, demoName, demoPath, searchSelector, sortSelector, vendorMode }) {
  const deepMode = process.argv.includes("--deep");
  const headerOnly = process.argv.includes("--header-only");
  const demoStartTs = Date.now() / 1000;

  let targetId = await createFreshTargetId(cdp);
  if (!targetId) targetId = await getFirstPageTargetId(cdp);
  assert(targetId, "No available page target in Chrome");

  const attached = await sendWithRetry(cdp, "Target.attachToTarget", { targetId, flatten: true });
  const sessionId = attached.sessionId;

  const errors = {
    consoleError: 0,
    runtimeException: 0,
    logError: 0,
    logErrorEntries: [],
    networkFailed: 0,
    networkFailedEntries: [],
    networkAborted: 0,
    networkAbortedEntries: []
  };

  cdp.on("Runtime.exceptionThrown", (params, sid) => {
    if (sid !== sessionId) return;
    errors.runtimeException += 1;
  });

  cdp.on("Runtime.consoleAPICalled", (params, sid) => {
    if (sid !== sessionId) return;
    if (params.type === "error") {
      errors.consoleError += 1;
    }
  });

  cdp.on("Log.entryAdded", (params, sid) => {
    if (sid !== sessionId) return;
    if (params.entry?.level === "error") {
      if (typeof params.entry.timestamp === "number" && params.entry.timestamp < demoStartTs) return;

      errors.logError += 1;

      if (errors.logErrorEntries.length < 50) {
        errors.logErrorEntries.push({
          source: params.entry.source,
          text: params.entry.text,
          url: params.entry.url,
          lineNumber: params.entry.lineNumber,
          timestamp: params.entry.timestamp
        });
      }
    }
  });

  cdp.on("Network.loadingFailed", (params, sid) => {
    if (sid !== sessionId) return;

    const entry = {
      requestId: params.requestId,
      type: params.type,
      errorText: params.errorText,
      canceled: params.canceled,
      blockedReason: params.blockedReason,
      timestamp: params.timestamp
    };

    const errorText = String(params.errorText ?? "");
    const aborted = errorText.includes("net::ERR_ABORTED") || params.canceled === true;

    if (aborted) {
      errors.networkAborted += 1;
      if (errors.networkAbortedEntries.length < 50) {
        errors.networkAbortedEntries.push(entry);
      }
      return;
    }

    errors.networkFailed += 1;
    if (errors.networkFailedEntries.length < 50) {
      errors.networkFailedEntries.push(entry);
    }
  });

  try {
    await sendWithRetry(cdp, "Page.enable", {}, { sessionId });
    await sendWithRetry(cdp, "Runtime.enable", {}, { sessionId });
    await sendWithRetry(cdp, "Log.enable", {}, { sessionId });
    await sendWithRetry(cdp, "Network.enable", {}, { sessionId });

    await setDesktopViewport(cdp, sessionId);

    await sendWithRetry(cdp, "Page.navigate", { url: `${baseUrl}${demoPath}` }, { sessionId });

    await waitLoad(cdp, sessionId);
    await installPendingNetworkHook(cdp, sessionId);
    await waitForIdle(cdp, sessionId);

    await captureHeader(cdp, sessionId, `${SCREEN_DIR}/${demoName}-header.png`);
    if (headerOnly) return { demoName, ok: true, errors };

    if (!deepMode) {
      // 1) 搜索
      await setInputValue(cdp, sessionId, searchSelector, "GPT");
      await delay(300);

      // 2) 排序（切换一次再切回 score，覆盖 change 事件）
      if (sortSelector) {
        await selectValue(cdp, sessionId, sortSelector, "speed");
        await delay(150);
        await selectValue(cdp, sessionId, sortSelector, "score");
        await delay(150);
      }

      // 3) 厂商筛选：OpenAI
      if (vendorMode.type === "pill") {
        await clickButtonByText(cdp, sessionId, "button", "OpenAI");
        await delay(250);
      }
      if (vendorMode.type === "select") {
        await selectValue(cdp, sessionId, vendorMode.selector, "OpenAI");
        await delay(250);
      }
      if (vendorMode.type === "none") {
        await delay(50);
      }

      // 4) 按钮交互覆盖（避免导致无数据）：demo2 点击“清空筛选”后恢复搜索/筛选
      if (demoName === "demo2") {
        await clickButtonByText(cdp, sessionId, "button", "清空筛选");
        await delay(250);
        await setInputValue(cdp, sessionId, searchSelector, "GPT");
        await delay(150);
        await selectValue(cdp, sessionId, vendorMode.selector, "OpenAI");
        await delay(150);
      }

      // 截图：列表
      await capture(cdp, sessionId, `${SCREEN_DIR}/${demoName}-list.png`);

      // 5) 点击指定可点击单元格（通过 aria-label 的 Link）
      const clicked = await clickFirstDetailLink(cdp, sessionId);

      const detailPath = await waitPathIncludes(cdp, sessionId, `${demoPath}/models/`);
      assert(String(detailPath).includes(`${demoPath}/models/`), `${demoName} not navigated to detail`);

      // 截图：详情
      await capture(cdp, sessionId, `${SCREEN_DIR}/${demoName}-detail.png`);

      // 6) 返回
      await evalInPage(cdp, sessionId, "history.back()");
      await waitLoad(cdp, sessionId);

      return { demoName, ok: true, errors, clicked };
    }

    // deep mode
    await ensureDeepDir();
    const demoDir = `${DEEP_DIR}/${demoName}`;
    await mkdir(demoDir, { recursive: true });
    const actionLogPath = `${demoDir}/actions.jsonl`;
    const listDir = `${demoDir}/list`;
    const detailDir = `${demoDir}/detail`;
    await mkdir(listDir, { recursive: true });
    await mkdir(detailDir, { recursive: true });

    await appendJsonl(actionLogPath, { type: "demo_start", demoName, url: `${baseUrl}${demoPath}`, ts: Date.now() });
    await deepTraversePage(cdp, sessionId, {
      demoName,
      demoPath,
      scope: "list",
      actionLogPath,
      stepDir: listDir,
      maxActions: 70
    });

    await appendJsonl(actionLogPath, { type: "reset_list", demoName, ts: Date.now() });
    await safeNavigate(cdp, sessionId, `${baseUrl}${demoPath}`);

    // 点击进入详情页（优先使用既定 aria-label）
    const clicked = await clickFirstDetailLink(cdp, sessionId);
    try {
      await waitPathIncludes(cdp, sessionId, `${demoPath}/models/`, { timeoutMs: 20000 });
    } catch (e) {
      if (clicked?.href) {
        await appendJsonl(actionLogPath, {
          type: "fallback_navigate",
          demoName,
          href: clicked.href,
          reason: String(e instanceof Error ? e.message : e),
          ts: Date.now()
        });
        await safeNavigate(cdp, sessionId, `${baseUrl}${clicked.href}`);
        await waitPathIncludes(cdp, sessionId, `${demoPath}/models/`, { timeoutMs: 20000 });
      } else {
        throw e;
      }
    }
    await waitForIdle(cdp, sessionId);

    await deepTraversePage(cdp, sessionId, {
      demoName,
      demoPath,
      scope: "detail",
      actionLogPath,
      stepDir: detailDir,
      maxActions: 50
    });

    await evalInPage(cdp, sessionId, "history.back()");
    await waitLoad(cdp, sessionId);
    await waitForIdle(cdp, sessionId);
    await appendJsonl(actionLogPath, { type: "demo_end", demoName, ts: Date.now() });

    return { demoName, ok: true, errors, clicked, deep: { dir: demoDir } };
  } catch (err) {
    return { demoName, ok: false, error: err instanceof Error ? err.message : String(err), errors };
  } finally {
    try {
      await cdp.send("Target.detachFromTarget", { sessionId });
    } catch {
      // ignore
    }

    try {
      await cdp.send("Target.closeTarget", { targetId });
    } catch {
      // ignore
    }
  }
}

async function main() {
  await ensureScreensDir();
  const deepMode = process.argv.includes("--deep");
  if (deepMode) {
    await ensureDeepDir();
  }

  const onlyIdx = process.argv.indexOf("--only");
  const onlyName = onlyIdx !== -1 ? process.argv[onlyIdx + 1] : null;

  let wsUrl;
  try {
    wsUrl = await getChromeWsUrl();
  } catch (e) {
    console.error("[CDP] 无法连接到 Chrome 9222。请先用以下方式启动 Chrome：");
    console.error('  chrome.exe --remote-debugging-port=9222 --user-data-dir=".tmp/cdp-profile"');
    console.error(String(e instanceof Error ? e.message : e));
    process.exitCode = 2;
    return;
  }

  await ensureStandaloneAssets();

  const cdp = new CdpClient(wsUrl);
  await cdp.waitOpen();

  const demos = [
      {
        demoName: "home",
        demoPath: "/",
        flow: "home"
      },
      {
        demoName: "demo1",
        demoPath: "/demo/demo1",
        searchSelector: "#demo1-search",
        sortSelector: 'select[aria-label="排序方式"]',
        vendorMode: { type: "pill" },
        flow: "demo"
      },
      {
        demoName: "demo2",
        demoPath: "/demo/demo2",
        searchSelector: "#demo2-search",
        sortSelector: "#demo2-sort",
        vendorMode: { type: "select", selector: "#demo2-vendor" },
        flow: "demo"
      },
      {
        demoName: "demo3",
        demoPath: "/demo/demo3",
        searchSelector: "#demo3-search",
        sortSelector: 'select[aria-label="排序方式"]',
        vendorMode: { type: "pill" },
        flow: "demo"
      },
      {
        demoName: "demo4",
        demoPath: "/demo/demo4",
        searchSelector: "#demo4-search",
        sortSelector: 'select[aria-label="排序方式"]',
        vendorMode: { type: "pill" },
        flow: "demo"
      },
      {
        demoName: "demo5",
        demoPath: "/demo/demo5",
        searchSelector: "#demo5-search",
        sortSelector: 'select[aria-label="排序方式"]',
        vendorMode: { type: "none" },
        flow: "demo"
      }
    ];

  const selectedDemos = onlyName ? demos.filter((d) => d.demoName === onlyName) : demos;
  assert(selectedDemos.length > 0, `No demos selected. --only=${onlyName ?? ""}`);

  const results = [];
  if (deepMode) {
    for (const d of selectedDemos) {
      const port = await findFreePort(3211);
      const baseUrl = `http://127.0.0.1:${port}`;
      const server = startStandaloneServer({ port });
      try {
        // eslint-disable-next-line no-await-in-loop
        const ready = await waitHttpOkAny([`${baseUrl}/logo.svg`, `${baseUrl}/images/icons/logo.svg`]);
        assert(ready, "Server not ready");

        // eslint-disable-next-line no-await-in-loop
        const r = d.flow === "home" ? await runHomeFlow(cdp, { baseUrl }) : await runDemoFlow(cdp, { baseUrl, ...d });
        results.push(r);
      } finally {
        // eslint-disable-next-line no-await-in-loop
        await stopProcess(server.child);
      }
    }
  } else {
    const port = await findFreePort(3211);
    const baseUrl = `http://127.0.0.1:${port}`;
    const server = startStandaloneServer({ port });
    try {
      const ready = await waitHttpOkAny([`${baseUrl}/logo.svg`, `${baseUrl}/images/icons/logo.svg`]);
      assert(ready, "Server not ready");

      for (const d of selectedDemos) {
        // eslint-disable-next-line no-await-in-loop
        const r = d.flow === "home" ? await runHomeFlow(cdp, { baseUrl }) : await runDemoFlow(cdp, { baseUrl, ...d });
        results.push(r);
      }
    } finally {
      await stopProcess(server.child);
    }
  }

  cdp.close();

    let hasFail = false;
    let totalConsoleError = 0;
    let totalRuntimeException = 0;
    let totalLogError = 0;
    let totalNetworkFailed = 0;
    let totalNetworkAborted = 0;

    for (const r of results) {
      if (r.ok) {
        console.log(`\n[PASS] ${r.demoName}`);
        if (r.clicked?.label || r.clicked?.href) {
          console.log(`  clicked: ${r.clicked.label ?? ""} ${r.clicked.href ?? ""}`);
        }
      } else {
        hasFail = true;
        console.log(`\n[FAIL] ${r.demoName}`);
        console.log(`  error: ${r.error}`);
      }

      totalConsoleError += r.errors.consoleError;
      totalRuntimeException += r.errors.runtimeException;
      totalLogError += r.errors.logError;
      totalNetworkFailed += r.errors.networkFailed;
      totalNetworkAborted += r.errors.networkAborted;

      console.log(
        `  console.error=${r.errors.consoleError} Runtime.exceptionThrown=${r.errors.runtimeException} Log.error=${r.errors.logError} Network.failed=${r.errors.networkFailed} Network.aborted=${r.errors.networkAborted}`
      );

      if (r.errors.networkFailedEntries?.length) {
        console.log("  Network.failed entries (top 10):");
        for (const e of r.errors.networkFailedEntries.slice(0, 10)) {
          const reason = e.errorText ? ` reason=${e.errorText}` : "";
          const type = e.type ? ` type=${e.type}` : "";
          console.log(`    -${type}${reason}`);
        }
      }

      if (r.errors.logErrorEntries?.length) {
        console.log("  Log.error entries (top 10):");
        for (const e of r.errors.logErrorEntries.slice(0, 10)) {
          const url = e.url ? ` url=${e.url}` : "";
          const line = typeof e.lineNumber === "number" ? ` line=${e.lineNumber}` : "";
          console.log(`    - source=${e.source}${url}${line} text=${e.text}`);
        }
      }
    }

    console.log("\n[SCREENSHOTS]");
    console.log(`  ${SCREEN_DIR}`);

    console.log("\n[SUMMARY]");
    console.log(
      `  console.error=${totalConsoleError} Runtime.exceptionThrown=${totalRuntimeException} Log.error=${totalLogError} Network.failed=${totalNetworkFailed} Network.aborted=${totalNetworkAborted}`
    );

    if (hasFail) process.exitCode = 1;
    if (totalConsoleError !== 0 || totalRuntimeException !== 0) process.exitCode = 1;
}

await main();
