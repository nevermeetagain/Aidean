/**
 * 天梯矩阵图纯布局数学（v2.1 定距档，自 components/ladder/LadderMatrixBoard.tsx 抽出）。
 *
 * 职责：给定排行 entries + 分度值 g，产出矩阵布局（左右列组 / 高度 / 轴刻度）。
 * 纯函数、零副作用、零网络——组件层（呈现）与本模块（计算）分离，便于单测。
 *
 * v2.1 定距档口径（spec: document-lessons-and-fix-granularity）：
 * - 分度值 g = 相邻两行之间的性能差值（行距）；
 * - 轴量程恒定 0→100：顶格恒 100（上拉到顶=100）、底格恒 0（下拉到底=0）；
 * - 刻度序列 [100, 100−g, …, 0]；100 不被 g 整除时末尾收敛到 0（如 g=3 → [100, 97, …, 1, 0]）；
 * - 档位行号 floor 自顶入档：第 k 行覆盖 (100−(k+1)·g, 100−k·g]；
 * - 以整数"百分位"参与运算（分数至多两位小数），规避浮点漂移。
 *
 * UX-07 轴顶规则（2026-10-22，用户裁定采纳调研报告建议；对应《界面交互文档》§三 2.4「顶格=最高综合分向上取整」）：
 * - 顶格 = 已载条目最高综合分向上取整到整数，再上取整到分度值 g 的整数倍，封顶 100（computeAxisTop）；
 *   例：最高 98、g=0.1 → 顶格 98（原恒 100 时首屏空 20 行）；最高 97.3、g=5 → 98 → 100。
 * - buildLayout 的 axisTopScore 缺省仍为 100（保持 v2.1 纯函数口径与既有单测）；天梯组件传入 computeAxisTop。
 * - 分带按分数自顶向下加载，首带即含最高分，故续载后轴顶不变、卡片行号跨带稳定。
 */
import type { LadderRankEntry } from "./types";

/** 行高（卡 44 + 上下间隙 8）：布局高度与组件内卡片定位共用同一常量 */
export const ROW_H = 52;

/**
 * 产品系列识别规则（对小写模型名顺序匹配，首个命中生效；兜底为厂商名）。
 * 规则顺序即优先级：GPT/o 系列归 ChatGPT，moonshot 并入 Kimi，abab 并入 MiniMax 等。
 */
const SERIES_RULES: Array<[RegExp, string]> = [
  [/gpt|^o\d/, "ChatGPT"],
  [/claude/, "Claude"],
  [/gemini/, "Gemini"],
  [/gemma/, "Gemma"],
  [/llama/, "Llama"],
  [/imagen/, "Imagen"],
  [/dall-e/, "DALL-E"],
  [/sora/, "Sora"],
  [/whisper/, "Whisper"],
  [/phi/, "Phi"],
  [/copilot/, "Copilot"],
  [/florence/, "Florence"],
  [/mistral|mixtral/, "Mistral"],
  [/grok/, "Grok"],
  [/command/, "Command"],
  [/jamba/, "Jamba"],
  [/jurassic/, "Jurassic"],
  [/stable/, "Stable Diffusion"],
  [/deepseek/, "DeepSeek"],
  [/qwen/, "Qwen"],
  [/bge/, "BGE"],
  [/doubao/, "豆包"],
  [/ernie/, "文心一言"],
  [/glm|cogvlm/, "GLM"],
  [/minimax|abab/, "MiniMax"],
  [/^yi[-\s]/, "Yi"],
  [/kimi|moonshot/, "Kimi"],
  [/spark/, "星火"],
  [/sense/, "日日新"],
  [/hunyuan/, "混元"],
  [/pangu/, "盘古"],
  [/embed/, "Embedding"],
  [/rerank/, "Rerank"],
];

function deriveSeries(modelName: string, vendorName: string): string {
  const lowered = modelName.toLowerCase();
  for (const [pattern, label] of SERIES_RULES) {
    if (pattern.test(lowered)) return label;
  }
  return vendorName;
}

