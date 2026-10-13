/**
 * ladder URL 双向同步（Task L.4.1）：
 * - 读：挂载后一次性从 useSearchParams 回填 store（分享链接回放入口）；
 * - 写：store 变更后防抖 router.replace(`?${qs}`, { scroll: false })，
 *   不产生导航也不触发服务端重渲染；值未变化时跳过写回。
 *
 * 该 hook 只允许被客户端组件调用（含 useSearchParams，消费侧需置于 Suspense 边界内）。
 */
import { useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ladderFetchQuery,
  ladderUrlQuery,
  parseLadderQuery,
  useLadderStore,
} from "../stores/ladderStore";
import type { LadderPageType } from "../stores/ladderStore";

export function useLadderQuerySync(pageType: LadderPageType): void {
  const searchParams = useSearchParams();
  const router = useRouter();
  const filters = useLadderStore((s) => s.filters);
  const sort = useLadderStore((s) => s.sort);
  const customFormula = useLadderStore((s) => s.customFormula);
  const view = useLadderStore((s) => s.view);

  const urlQuery = useMemo(
    () => ladderUrlQuery(ladderFetchQuery(pageType, { filters, sort, customFormula }), view),
    [pageType, filters, sort, customFormula, view]
  );

  // 挂载读一次（init-once），此后仅 store → URL 单向
  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const patch = parseLadderQuery(searchParams);
    if (patch) useLadderStore.setState(patch);
    // 仅挂载初始化一次，不随 searchParams 迭代重放
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 防抖写回；首跑登记基线（此时地址栏天然与 store 一致），不做无效 replace
  const lastWritten = useRef<string | null>(null);
  useEffect(() => {
    if (lastWritten.current === null) {
      lastWritten.current = urlQuery;
      return;
    }
    if (lastWritten.current === urlQuery) return;
    const timer = setTimeout(() => {
      const target = `?${urlQuery}`;
      if (window.location.search !== target) {
        router.replace(target, { scroll: false });
      }
      lastWritten.current = urlQuery;
    }, 200);
    return () => clearTimeout(timer);
  }, [urlQuery, router]);
}
