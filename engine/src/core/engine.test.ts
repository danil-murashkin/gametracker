import { describe, expect, it } from 'vitest';
import { evaluateCondition } from './conditions.js';
import { applyDelta, clamp } from './effects.js';
import { GameEngine } from './engine.js';
import type { CharacterModel } from '../types.js';

const miniModel: CharacterModel = {
  scenario_name: 'test',
  stats: [
    {
      name: 'health',
      kind: 'passive',
      min: 0,
      max: 100,
      default: 50,
      buff_rate: 0,
      buff_duration: 0,
      buff_coefficient: 1,
    },
    {
      name: 'food',
      kind: 'passive',
      min: 0,
      max: 1000,
      default: 100,
      buff_rate: -10,
      buff_duration: 0,
      buff_coefficient: 1,
    },
    {
      name: 'is_dead',
      kind: 'passive',
      min: 0,
      max: 1,
      default: 0,
      buff_rate: 0,
      buff_duration: 0,
      buff_coefficient: 1,
    },
  ],
  recipes: [
    {
      name: 'item_stimpak',
      kind: 'instant',
      uses: 1,
      uses_max: 1,
      duration_sec: 0,
      while: '',
      effects: { health: { value: 35 } },
      start: [],
      stop: [],
      triggers: [],
    },
    {
      name: 'mech_starvation_damage',
      kind: 'passive',
      uses: 0,
      uses_max: 0,
      duration_sec: 0,
      while: 'food <= 0 && is_dead == 0',
      effects: { health: { buff_rate: -1 } },
      start: [],
      stop: [],
      triggers: [],
    },
    {
      name: 'regen',
      kind: 'timed',
      uses: 0,
      uses_max: 0,
      duration_sec: 3,
      while: '',
      effects: { health: { buff_rate: 5 } },
      start: [],
      stop: [],
      triggers: [],
    },
  ],
};

describe('effects', () => {
  it('applies numeric deltas', () => {
    expect(applyDelta(10, 35)).toBe(45);
    expect(applyDelta(10, 0)).toBe(0);
    expect(applyDelta(10, -3)).toBe(7);
  });

  it('clamps values', () => {
    expect(clamp(120, 0, 100)).toBe(100);
    expect(clamp(-5, 0, 100)).toBe(0);
  });
});

describe('conditions', () => {
  it('evaluates comparisons and has()', () => {
    const stats = [{ name: 'health', value: 0, buff_rate: 0, buff_duration: 0, buff_coefficient: 1 }];
    expect(
      evaluateCondition('health <= 0 && is_dead == 0', {
        stats: [...stats, { name: 'is_dead', value: 0, buff_rate: 0, buff_duration: 0, buff_coefficient: 1 }],
        hasRecipe: () => false,
      }),
    ).toBe(true);
    expect(
      evaluateCondition('has("armor")', {
        stats,
        hasRecipe: (name) => name === 'armor',
      }),
    ).toBe(true);
  });
});

describe('GameEngine', () => {
  it('ticks stat rates and clamps', () => {
    const engine = new GameEngine();
    engine.loadModel(miniModel);
    engine.createFromModel();

    engine.tick();
    const health = engine.getSnapshot().stats.find((s) => s.name === 'health');
    const food = engine.getSnapshot().stats.find((s) => s.name === 'food');
    expect(food?.value).toBe(90);
    expect(health?.value).toBe(50);
  });

  it('applies instant recipe effects', () => {
    const engine = new GameEngine();
    engine.loadModel(miniModel);
    engine.createFromModel();

    const result = engine.applyRecipe('item_stimpak');
    expect(result.ok).toBe(true);
    expect(engine.getSnapshot().stats.find((s) => s.name === 'health')?.value).toBe(85);
  });

  it('activates while-passive recipe when food is depleted', () => {
    const engine = new GameEngine();
    engine.loadModel(miniModel);
    engine.createFromModel();

    for (let i = 0; i < 11; i += 1) {
      engine.tick();
    }

    const health = engine.getSnapshot().stats.find((s) => s.name === 'health');
    expect(health?.buff_rate).toBe(-1);
  });

  it('expires timed recipes', () => {
    const engine = new GameEngine();
    engine.loadModel(miniModel);
    engine.createFromModel();
    engine.applyRecipe('regen');

    for (let i = 0; i < 4; i += 1) {
      engine.tick();
    }

    expect(engine.getSnapshot().recipes.some((r) => r.name === 'regen')).toBe(false);
  });
});
