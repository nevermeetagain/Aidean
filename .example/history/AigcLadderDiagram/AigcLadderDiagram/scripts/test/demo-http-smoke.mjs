import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";

const PROJECT_ROOT = process.cwd();
const SERVER_ENTRY = ".next/standalone/server.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
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

async function waitForOk(url, { timeoutMs = 15000, intervalMs = 250 } = {}) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const { status } = await fetchWithTimeout(url, { timeoutMs: 2000 });
      if (status === 200) return true;
    } catch {
      // ignore
    }
    await delay(intervalMs);
  }
  return false;
}

async function waitForOkAny(urls, options) {
  for (const url of urls) {
    // eslint-disable-next-line no-await-in-loop
    const ok = await waitForOk(url, options);
    if (ok) return url;
  }
  return null;
}

async function fetchWithTimeoutAny(urls, options) {
  let lastErr = null;
  for (const url of urls) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const res = await fetchWithTimeout(url, options);
      if (res.status === 200) return { url, ...res };
      lastErr = new Error(`status ${res.status}`);
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr ?? new Error("All URLs failed");
}

async function findFreePort(startPort = 3111) {
  for (let port = startPort; port < startPort + 200; port++) {
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
  const child = spawn("node", [SERVER_ENTRY], {
    cwd: PROJECT_ROOT,
    env: { ...process.env, PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true
  });

  let stdout = "";
  let stderr = "";

  child.stdout?.on("data", (d) => {
    stdout += d.toString();
  });
  child.stderr?.on("data", (d) => {
    stderr += d.toString();
  });

  const getLogs = () => ({ stdout, stderr });

  return { child, getLogs };
}

async function stopServer(child) {
  if (!child || child.killed) return;

  child.kill("SIGTERM");
  await delay(300);

  if (!child.killed) {
    child.kill("SIGKILL");
    await delay(200);
  }
}

async function testDemo({ demoName, demoPath, seedPort }) {
  const port = await findFreePort(seedPort);
  const base = `http://127.0.0.1:${port}`;

  const { child, getLogs } = startStandaloneServer({ port });

  try {
    const readyUrl = await waitForOkAny([`${base}/logo.svg`, `${base}/images/icons/logo.svg`]);
    assert(readyUrl, `Server not ready for ${demoName} on port ${port}`);

    const listUrl = `${base}${demoPath}`;
    const detailUrl = `${base}${demoPath}/models/gpt-4o`;
    const logoUrls = [`${base}/logo.svg`, `${base}/images/icons/logo.svg`];

    const list = await fetchWithTimeout(listUrl);
    assert(list.status === 200, `${demoName} list not 200: ${list.status}`);
    assert(
      list.text.includes(`${demoPath}/models/`),
      `${demoName} list HTML missing models link prefix: ${demoPath}/models/`
    );

    const detail = await fetchWithTimeout(detailUrl);
    assert(detail.status === 200, `${demoName} detail not 200: ${detail.status}`);

    const logo = await fetchWithTimeoutAny(logoUrls);
    const ct = logo.headers.get("content-type") ?? "";
    assert(
      ct.includes("image/svg") || ct.includes("image/svg+xml"),
      `${demoName} logo content-type unexpected: ${ct}`
    );

    return {
      demoName,
      port,
      ok: true,
      checks: [
        { url: listUrl, status: list.status },
        { url: detailUrl, status: detail.status },
        { url: logo.url, status: logo.status, contentType: ct }
      ]
    };
  } catch (err) {
    const logs = getLogs();
    return {
      demoName,
      port,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      logs
    };
  } finally {
    await stopServer(child);
  }
}

async function main() {
  const demos = [
    { demoName: "demo1", demoPath: "/demo/demo1", seedPort: 3111 },
    { demoName: "demo2", demoPath: "/demo/demo2", seedPort: 3121 },
    { demoName: "demo3", demoPath: "/demo/demo3", seedPort: 3131 },
    { demoName: "demo4", demoPath: "/demo/demo4", seedPort: 3141 },
    { demoName: "demo5", demoPath: "/demo/demo5", seedPort: 3151 }
  ];

  const onlyIdx = process.argv.indexOf("--only");
  const onlyName = onlyIdx !== -1 ? process.argv[onlyIdx + 1] : null;
  const selectedDemos = onlyName ? demos.filter((d) => d.demoName === onlyName) : demos;
  assert(selectedDemos.length > 0, `No demos selected. --only=${onlyName ?? ""}`);

  const results = [];
  for (const d of selectedDemos) {
    // eslint-disable-next-line no-await-in-loop
    const r = await testDemo(d);
    results.push(r);
  }

  for (const r of results) {
    if (r.ok) {
      console.log(`\n[PASS] ${r.demoName} (port ${r.port})`);
      for (const c of r.checks) {
        const extra = c.contentType ? ` (${c.contentType})` : "";
        console.log(`  ${c.status} ${c.url}${extra}`);
      }
    } else {
      console.log(`\n[FAIL] ${r.demoName} (port ${r.port})`);
      console.log(`  error: ${r.error}`);
      if (r.logs?.stderr) {
        console.log("  --- stderr ---");
        console.log(r.logs.stderr.slice(-2000));
      }
    }
  }

  const failed = results.filter((x) => !x.ok);
  if (failed.length > 0) process.exitCode = 1;
}

await main();
