/**
 * load-guard — 列表加载的晚到响应/中止守卫（#35④ useAdminList 底座）。
 *
 * 语义（R-83 压测教训的通用化）：每次 begin() 作废上一张票并中止其请求信号，
 * 仅最新票 isCurrent()===true；晚到的旧响应凭旧票一律丢弃，
 * 不得回写 rows/loading（否则会出现「只显示一半数据却被判为加载完成」）。
 */

export interface LoadTicket {
  /** 本次加载序号（严格递增） */
  token: number;
  /** 传给 fetch 的中止信号；begin()/abort() 会中止上一张票 */
  signal: AbortSignal;
  /** 是否仍为最新票且未被中止——只有 true 才允许回写状态 */
  isCurrent: () => boolean;
}

export interface LoadGuard {
  begin(): LoadTicket;
  abort(): void;
  /** 当前最新序号（测试/调试用） */
  currentToken(): number;
}

export function createLoadGuard(): LoadGuard {
  let seq = 0;
  let controller: AbortController | null = null;
  return {
    begin(): LoadTicket {
      controller?.abort();
      seq += 1;
      const token = seq;
      const own = new AbortController();
      controller = own;
      return { token, signal: own.signal, isCurrent: () => token === seq && !own.signal.aborted };
    },
    abort(): void {
      controller?.abort();
      controller = null;
    },
    currentToken: () => seq,
  };
}
