/**
 * GET /api/v1/system/navigation — 一级导航公开端点。
 *
 * 验收（tasks.md SubTask 2.5.2）：导航顺序与常量一致；
 * 数据唯一来源 lib/navigation.ts 的 NAV_ITEMS（首页/资讯/产品/价格/文档/路线图/合作/关于）。
 * 2026-09-17 导航改版：一级「模型」→「资讯」；产品下拉=模型天梯图/模型服务提供商/AideanWiki。
 * 导航体验修订：八项契约（首位新增「首页」），「产品」含二级子项 AideanWiki
 * （children 字段可选，旧消费方按无 children 渲染不受影响）。
 */
import { withApi } from "../../_lib/handler";
import { NAV_ITEMS } from "../../../../../lib/navigation";

// withApi 会读取入站 request 头以贯穿 x-request-id，路由本身即依赖请求上下文，显式声明免构建期误判
export const dynamic = "force-dynamic";

export const GET = withApi(async () => NAV_ITEMS);
