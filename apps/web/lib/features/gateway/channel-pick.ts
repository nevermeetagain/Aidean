/**
 * 自定义渠道调度纯函数（N4 丙：模型匹配 + 优先级 + 加权分摊）。
 *
 * 解释 A（并发分摊）：同一次请求只选**一个**渠道（避免 fan-out 竞速与多模型并答，
 * 同时保住 usage_logs.requestId 唯一约束）；同级（同 priority）渠道按 weight 加权抽签，
 * 长期看各渠道承担流量与 weight 成正比。失败时按「同优先级重抽→降优先级」级联。
 *
 * 纯函数、无副作用，便于单测隔离。
 */

/** 渠道最小必要形状（调度只看这三个字段） */
export interface PickableChannel {
  id: string;
  priority: number;
  weight: number;
}

export interface PickOptions {
  /** 已剔除的渠道 id（本轮调度失败过的），默认 [] */
  excludeIds?: string[];
  /** 随机源，便于测试注入；默认 Math.random */
  random?: () => number;
}

/** 渠道是否服务请求模型：models 空 = 适配全部模型（向后兼容默认）；否则精确匹配 */
export function channelServesModel(
  model: string,
  models: string[] | undefined | null
): boolean {
  if (!models || models.length === 0) return true;
  return models.includes(model);
}

/** 加权抽签：返回被选中渠道的下标；权重和为 0 时退化为等概率 */
export function weightedPickIndex(
  weights: number[],
  random: () => number = Math.random
): number {
  const total = weights.reduce((s, w) => s + Math.max(0, w), 0);
  if (total <= 0) {
    // 全 0 权重：等概率退避
    return Math.floor(random() * weights.length);
  }
  let r = random() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= Math.max(0, weights[i]);
    if (r < 0) return i;
  }
  return weights.length - 1;
}

/**
 * 从候选中挑一个本轮尝试的渠道。
 * 输入须已按 priority 升序排列；优先在同优先级组内按 weight 加权抽签。
 * 返回 null 表示已无可用候选（本轮所有渠道尝试失败）。
 */
export function pickChannel(
  candidates: PickableChannel[],
  opts: PickOptions = {}
): PickableChannel | null {
  const excludeIds = new Set(opts.excludeIds ?? []);
  const available = candidates.filter((c) => !excludeIds.has(c.id));
  if (available.length === 0) return null;

  const groups = new Map<number, PickableChannel[]>();
  for (const c of available) {
    const g = groups.get(c.priority) ?? [];
    g.push(c);
    groups.set(c.priority, g);
  }
  const priorities = [...groups.keys()].sort((a, b) => a - b);
  for (const p of priorities) {
    const g = groups.get(p)!;
    if (g.length === 1) return g[0];
    const idx = weightedPickIndex(
      g.map((c) => Math.max(0, c.weight)),
      opts.random
    );
    return g[idx];
  }
  return null;
}