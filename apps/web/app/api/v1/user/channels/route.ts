/**
 * /api/v1/user/channels — API 渠道聚合（乙 · 后端统一）。
 *
 * 返回「API 渠道」面板所需的全量渠道，`kind` 归一 `station`/`custom`：
 *  - `station` = 用户自有上游 Key（`station_user_keys` join `api_stations`，UPSTREAM 站点）；
 *  - `custom` = 用户自定义平台渠道（`custom_channels`）。
 *
 * 设计约定：
 *  - **数据库为唯一事实源**：不合成 `catalog:<code>` 伪行——未落库的平台不在渠道列表出现，
 *    用户在选择目录项后经 POST `/user/station-keys` 落库，列表自然出现；
 *  - **单次请求**：替代前端本地拼装 `/user/station-keys` + `/user/custom-channels` 两路；
 *  - **数据隔离**：`requireUserApi` + `where: { userId }` 双保险，仅本人可见；
 *  - **脱敏**：`apiKeyMasked` 为 key_mask 冗余列，明文/密文永不出 service 层。
 *
 * 鉴权：requireUserApi（管理面 cookie 会话）。
 */
import { requireUserApi } from "../../../../../lib/features/auth/session";
import { listApiChannels } from "../../../../../lib/features/apikey/channel-aggregate";
import { withApi } from "../../_lib/handler";

export const dynamic = "force-dynamic";

export const GET = withApi(async () => {
  const session = await requireUserApi();
  return { items: await listApiChannels(session.userId) };
});