/**
 * 资讯 Markdown 链接归一化（news-admin-cms 需求 3，纯函数、浏览器安全）。
 * 与 sanitize 解耦：服务端渲染与后台客户端预览共用本文件（单一真源）。
 *  1) 全角括号链接 `文本]（url）` → 半角 `文本](url)`；
 *  2) 链接目标含空格或任何括号时包 `<...>`，失衡括号不再截断链接；
 * 代码块（围栏与行内反引号）内的 ]( 不被改写。
 */

/** 全角括号链接：`]（ url ）`/`]（url）` → `](url)`（url 内不含全角括号时）。 */
export function normalizeFullWidthLinkParens(md: string): string {
  return md.replace(/(!?\[(?:[^[\]]|\\.)*\])\s*（\s*([^（）\s][^（）]*?)\s*）/g, "$1($2)");
}

export function isBalancedParens(s: string): boolean {
  let depth = 0;
  for (const c of s) {
    if (c === "(") depth++;
    else if (c === ")") depth--;
    if (depth < 0) return false;
  }
  return depth === 0;
}

function normalizeDestination(destInner: string): string {
  const trailingTitle = /\s+("[^"]*"|'[^']*'|\([^()]*\))\s*$/.exec(destInner);
  const title = trailingTitle ? trailingTitle[0] : "";
  const urlPart = (trailingTitle ? destInner.slice(0, trailingTitle.index) : destInner).trim();
  // 空 dest（`[]()`）或已用角括号包裹 → 原样保留；其余只要 URL 含空格或括号就包 `<...>`。
  if (!urlPart || urlPart.startsWith("<")) return destInner;
  const needsWrap = /[\s()]/.test(urlPart);
  const wrapped = needsWrap ? `<${urlPart}>` : urlPart;
  return title ? `${wrapped}${title}` : wrapped;
}

/** 对一段（已排除代码区的）文本，把所有 `](dest)` / `](dest "title")` 的问题 dest 包角括号。 */
function wrapProblematicDestinations(text: string): string {
  let out = "";
  let i = 0;
  while (i < text.length) {
    const idx = text.indexOf("](", i);
    if (idx === -1) {
      out += text.slice(i);
      break;
    }
    out += text.slice(i, idx + 2);
    // 扫描 dest：深度配对括号直到找到与 `](` 收尾的 `)`；遇换行/行尾视为未闭合，原样保留。
    let j = idx + 2;
    let depth = 0;
    let closed = false;
    while (j < text.length) {
      const c = text[j];
      if (c === "\n") break;
      if (c === "\\") {
        j += 2;
        continue;
      }
      if (c === "(") depth++;
      else if (c === ")") {
        if (depth === 0) {
          closed = true;
          break;
        }
        depth--;
      }
      j++;
    }
    if (!closed) {
      out += text.slice(idx + 2);
      return out;
    }
    const destInner = text.slice(idx + 2, j);
    out += normalizeDestination(destInner) + ")";
    i = j + 1;
  }
  return out;
}

/** 跳过围栏代码块与行内代码，仅对普通文本段应用 fn。 */
function outsideCode(md: string, fn: (t: string) => string): string {
  const lines = md.split("\n");
  let fence: string | null = null;
  const result = lines.map((line) => {
    const fenceMatch = /^\s*(```|~~~)/.exec(line);
    if (fenceMatch && (fence === null || fenceMatch[1] === fence)) {
      fence = fence === null ? fenceMatch[1] : null;
      return line;
    }
    if (fence !== null) return line;
    const parts = line.split(/(`[^`\n]+`|`+)/);
    return parts.map((part, k) => (k % 2 === 0 && !part.startsWith("`") ? fn(part) : part)).join("");
  });
  return result.join("\n");
}

export function normalizeNewsMarkdown(raw: string): string {
  return outsideCode(normalizeFullWidthLinkParens(raw), wrapProblematicDestinations);
}

/** 列表卡片摘要兜底：未填 summary 时取正文首个非标题行并去标记。 */
export function summarizeMarkdown(raw: string): string {
  const plain = raw
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`~]/g, "")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1");
  const line = plain.split("\n").map((s) => s.trim()).find(Boolean);
  return line ? line.slice(0, 120) : "";
}
