/**
 * ranking 排序公式安全求值器：白名单变量/运算符的递归下降 AST 求值。
 *
 * 安全红线：本文件绝不使用 eval 与 Function 动态构造执行体——前者要求生产 CSP 放开
 * unsafe-eval 而放大 XSS 损害半径，后者等价于向外部可控文本开放代码执行入口；
 * 白名单 AST 将可执行域严格收敛到四则运算。设计依据见 docs/product/modules/天梯模块设计文档.md §四。
 */

export class FormulaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FormulaError";
  }
}

type Token =
  | { kind: "num"; value: number }
  | { kind: "var"; name: string }
  | { kind: "op"; value: "+" | "-" | "*" | "/" }
  | { kind: "lp" }
  | { kind: "rp" };

type Node =
  | { kind: "num"; value: number }
  | { kind: "var"; name: string }
  | { kind: "binary"; op: "+" | "-" | "*" | "/"; left: Node; right: Node };

const VAR_NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
const NUMBER_RE = /^\d+(\.\d+)?$/;

/** tokenize：十进制数字字面量 / 变量 {x} / 运算符 + - * / / 括号；空白跳过；其余一律拒绝 */
function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") {
      i += 1;
      continue;
    }
    if ((ch >= "0" && ch <= "9") || ch === ".") {
      let j = i + 1;
      while (j < expr.length && ((expr[j] >= "0" && expr[j] <= "9") || expr[j] === ".")) j += 1;
      const raw = expr.slice(i, j);
      if (!NUMBER_RE.test(raw)) throw new FormulaError(`公式错误：非法数字 "${raw}"`);
      tokens.push({ kind: "num", value: Number.parseFloat(raw) });
      i = j;
      continue;
    }
    if (ch === "{") {
      const end = expr.indexOf("}", i);
      if (end === -1) throw new FormulaError("公式错误：括号不匹配");
      const name = expr.slice(i + 1, end).trim();
      if (!VAR_NAME_RE.test(name)) throw new FormulaError(`公式错误：未知变量 ${name}`);
      tokens.push({ kind: "var", name });
      i = end + 1;
      continue;
    }
    if (ch === "+" || ch === "-" || ch === "*" || ch === "/") {
      tokens.push({ kind: "op", value: ch });
      i += 1;
      continue;
    }
    if (ch === "(") {
      tokens.push({ kind: "lp" });
      i += 1;
      continue;
    }
    if (ch === ")") {
      tokens.push({ kind: "rp" });
      i += 1;
      continue;
    }
    throw new FormulaError(`公式错误：非法字符 ${ch}`);
  }
  return tokens;
}

/**
 * 递归下降 Parser：文法 expr（加减）→ term（乘除）→ factor（数字、变量或括号包裹的 expr）。
 * 不支持一元 +/-（因此连续运算符必然在 factor 处失败），负值请写作 (0-x)。
 */
class Parser {
  private pos = 0;

  constructor(private readonly tokens: Token[]) {}

  parse(): Node {
    if (this.tokens.length === 0) throw new FormulaError("公式错误：表达式为空");
    const node = this.parseExpr();
    if (this.pos < this.tokens.length) {
      throw new FormulaError("公式错误：存在多余的标记");
    }
    return node;
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private parseExpr(): Node {
    let left = this.parseTerm();
    for (;;) {
      const t = this.peek();
      if (t && t.kind === "op" && (t.value === "+" || t.value === "-")) {
        this.pos += 1;
        left = { kind: "binary", op: t.value, left, right: this.parseTerm() };
      } else {
        return left;
      }
    }
  }

  private parseTerm(): Node {
    let left = this.parseFactor();
    for (;;) {
      const t = this.peek();
      if (t && t.kind === "op" && (t.value === "*" || t.value === "/")) {
        this.pos += 1;
        left = { kind: "binary", op: t.value, left, right: this.parseFactor() };
      } else {
        return left;
      }
    }
  }

  private parseFactor(): Node {
    const t = this.tokens[this.pos];
    if (!t) throw new FormulaError("公式错误：表达式意外结束");
    this.pos += 1;
    if (t.kind === "num") return { kind: "num", value: t.value };
    if (t.kind === "var") return { kind: "var", name: t.name };
    if (t.kind === "lp") {
      const inner = this.parseExpr();
      const close = this.peek();
      if (!close || close.kind !== "rp") throw new FormulaError("公式错误：括号不匹配");
      this.pos += 1;
      return inner;
    }
    const shown = t.kind === "op" ? t.value : ")";
    throw new FormulaError(`公式错误：意外的标记 "${shown}"`);
  }
}

function evaluateNode(node: Node, vars: Record<string, number>): number {
  switch (node.kind) {
    case "num":
      return node.value;
    case "var": {
      const v = vars[node.name];
      if (v === undefined || v === null || !Number.isFinite(v)) {
        throw new FormulaError(`公式错误：未知变量 ${node.name}`);
      }
      return v;
    }
    case "binary": {
      const left = evaluateNode(node.left, vars);
      const right = evaluateNode(node.right, vars);
      switch (node.op) {
        case "+":
          return left + right;
        case "-":
          return left - right;
        case "*":
          return left * right;
        case "/":
          if (right === 0) throw new FormulaError("公式错误：除数为零");
          return left / right;
      }
    }
  }
}

const MAX_AST_CACHE = 128;
const astCache = new Map<string, Node>();

/** 编译公式为可复用闭包（AST 按表达式文本缓存；超出上限即整体清空，防自由文本撑爆内存） */
export function compileFormula(expr: string): (vars: Record<string, number>) => number {
  let ast = astCache.get(expr);
  if (!ast) {
    ast = new Parser(tokenize(expr)).parse();
    if (astCache.size >= MAX_AST_CACHE) astCache.clear();
    astCache.set(expr, ast);
  }
  const compiled = ast;
  return (vars: Record<string, number>) => evaluateNode(compiled, vars);
}

/** 一次性求值入口：evaluateFormula(expr, vars) → number，所有失败均抛 FormulaError */
export function evaluateFormula(expr: string, vars: Record<string, number>): number {
  return compileFormula(expr)(vars);
}
