export interface FormulaContext {
  benchmark: number
  context: number
  speed: number
  price: number
}

const VARIABLE_MAP: Record<string, string> = {
  综合评分: 'benchmark',
  上下文长度: 'context',
  响应速度: 'speed',
  价格: 'price',
  benchmark: 'benchmark',
  context: 'context',
  speed: 'speed',
  price: 'price',
}

export function parseFormula(formula: string, ctx: FormulaContext): number {
  let expr = formula

  for (const [alias, key] of Object.entries(VARIABLE_MAP)) {
    const regex = new RegExp(`\\$\\{${alias}\\}`, 'g')
    expr = expr.replace(regex, String(ctx[key as keyof FormulaContext] ?? 0))
  }

  try {
    return safeEval(expr)
  } catch {
    return 0
  }
}

function safeEval(expr: string): number {
  const sanitized = expr.replace(/[^0-9+\-*/^().\s]/g, '')
  if (!sanitized || /^[\s\d+\-*/^().]+$/.test(sanitized) === false) {
    return 0
  }

  const tokens = tokenize(sanitized)
  return evaluate(tokens)
}

function tokenize(expr: string): string[] {
  const tokens: string[] = []
  let current = ''

  for (const char of expr) {
    if (/[\d.]/.test(char)) {
      current += char
    } else if (/[+\-*/^()]/.test(char)) {
      if (current) {
        tokens.push(current)
        current = ''
      }
      tokens.push(char)
    }
  }
  if (current) tokens.push(current)

  return tokens
}

function evaluate(tokens: string[]): number {
  let idx = 0

  function parseExpression(): number {
    let left = parseTerm()

    while (tokens[idx] === '+' || tokens[idx] === '-') {
      const op = tokens[idx++]
      const right = parseTerm()
      left = op === '+' ? left + right : left - right
    }

    return left
  }

  function parseTerm(): number {
    let left = parseFactor()

    while (tokens[idx] === '*' || tokens[idx] === '/') {
      const op = tokens[idx++]
      const right = parseFactor()
      left = op === '*' ? left * right : left / right
    }

    return left
  }

  function parseFactor(): number {
    const token = tokens[idx]

    if (token === '(') {
      idx++
      const result = parseExpression()
      idx++
      return result
    }

    if (token.includes('^')) {
      const [base, exp] = token.split('^')
      return Math.pow(parseFloat(base), parseFloat(exp))
    }

    idx++
    return parseFloat(token)
  }

  return parseExpression()
}

export function rankModels(
  models: Array<{ id: string; totalScore?: number | null; context?: number | null; inputPrice?: number | null }>,
  sortKey: string,
  direction: 'asc' | 'desc' = 'desc',
  customFormula?: string
): typeof models {
  const sorted = [...models].sort((a, b) => {
    let scoreA: number
    let scoreB: number

    if (customFormula) {
      const ctxA: FormulaContext = {
        benchmark: a.totalScore ?? 0,
        context: a.context ?? 0,
        speed: 0,
        price: a.inputPrice ?? 0,
      }
      const ctxB: FormulaContext = {
        benchmark: b.totalScore ?? 0,
        context: b.context ?? 0,
        speed: 0,
        price: b.inputPrice ?? 0,
      }
      scoreA = parseFormula(customFormula, ctxA)
      scoreB = parseFormula(customFormula, ctxB)
    } else {
      switch (sortKey) {
        case 'benchmark_desc':
        case 'benchmark':
          scoreA = a.totalScore ?? 0
          scoreB = b.totalScore ?? 0
          break
        case 'context_desc':
        case 'context':
          scoreA = a.context ?? 0
          scoreB = b.context ?? 0
          break
        case 'price_asc':
        case 'price':
          scoreA = a.inputPrice ?? 0
          scoreB = b.inputPrice ?? 0
          return direction === 'asc' ? scoreA - scoreB : scoreB - scoreA
        default:
          scoreA = a.totalScore ?? 0
          scoreB = b.totalScore ?? 0
      }
    }

    return direction === 'asc' ? scoreA - scoreB : scoreB - scoreA
  })

  return sorted
}
