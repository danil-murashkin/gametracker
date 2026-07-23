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
    const result = new Function(`return (${processed});`)();
    if (typeof result === 'boolean') {
      return result ? 1 : 0;
    }
    const num = Number(result);
    return Number.isFinite(num) ? num : 0;
  } catch {
    return 0;
  }
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
