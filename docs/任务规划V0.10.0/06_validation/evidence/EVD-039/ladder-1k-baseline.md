# TASK-039 千级模型天梯量级基线

> 状态：**测量脚本已交付，真实基线待在具备 PG16 + Redis + :3000 的环境复跑**（见 deviation.md）。本文件不含任何伪造数值。

## 测量口径（脚本 `scripts/test/benchmark/ladder-1k.mjs`）

- 数据：临时库插入 1000 个 `AiModel`（`bench1k-` 前缀，厂商 `bench1k-vendor`，`sortOrder` ≥ 100000 排在真实种子后）+ 每模型 1 条 `Benchmark`（`sourceType=SELF`）；不进 seed。
- 接口：`GET /api/v1/ladder?type=models`，预热 1 次 + 串行采样 20 次（node fetch + `performance.now()`，未用 autocannon），nearest-rank p50/p95，另记 min/max/mean、响应字节、`total`。
- 页面：`GET /models` 首屏 HTML 字节（服务端返回体）与耗时。
- 清理：结束（含异常）按前缀删除插入模型（Benchmark 级联）与专用厂商；开跑前先清前次残留。
- 安全闸：`DATABASE_URL` 库名或主机须以分词形式含 `ci`/`test`，否则 exit 2 不连库（verify.txt 含两例拒绝取证）。

## 复跑命令

```bash
DATABASE_URL=postgresql://<user>:<pass>@localhost:5435/aidean_ci \
  node scripts/test/benchmark/ladder-1k.mjs --runs=20 --base=http://127.0.0.1:3000 \
  --out=docs/任务规划V0.10.0/06_validation/evidence/EVD-039/ladder-1k-baseline.md \
  --json=docs/任务规划V0.10.0/06_validation/evidence/EVD-039/ladder-1k-raw.json
```

`--out` 会以真实样本覆盖本文件（含原始样本与 p50/p95 表）。

## 结果

| 样本数 | p50 (ms) | p95 (ms) | /models HTML 字节 |
|---|---|---|---|
| 未测 | 未测 | 未测 | 未测 |
