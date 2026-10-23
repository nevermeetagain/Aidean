/**
 * lib/cache/revalidate-tag — 可重复生效的 revalidateTag（T120-03 缺陷 D1/D2 根因修复，Hark 2026-10-24）。
 *
 * 根因：next@15.5.28 FileSystemCache.revalidateTag 只在 tag **首次**出现时写入进程内 tagsManifest
 *   （dist/server/lib/incremental-cache/file-system-cache.js:82-86 `if (!tagsManifest.has(tag)) set(tag, now)`）。
 *   unstable_cache 判失效 = revalidatedAt >= entry.lastModified；首次失效后重建的条目 lastModified 恒大于该时间戳，
 *   于是同进程内**第二次及以后**的 revalidateTag 全部被吞，直到 revalidate TTL 自然过期。
 *   现象即 D1（system_configs 连续写后 SSR 不收敛）/ D2（feature-flags 复原方向 PUBLIC 快照不收敛）；
 *   同型影响 admin-auth（授权变更后 60s 内旧权限）与 admin-nav。上游 canary 已改为每次覆盖时间戳。
 *
 * 修复：照常调用 next/cache 的 revalidateTag（保留 ISR/页面 tag 语义与单测桩），并把共享 tagsManifest 的时间戳
 *   刷新为当前时刻；再在短延迟后补刷一次，覆盖「写前已开始、写后才回填」的在途读把旧值写回缓存的竞态。
 *   tagsManifest 为 `.external` 模块，Next 打包时保持外置，路由与页面共享同一实例。
 *   读不到内部模块（升级 Next 后路径变动）时静默退化为原生行为，绝不让写请求失败。
 */
import { revalidateTag } from "next/cache";

const RACE_REFRESH_MS = 1000;

type TagsManifest = Map<string, number>;

let manifest: TagsManifest | null | undefined;

function getManifest(): TagsManifest | null {
  if (manifest !== undefined) return manifest;
  try {
    const mod = require("next/dist/server/lib/incremental-cache/tags-manifest.external") as { tagsManifest?: TagsManifest };
    manifest = mod.tagsManifest instanceof Map ? mod.tagsManifest : null;
  } catch {
    manifest = null;
  }
  return manifest;
}

/** 测试用：注入/重置 manifest。 */
export function __setTagsManifestForTest(m: TagsManifest | null | undefined): void {
  manifest = m;
}

function touch(tag: string): void {
  getManifest()?.set(tag, Date.now());
}

/** 失效一个缓存 tag，且同进程内重复调用每次都生效。 */
export function revalidateTagNow(tag: string): void {
  revalidateTag(tag);
  touch(tag);
  const t = setTimeout(() => touch(tag), RACE_REFRESH_MS);
  (t as { unref?: () => void }).unref?.();
}
