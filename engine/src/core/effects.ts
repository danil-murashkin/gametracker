import {
  applyValToNumber,
  evaluateCondition,
  parseVal,
  type ExprContext,
} from './expressions.js';
import type {
  ActiveEffect,
  EffectDef,
  RecipeDef,
  StatDef,
  StatInstance,
} from '../types.js';

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function clampStat(stat: StatInstance, def?: StatDef): void {
  if (!def) {
    return;
  }
  stat.val = clamp(stat.val, def.min, def.max);
}

export function createStatInstances(defs: StatDef[]): StatInstance[] {
  return defs.map((def) => ({
    name: def.name,
    val: def.def,
  }));
}

export function ensureStat(
  stats: StatInstance[],
  statDefs: Map<string, StatDef>,
  name: string,
): StatInstance {
  let stat = stats.find((s) => s.name === name);
  if (stat) {
    return stat;
  }

  const def = statDefs.get(name);
  stat = {
    name,
    val: def?.def ?? 0,
  };
  stats.push(stat);
  return stat;
}

export function recipeEffects(recipe: RecipeDef): EffectDef[] {
  if (recipe.stats && recipe.stats.length > 0) {
    return recipe.stats;
  }
  if (recipe.stat && recipe.val !== undefined) {
    return [
      {
        stat: recipe.stat,
        val: recipe.val,
        delay: recipe.delay,
        coef: recipe.coef,
        tick: recipe.tick,
        try: recipe.try,
        if: recipe.if,
        while: recipe.while,
      },
    ];
  }
  return [];
}

export function createActiveEffect(
  recipeName: string,
  index: number,
  effect: EffectDef,
): ActiveEffect {
  const tick = effect.tick ?? 0;
  // Без tick — одно срабатывание; с tick — try из рецепта или бесконечно (-1)
  const tryCount = effect.try ?? (tick > 0 ? -1 : 1);
  return {
    id: `${recipeName}#${index}`,
    recipe: recipeName,
    index,
    stat: effect.stat,
    val: effect.val,
    delay_left: effect.delay ?? 0,
    tick,
    tick_acc: 0,
    try_left: tryCount,
    coef: effect.coef ?? 1,
    while: effect.while,
  };
}

export function fireEffect(
  effect: ActiveEffect,
  stats: StatInstance[],
  statDefs: Map<string, StatDef>,
  ctx: ExprContext,
): void {
  const parsed = parseVal(effect.val, ctx);
  parsed.amount *= effect.coef;
  const stat = ensureStat(stats, statDefs, effect.stat);
  stat.val = applyValToNumber(stat.val, parsed);
  clampStat(stat, statDefs.get(effect.stat));
}

/**
 * Один тик жизненного цикла эффекта.
 * Возвращает false, если эффект нужно снять.
 */
export function advanceEffect(
  effect: ActiveEffect,
  stats: StatInstance[],
  statDefs: Map<string, StatDef>,
  ctx: ExprContext,
): boolean {
  if (effect.delay_left > 0) {
    effect.delay_left -= 1;
    return true;
  }

  const interval = effect.tick > 0 ? effect.tick : 1;
  effect.tick_acc += 1;

  if (effect.tick_acc < interval) {
    return true;
  }
  effect.tick_acc = 0;

  // while ложно → этот тик не действует, но таймер try всё равно идёт
  if (!effect.while || evaluateCondition(effect.while, ctx)) {
    fireEffect(effect, stats, statDefs, ctx);
  }

  if (effect.try_left > 0) {
    effect.try_left -= 1;
    if (effect.try_left === 0) {
      return false;
    }
  }

  return true;
}

/** mod_* и *\_resist каждый тик сбрасываются к def (как MLP[8..14]/[21..23] в FT3). */
export function isEphemeralStat(name: string): boolean {
  return name.startsWith('mod_') || name.endsWith('_resist');
}

export function resetEphemeralStats(
  stats: StatInstance[],
  statDefs: Map<string, StatDef>,
): void {
  for (const def of statDefs.values()) {
    if (!isEphemeralStat(def.name)) {
      continue;
    }
    const stat = stats.find((s) => s.name === def.name);
    if (stat) {
      stat.val = def.def;
    }
  }
}