export interface MatrixColumn {
  /** 厂商+系列 唯一键 */
  key: string;
  /** 列头展示名（产品系列名；stations 为站名） */
  series: string;
  vendorName: string;
  brandColor: string | null;
  /** 厂商展示优先级（列内各行同厂商恒同值；v1.9 贴轴排序键） */
  vendorPriority: number;
  /** 厂商等级（vendors.tierLevel，1 为头部厂商标度；WP-FE01 起作为列序确定性兜底键） */
  vendorTierLevel: number;
  /** 列内卡片：row 为全局档位行号（已做列内碰撞下移） */
  cells: Array<{ entry: LadderRankEntry; row: number }>;
  /** 列内最高综合分（同优先级并列时次级排序依据） */
  topScore: number;
}

export interface ScoreTick {
  row: number;
  score: number;
}

export interface MatrixLayout {
  /** true=双侧阵营（左国外右国内）；false=单侧（stations 或单阵营数据） */
  split: boolean;
  left: MatrixColumn[];
  right: MatrixColumn[];
  height: number;
  ticks: ScoreTick[];
  granularity: number;
}

function buildColumns(entries: LadderRankEntry[], bandOf: (v: number) => number, useSeries: boolean): MatrixColumn[] {
  const groups = new Map<string, MatrixColumn>();
  for (const entry of entries) {
    const series = useSeries ? deriveSeries(entry.modelName, entry.vendorName) : entry.vendorName;
    const key = `${entry.vendorId}::${series}`;
    let col = groups.get(key);
    if (!col) {
      col = {
        key,
        series,
        vendorName: entry.vendorName,
        brandColor: entry.vendorBrandColor,
        vendorPriority: entry.vendorPriority,
        vendorTierLevel: entry.vendorTierLevel,
        cells: [],
        topScore: entry.score.composite,
      };
      groups.set(key, col);
    }
    col.cells.push({ entry, row: 0 });
    if (entry.score.composite > col.topScore) col.topScore = entry.score.composite;
  }

  const cols = [...groups.values()];
  for (const col of cols) {
    // 列内按综合分降序落位；档位行号碰撞时下移一行，保证同列卡片永不重叠。
    // modelId 为最终兜底键（同分同名模型仍可稳定定序），消除依赖插入顺序的隐性不确定性。
    col.cells.sort(
      (a, b) =>
        b.entry.score.composite - a.entry.score.composite ||
        a.entry.modelName.localeCompare(b.entry.modelName, "zh-Hans-CN") ||
        a.entry.modelId.localeCompare(b.entry.modelId)
    );
    let prev = -1;
    for (const cell of col.cells) {
      prev = Math.max(bandOf(cell.entry.score.composite), prev + 1);
      cell.row = prev;
    }
  }
  return cols;
}

/** UX-07：轴顶 = ceil(最高综合分) 再上取整到 g 的整数倍，封顶 100；无条目时 100 */
export function computeAxisTop(entries: LadderRankEntry[], granularity: number): number {
  if (!entries.length) return 100;
  const bandCents = Math.max(1, Math.round(Math.max(granularity, 0.01) * 100));
  let maxCents = 0;
  for (const e of entries) {
    const c = Math.min(10000, Math.max(0, Math.round(e.score.composite * 100)));
    if (c > maxCents) maxCents = c;
  }
  const intCeil = Math.ceil(maxCents / 100) * 100;
  const aligned = Math.ceil(intCeil / bandCents) * bandCents;
  return Math.min(10000, Math.max(bandCents, aligned)) / 100;
}

