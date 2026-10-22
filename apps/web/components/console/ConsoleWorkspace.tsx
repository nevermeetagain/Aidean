"use client";

/**
 * 控制台工作区容器（redesign-console-workspace）。
 * - 五个功能板块点击切换、同屏单板块；其余板块以 hidden 保持挂载，
 *   保留 GeneralForm / ProPrioritiesList 草稿与 CallPlayground 状态。
 * - 「通用版/专业版」分段切换（ModeSwitch）右置于「模型配置」标题行；
 *   其余板块不展示版本切换。
 * - 键盘：tablist roving tabindex，左右方向键/Home/End 移动焦点；
 *   初始激活读 ?tab=（服务端忽略该参数），无参数默认「模型配置」。
 * - UX-16：切换 Tab 回写 ?tab=<id>（replace 语义，不新增历史条目），刷新/分享保持当前板块。
 *   采用 window.history.replaceState（Next 15 App Router 已与原生 history 集成，useSearchParams 同步），
 *   而非 router.replace：后者会对 force-dynamic 的 /user/console 触发一次 RSC 服务端重渲染（4 路取数），
 *   纯前端 Tab 切换无需服务端往返。
 *
 * 导航性能优化（2026-10-09）：
 * playground 面板加 playgroundMounted 门控——CallPlayground（898 行 + echarts）
 * 仅在用户首次点击「调用测试台」tab 时挂载，避免首屏即拉 /api/v1/models?pageSize=100。
 */
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

import { Button } from "@aidean/ui";

import { useConsoleStore } from "../../stores/consoleStore";
import { useFavoritesEnabled } from "../../hooks/useFavorites";
import { FavoritesPanel } from "./FavoritesPanel";
import { ModeSwitch, useConsoleMode } from "./GeneralForm";

export type ConsoleTabId = "config" | "quotas" | "platformKeys" | "apiChannels" | "playground" | "stats" | "favorites";

const BASE_TAB_ITEMS: ReadonlyArray<{ id: ConsoleTabId; label: string }> = [
  { id: "config", label: "模型配置" },
  { id: "quotas", label: "免费额度" },
  { id: "platformKeys", label: "平台渠道" },
  { id: "apiChannels", label: "外部渠道" },
  { id: "playground", label: "调用测试台" },
  { id: "stats", label: "统计报表" },
];
/** 「我的收藏」受 favorites.enabled 控制（契约⑥：关闭时 Tab 隐藏，但直链 ?tab=favorites 仍进面板显示禁用态） */
const FAVORITES_TAB = { id: "favorites" as const, label: "我的收藏" };
/** 全部合法 tab（深链 ?tab= 校验用，含 favorites，不受开关影响） */
const ALL_TAB_ITEMS: ReadonlyArray<{ id: ConsoleTabId; label: string }> = [...BASE_TAB_ITEMS, FAVORITES_TAB];

function isTabId(value: string): value is ConsoleTabId {
  return ALL_TAB_ITEMS.some((item) => item.id === value);
}

/** UX-16：把当前 Tab 回写到 ?tab=（替换当前历史条目，不新增；其余 query 原样保留） */
function syncTabToUrl(id: ConsoleTabId) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (url.searchParams.get("tab") === id) return;
  url.searchParams.set("tab", id);
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

/**
 * 模型配置「保存」按钮（T2）：读取当前形态表单经 consoleStore 注册的动作，渲染于版本切换左侧。
 * 无注册动作（表单未挂载）时不渲染；文案/disabled/saving 随表单态实时联动。data-testid 落在
 * 包裹 span 上（Button 组件 props 未声明 data-*，避免类型报错），e2e 可据此定位。
 */
function ConfigSaveButton() {
  const action = useConsoleStore((s) => s.configSave);
  if (!action) return null;
  return (
    <span data-testid="console-config-save" className="inline-flex">
      <Button
        type="button"
        variant="primary"
        onClick={action.onSave}
        disabled={action.disabled}
        className="whitespace-nowrap"
      >
        {action.saving ? action.savingLabel : action.idleLabel}
      </Button>
    </span>
  );
}

