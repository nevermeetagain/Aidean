import { spawn } from "node:child_process";
import { cp, stat } from "node:fs/promises";

function assert(condition, message) {
  if (!condition) throw new Error(message);
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

function parsePort(argv) {
  const idx = argv.indexOf("--port");
  if (idx === -1) return 3211;
  const raw = argv[idx + 1];
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) throw new Error(`Invalid --port: ${raw}`);
  return Math.floor(n);
}

async function main() {
  const port = parsePort(process.argv);
  await ensureStandaloneAssets();

  const child = spawn("node", ["server.js"], {
    cwd: ".next/standalone",
    env: { ...process.env, PORT: String(port) },
    stdio: "inherit",
    windowsHide: true
  });

  const stop = () => {
    if (!child.killed) child.kill("SIGTERM");
  };

  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);

  await new Promise((resolve, reject) => {
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`standalone server exited with code ${code}`));
    });
    child.on("error", reject);
  });
}

await main();
