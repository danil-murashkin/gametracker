import type { StatInstance } from '../types.js';

export interface ExprContext {
  stats: StatInstance[];
  random?: () => number;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function hasStat(stats: StatInstance[], name: string): boolean {
  return stats.some((s) => s.name === name);
}

export function getStatVal(stats: StatInstance[], name: string): number {
  return stats.find((s) => s.name === name)?.val ?? 0;
}

/** exs(name) — стат есть (в т.ч. значение 0). */
export function exs(stats: StatInstance[], name: string): boolean {
  return hasStat(stats, name);
}

/** act(name) — стат есть и val != 0. */
export function act(stats: StatInstance[], name: string): boolean {
  return hasStat(stats, name) && getStatVal(stats, name) !== 0;
}

/** inact(name) — стата нет или val == 0. */
export function inact(stats: StatInstance[], name: string): boolean {
  return !act(stats, name);
}

/**
 * Вычисляет числовое/логическое выражение.
 * Поддержка: exs/act/inact, rnd(n), rnd(a,b), имена статов, and/or/not, сравнения.
 */
export function evaluateExpr(expr: string, ctx: ExprContext): number {
  const trimmed = expr.trim();
  if (!trimmed) {
    return 1;
  }

  const rnd = ctx.random ?? Math.random;
  let processed = trimmed;

  processed = processed.replace(
    /\bexs\s*\(\s*([a-zA-Z_][\w]*)\s*\)/g,
    (_, name: string) => (exs(ctx.stats, name) ? '1' : '0'),
  );
  processed = processed.replace(
    /\bact\s*\(\s*([a-zA-Z_][\w]*)\s*\)/g,
    (_, name: string) => (act(ctx.stats, name) ? '1' : '0'),
  );
  processed = processed.replace(
    /\binact\s*\(\s*([a-zA-Z_][\w]*)\s*\)/g,
    (_, name: string) => (inact(ctx.stats, name) ? '1' : '0'),
  );

  processed = processed.replace(
    /\brnd\s*\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)/g,
    (_, a: string, b: string) => {
      const lo = Number(a);
      const hi = Number(b);
      return String(lo + Math.floor(rnd() * (hi - lo + 1)));
    },
  );
  processed = processed.replace(/\brnd\s*\(\s*(-?\d+)\s*\)/g, (_, n: string) => {
    const max = Number(n);
    return String(Math.floor(rnd() * max));
  });

  processed = processed.replace(/\band\b/gi, '&&');
  processed = processed.replace(/\bor\b/gi, '||');
  processed = processed.replace(/\bnot\b/gi, '!');

  // Сравнения: одиночный `=` → `==` (не трогаем `!=`, `<=`, `>=`, `==`)
  processed = processed.replace(/(?<![!<>=])=(?!=)/g, '==');

  const names = [...ctx.stats.map((s) => s.name)].sort((a, b) => b.length - a.length);
  for (const name of names) {
    processed = processed.replace(
      new RegExp(`\\b${escapeRegExp(name)}\\b`, 'g'),
      String(getStatVal(ctx.stats, name)),
    );
  }

  if (!/^[\d\s.+*/%<>=!&|()?-]+$/.test(processed)) {
    return 0;
  }

  try {
    return evalSanitized(processed);
  } catch {
    return 0;
  }
}