export function buildLayout(
  entries: LadderRankEntry[],
  useSeries: boolean,
  granularity: number,
  /** v2.7 渐进轴底（分数）：轴只铺已加载区间 [axisFloor, 100]，随分带加载向下生长（缺省 0=全量程） */
  axisFloorScore = 0,
  /** UX-07 轴顶（分数）：缺省 100（v2.1 恒 100 口径）；天梯组件传 computeAxisTop(entries, g) */
  axisTopScore = 100
): MatrixLayout | null {
  if (!entries.length) return null;

  // v2.1 定距档（用户口径修订）：分度值 = 相邻两行的性能差值；
  // v2.7 渐进轴：轴量程 = [axisFloorScore, 100]——顶格恒 100、底格=已载下界（band.gte），
  // 随分带加载向下生长（80→60→…→0），滚动条长度与已载内容一致（经典无限滚动形态）；
  // 触底判定（距容器底 <阈值）由此自然锚定「已载末行」，不再出现「人未到末行、轴底先触底」。
  // 刻度序列 [100, 100−g, …, axisFloor]；100 不被 g 整除时末尾收敛到 axisFloor（如 g=3、floor=1 → […, 4, 1]）；
  // 档位行号 floor 自顶入档：第 k 行覆盖 (100−(k+1)·g, 100−k·g]（与全量程同构，卡片行号跨带稳定）；
  // 以整数"百分位"参与运算（分数至多两位小数），规避浮点漂移。
  const bandSize = Math.max(granularity, 0.01);
  const bandCents = Math.max(1, Math.round(bandSize * 100));
  const floorCents = Math.min(10000, Math.max(0, Math.round(axisFloorScore * 100)));
  // 轴顶（UX-07）：不低于「轴底 + 一档」，不高于 100
  const topCents = Math.min(10000, Math.max(Math.round(axisTopScore * 100), floorCents + bandCents));
  const bandCount = Math.max(1, Math.ceil((topCents - floorCents) / bandCents));
  // 档位行号：第 k 行覆盖 (T−(k+1)·g, T−k·g]（T=轴顶），自顶向下取整入档（恰在刻度值上的分数归属其所在行）
  const bandOf = (v: number): number => {
    const cents = Math.min(topCents, Math.max(0, Math.round(v * 100)));
    return Math.min(bandCount - 1, Math.floor((topCents - cents) / bandCents));
  };

  const dom = entries.filter((e) => e.vendorCountry === "CN");
  const intl = entries.filter((e) => e.vendorCountry !== "CN");

  /**
   * v1.9 优先级贴轴 + WP-FE01 确定性全序：
   *   vendorPriority 升序（数值越小越贴轴）→ 列内最高分降序 → vendorTierLevel 升序（1 为头部厂商）
   *   → 系列名升序。前两键在实际数据下即已定序（seed 全部厂商 priority=50 时退化为纯分数序），
   *   tierLevel/系列名仅作「同分同优先级」的确定性兜底，保证同一入参恒得同一列序（缓存一致性前提）。
   * 该比较器对左右两侧通用：右组（国内）正序排=最高优先级居首贴轴；左组（国外）同序排=最高优先级居末贴轴。
   */
  const byPriorityNearAxis = (a: MatrixColumn, b: MatrixColumn): number =>
    a.vendorPriority - b.vendorPriority ||
    b.topScore - a.topScore ||
    a.vendorTierLevel - b.vendorTierLevel ||
    a.series.localeCompare(b.series, "zh-Hans-CN");

  const domCols = buildColumns(dom, bandOf, useSeries).sort(byPriorityNearAxis);
  const intlCols = buildColumns(intl, bandOf, useSeries).sort(byPriorityNearAxis);
  const split = domCols.length > 0 && intlCols.length > 0;

  // 双侧：左=国外、右=国内，两组同序（优先级升序）——最高优先级各自贴轴；
  // 单侧（stations 或单阵营）：按贴轴序交替分列——第 1 强贴轴右、第 2 强贴轴左，向两缘依次铺开。
  let left: MatrixColumn[];
  let right: MatrixColumn[];
  if (split) {
    left = intlCols;
    right = domCols;
  } else {
    const all = [...intlCols, ...domCols].sort(byPriorityNearAxis);
    right = all.filter((_, i) => i % 2 === 0);
    left = all.filter((_, i) => i % 2 === 1).reverse();
  }

  // 轴刻度（v2.1 / v2.7 渐进轴）：每行一枚、全部标注性能值——顶=100、底=axisFloorScore；
  // 底边刻度贴齐容器底缘（row=bandCount）。轴底随分带加载下移（80→60→…→0）
  const ticks: ScoreTick[] = [];
  for (let k = 0; k < bandCount; k += 1) {
    ticks.push({ row: k, score: (topCents - k * bandCents) / 100 });
  }
  ticks.push({ row: bandCount, score: floorCents / 100 });

  return {
    split,
    left,
    right,
    height: bandCount * ROW_H,
    ticks,
    granularity: bandSize,
  };
}
