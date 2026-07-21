import type { StatInstance } from '../types.js';

export interface ConditionContext {
  stats: StatInstance[];
  hasRecipe: (name: string) => boolean;
  random?: () => number;
}

function getStatValue(stats: StatInstance[], name: string): number {
  return stats.find((s) => s.name === name)?.value ?? 0;
}

export function evaluateCondition(
  expr: string,
  ctx: ConditionContext,
): boolean {
  const trimmed = expr.trim();
  if (!trimmed) {
    return true;
  }

  let processed = trimmed.replace(
    /has\s*\(\s*"([^"]+)"\s*\)/g,
    (_, recipe: string) => (ctx.hasRecipe(recipe) ? '1' : '0'),
  );

  processed = processed.replace(/rnd\s*\(\s*(\d+)\s*\)/g, (_, max: string) => {
    const n = Number(max);
    const rnd = ctx.random ?? Math.random;
    return String(Math.floor(rnd() * n));
  });

  for (const stat of ctx.stats) {
    processed = processed.replace(
      new RegExp(`\\b${escapeRegExp(stat.name)}\\b`, 'g'),
      String(stat.value),
    );
  }

  if (!/^[\d\s.+*/%<>=!&|()-]+$/.test(processed)) {
    return false;
  }

  try {
    return Boolean(new Function(`return (${processed});`)());
  } catch {
    return false;
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function statValue(stats: StatInstance[], name: string): number {
  return getStatValue(stats, name);
}
