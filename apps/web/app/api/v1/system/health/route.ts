/**
 * GET /api/v1/system/health — 服务健康检查。
 *
 * 验收（tasks.md SubTask 2.5.2）：health = {status:"ok"}；附 ISO 时间戳。
 * force-dynamic：健康状态应反映实时时刻，禁止构建期预渲染固化时间值。
 */
import { withApi } from "../../_lib/handler";

export const dynamic = "force-dynamic";

export const GET = withApi(async () => ({
  status: "ok",
  time: new Date().toISOString(),
}));