interface ConsoleWorkspaceProps {
  /** 通用版四档绑定（GeneralForm） */
  general: ReactNode;
  /** 专业版优先级编辑（ProPrioritiesList） */
  pro: ReactNode;
  /** 免费额度只读列表（服务端渲染区块） */
  quotas: ReactNode;
  /** 平台渠道（ApiKeysPanel；管理官方平台下发的 API Key） */
  platformKeys: ReactNode;
  /** 自有上游 Key（StationKeysPanel；面板内标题=「官方平台 Key」） */
  stationKeys: ReactNode;
  /** 调用测试台（CallPlayground 区块） */
  playground: ReactNode;
  /** 统计报表（UsageStatsPanel 区块；WF-22） */
  stats: ReactNode;
  /** 自定义渠道（CustomChannelsPanel 区块；WF-23，P7 CRUD 补全） */
  channels: ReactNode;
}

export function ConsoleWorkspace({
  general,
  pro,
  quotas,
  platformKeys,
  stationKeys,
  playground,
  stats,
  channels,
}: ConsoleWorkspaceProps) {
  const [active, setActive] = useState<ConsoleTabId>("config");
  const mode = useConsoleMode();
  const tabRefs = useRef<Partial<Record<ConsoleTabId, HTMLButtonElement | null>>>({});
  // 统计面板懒挂载（WF-22 / AT-22.1）：首次激活才渲染，避免隐藏面板在控制台首载即拉数；
  // 首次挂载后保持挂载，切换不丢区间选择状态。
  const [statsMounted, setStatsMounted] = useState(false);
  const [channelsMounted, setChannelsMounted] = useState(false);
  // playground 懒挂载（2026-10-09）：CallPlayground 898 行 + echarts + /api/v1/models 请求，
  // 首次点击「调用测试台」tab 才挂载，避免首屏即拉模型列表。
  const [playgroundMounted, setPlaygroundMounted] = useState(false);
  // 收藏 tab 受 favorites.enabled 控制 + 懒挂载（面板首激活才拉 /user/favorites）
  const favoritesEnabled = useFavoritesEnabled();
  const [favoritesMounted, setFavoritesMounted] = useState(false);
  // 可见 tab：开关关闭时隐藏「我的收藏」（深链 ?tab=favorites 仍可进入面板显示禁用态）
  const tabs = useMemo(
    () => (favoritesEnabled ? [...BASE_TAB_ITEMS, FAVORITES_TAB] : BASE_TAB_ITEMS),
    [favoritesEnabled],
  );
  // 深链 ?tab=<id>：仅客户端挂载时同步一次；无参/非法值回落「模型配置」
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("tab") ?? "";
    if (isTabId(fromUrl)) setActive(fromUrl);
  }, []);

  // 统计/渠道/playground/收藏 面板首次激活挂载（隐藏态不拉数）
  useEffect(() => {
    if (active === "stats") setStatsMounted(true);
    if (active === "apiChannels") setChannelsMounted(true);
    if (active === "playground") setPlaygroundMounted(true);
    if (active === "favorites") setFavoritesMounted(true);
  }, [active]);

  function select(id: ConsoleTabId, focus = false) {
    setActive(id);
    if (focus) tabRefs.current[id]?.focus();
    syncTabToUrl(id);
  }

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = tabs.length - 1;
    let target: number | null = null;
    if (event.key === "ArrowRight") target = index === last ? 0 : index + 1;
    else if (event.key === "ArrowLeft") target = index === 0 ? last : index - 1;
    else if (event.key === "Home") target = 0;
    else if (event.key === "End") target = last;
    if (target === null) return;
    event.preventDefault();
    select(tabs[target].id, true);
  }

  return (
    <div data-testid="console-workspace">
      {/* 标签栏：横向可滚动（窄屏），活动项主色胶囊；roving tabindex 键盘导航 */}
      <div
        role="tablist"
        aria-label="控制台功能板块"
        className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {tabs.map((item, index) => {
          const selected = active === item.id;
          return (
            <button
              key={item.id}
              ref={(node) => {
                tabRefs.current[item.id] = node;
              }}
              id={`console-tab-${item.id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`console-panel-${item.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => select(item.id)}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
              className={
                selected
                  ? "whitespace-nowrap rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors"
                  : "whitespace-nowrap rounded-lg px-4 py-2 text-sm text-slate-500 transition-colors hover:bg-muted hover:text-foreground"
              }
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* 模型配置：标题行 + 右置版本切换（仅此板块出现） */}
      <section
        role="tabpanel"
        id="console-panel-config"
        aria-labelledby="console-tab-config"
        hidden={active !== "config"}
        className="mt-6"
        data-testid="console-panel-config"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-foreground">模型配置</h2>
          {/* 动作栏：保存钮（置左）+ 版本切换（保持最右，守 e2e「切换器居标题行最右」断言） */}
          <div className="flex items-center gap-2">
            <ConfigSaveButton />
            <ModeSwitch />
          </div>
        </div>
        <div className="mt-4">{mode === "general" ? general : pro}</div>
      </section>

      {/* 其余四板块：保持挂载、hidden 切换 */}
      <section
        role="tabpanel"
        id="console-panel-quotas"
        aria-labelledby="console-tab-quotas"
        hidden={active !== "quotas"}
        className="mt-6"
        data-testid="console-panel-quotas"
      >
        {quotas}
      </section>
      <section
        role="tabpanel"
        id="console-panel-platformKeys"
        aria-labelledby="console-tab-platformKeys"
        hidden={active !== "platformKeys"}
        className="mt-6"
        data-testid="console-panel-platformKeys"
      >
        {platformKeys}
      </section>
      {/* 外部渠道（读侧合并：官方平台 Key + 自定义渠道；既有 panel id/testid 保持不变） */}
      <section
        role="tabpanel"
        id="console-panel-apiChannels"
        aria-labelledby="console-tab-apiChannels"
        hidden={active !== "apiChannels"}
        className="mt-6"
        data-testid="console-panel-apiChannels"
      >
        <div className="mb-3 rounded-lg border border-border bg-card p-3 text-sm text-slate-600">
          <p className="font-medium text-foreground">你自己买的各家 AI 服务钥匙，存到这里统一管理和调用</p>
          <p className="mt-1">
            有官方平台的钥匙就选上面，有第三方中转地址就选下面；用哪个都不花平台的钱。
          </p>
        </div>
        {stationKeys}
        {channels}
      </section>
      <section
        role="tabpanel"
        id="console-panel-channels"
        aria-labelledby="console-tab-apiChannels"
        hidden
        className="mt-6"
        data-testid="console-panel-channels"
      >
        {/* 性能探针锚点（e2e/perf/perf-probe.mjs:101 引用该 testid）；内容已并入 console-panel-apiChannels */}
      </section>
      <section
        role="tabpanel"
        id="console-panel-playground"
        aria-labelledby="console-tab-playground"
        hidden={active !== "playground"}
        className="mt-6"
        data-testid="console-panel-playground"
      >
        {playgroundMounted ? playground : null}
      </section>
      <section
        role="tabpanel"
        id="console-panel-stats"
        aria-labelledby="console-tab-stats"
        hidden={active !== "stats"}
        className="mt-6"
        data-testid="console-panel-stats"
      >
        {statsMounted ? stats : null}
      </section>
      {/* 我的收藏（TASK-023）：受 favorites.enabled 控制；懒挂载，首次激活才拉列表。
          开关关闭时 tab 按钮不渲染，但直链 ?tab=favorites 仍进此面板显示 favs-disabled 态 */}
      <section
        role="tabpanel"
        id="console-panel-favorites"
        aria-labelledby={favoritesEnabled ? "console-tab-favorites" : undefined}
        aria-label="我的收藏"
        hidden={active !== "favorites"}
        className="mt-6"
        data-testid="console-panel-favorites"
      >
        {favoritesMounted ? <FavoritesPanel /> : null}
      </section>
    </div>
  );
}
