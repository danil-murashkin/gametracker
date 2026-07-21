import type { StatDef, StatEffects, StatInstance, StatParam } from '../types.js';

const STAT_PARAMS: StatParam[] = [
  'value',
  'buff_rate',
  'buff_duration',
  'buff_coefficient',
];

export interface AppliedChange {
  statName: string;
  param: StatParam;
  before: number;
}

export function applyDelta(current: number, delta: number): number {
  if (delta === 0) {
    return 0;
  }
  return current + delta;
}

export function applyEffectsToStats(
  stats: StatInstance[],
  statDefs: Map<string, StatDef>,
  effects: Record<string, StatEffects>,
): AppliedChange[] {
  const changes: AppliedChange[] = [];

  for (const [statName, effect] of Object.entries(effects)) {
    const stat = stats.find((s) => s.name === statName);
    if (!stat) {
      continue;
    }

    for (const param of STAT_PARAMS) {
      if (effect[param] === undefined) {
        continue;
      }

      const before = stat[param];
      stat[param] = applyDelta(before, effect[param]!);
      changes.push({ statName, param, before });
    }

    clampStat(stat, statDefs.get(statName));
  }

  return changes;
}

export function revertChanges(
  stats: StatInstance[],
  statDefs: Map<string, StatDef>,
  changes: AppliedChange[],
): void {
  for (const change of [...changes].reverse()) {
    const stat = stats.find((s) => s.name === change.statName);
    if (!stat) {
      continue;
    }
    stat[change.param] = change.before;
    clampStat(stat, statDefs.get(change.statName));
  }
}

export function clampStat(stat: StatInstance, def?: StatDef): void {
  if (!def || def.kind === 'none') {
    return;
  }

  stat.value = clamp(stat.value, def.min, def.max);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function resetTemporaryBuffs(
  stat: StatInstance,
  def: StatDef,
): boolean {
  if (stat.buff_duration > 0) {
    return false;
  }

  let changed = false;
  if (stat.buff_rate !== def.buff_rate) {
    stat.buff_rate = def.buff_rate;
    changed = true;
  }
  if (stat.buff_coefficient !== def.buff_coefficient) {
    stat.buff_coefficient = def.buff_coefficient;
    changed = true;
  }
  return changed;
}

export function createStatInstances(defs: StatDef[]): StatInstance[] {
  return defs
    .filter((def) => def.kind !== 'none')
    .map((def) => ({
      name: def.name,
      value: def.default,
      buff_rate: def.buff_rate,
      buff_duration: def.buff_duration,
      buff_coefficient: def.buff_coefficient,
    }));
}