/** Целочисленное деление с усечением к нулю, как в эталоне ПДА. */
function evalSanitized(expr: string): number {
  let i = 0;
  const s = expr;
  const skip = () => {
    while (s[i] === ' ') {
      i += 1;
    }
  };
  const parseOr = (): number => {
    let value = parseAnd();
    skip();
    while (s.startsWith('||', i)) {
      i += 2;
      const right = parseAnd();
      value = value !== 0 || right !== 0 ? 1 : 0;
      skip();
    }
    return value;
  };
  const parseAnd = (): number => {
    let value = parseNot();
    skip();
    while (s.startsWith('&&', i)) {
      i += 2;
      const right = parseNot();
      value = value !== 0 && right !== 0 ? 1 : 0;
      skip();
    }
    return value;
  };
  const parseNot = (): number => {
    skip();
    if (s[i] === '!' && s[i + 1] !== '=') {
      i += 1;
      return parseNot() === 0 ? 1 : 0;
    }
    return parseCmp();
  };
  const parseCmp = (): number => {
    let value = parseAdd();
    skip();
    const op = s.startsWith('==', i)
      ? '=='
      : s.startsWith('!=', i)
        ? '!='
        : s.startsWith('<=', i)
          ? '<='
          : s.startsWith('>=', i)
            ? '>='
            : s[i] === '<'
              ? '<'
              : s[i] === '>'
                ? '>'
                : '';
    if (!op) {
      return value;
    }
    i += op.length;
    const right = parseAdd();
    const ok =
      op === '==' ? value === right
      : op === '!=' ? value !== right
      : op === '<=' ? value <= right
      : op === '>=' ? value >= right
      : op === '<' ? value < right
      : value > right;
    return ok ? 1 : 0;
  };
  const parseAdd = (): number => {
    let value = parseMul();
    skip();
    while (s[i] === '+' || s[i] === '-') {
      const op = s[i];
      i += 1;
      const right = parseMul();
      value = op === '+' ? value + right : value - right;
      skip();
    }
    return value;
  };
  const parseMul = (): number => {
    let value = parseUnary();
    skip();
    while (s[i] === '*' || s[i] === '/' || s[i] === '%') {
      const op = s[i];
      i += 1;
      const right = parseUnary();
      if (op === '*') {
        value *= right;
      } else if (op === '%') {
        value = right === 0 ? 0 : value % right;
      } else {
        value = right === 0 ? 0 : Math.trunc(value / right);
      }
      skip();
    }
    return value;
  };
  const parseUnary = (): number => {
    skip();
    if (s[i] === '+') {
      i += 1;
      return parseUnary();
    }
    if (s[i] === '-' && s[i + 1] !== '-') {
      i += 1;
      return -parseUnary();
    }
    return parsePrimary();
  };
  const parsePrimary = (): number => {
    skip();
    if (s[i] === '(') {
      i += 1;
      const value = parseOr();
      skip();
      if (s[i] === ')') {
        i += 1;
      }
      return value;
    }
    const start = i;
    if (s[i] === '-' ) {
      i += 1;
    }
    while ((s[i] >= '0' && s[i] <= '9') || s[i] === '.') {
      i += 1;
    }
    const num = Number(s.slice(start, i));
    if (!Number.isFinite(num)) {
      throw new Error(`bad number: ${expr}`);
    }
    return num;
  };
  const value = parseOr();
  skip();
  if (i !== s.length) {
    throw new Error(`tail: ${s.slice(i)}`);
  }
  return Number.isFinite(value) ? value : 0;
}

export function evaluateCondition(expr: string, ctx: ExprContext): boolean {
  if (!expr.trim()) {
    return true;
  }
  return evaluateExpr(expr, ctx) !== 0;
}

export interface ValResult {
  op: '+' | '-' | '=';
  amount: number;
}

/** Разбор val: "+40", "-2", "=1", "+rnd(10)", "+(max_health/2)". */
export function parseVal(val: string, ctx: ExprContext): ValResult {
  const trimmed = val.trim();
  const op = trimmed[0];
  if (op !== '+' && op !== '-' && op !== '=') {
    throw new Error(`val must start with + / - / =: ${val}`);
  }
  const body = trimmed.slice(1).trim();
  if (!body) {
    return { op, amount: 0 };
  }
  const amount = evaluateExpr(body, ctx);
  return { op, amount };
}

export function applyValToNumber(current: number, parsed: ValResult): number {
  switch (parsed.op) {
    case '+':
      return current + parsed.amount;
    case '-':
      return current - parsed.amount;
    case '=':
      return parsed.amount;
  }
}
