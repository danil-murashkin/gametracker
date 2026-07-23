import { describe, expect, it } from 'vitest';
import { evaluateCondition, evaluateExpr, parseVal } from './expressions.js';
import { clamp } from './effects.js';
import { GameEngine } from './engine.js';
import type { CharacterModel, RecipeCatalog } from '../types.js';

const miniModel: CharacterModel = {
  scenario_name: 'test',
  stats: [
    { name: 'health', min: 0, max: 100, def: 50 },
    { name: 'max_health', min: 1, max: 100, def: 100 },
    { name: 'food', min: 0, max: 1000, def: 100 },
    { name: 'food_per_cyc', min: 0, max: 100, def: 10 },
    { name: 'is_dead', min: 0, max: 1, def: 0 },
    { name: 'mod_strength', min: -50, max: 50, def: 0 },
    { name: 'luck', min: 1, max: 10, def: 5 },
    { name: 'mod_luck', min: -50, max: 50, def: 0 },
    { name: 'party_king', min: 0, max: 1, def: 0 },
  ],
};

const miniCatalog: RecipeCatalog = {
  scenario_name: 'test',
  recipes: [
    {
      name: 'stimpak',
      type: 'inst',
      uses: 1,
      umax: 1,
      stat: 'health',
      val: '+35',
    },
    {
      name: 'mech_metabolism',
      type: 'pasv',
      stats: [
        { stat: 'food', val: '-(food_per_cyc)', tick: 1, try: -1, while: 'inact(is_dead)' },
      ],
    },
    {
      name: 'mech_starvation',
      type: 'pasv',
      stats: [
        {
          stat: 'health',
          val: '-1',
          tick: 1,
          try: -1,
          while: 'food <= 0 and inact(is_dead)',
        },
      ],
    },
    {
      name: 'buff_str',
      type: 'temp',
      uses: 0,
      umax: 0,
      stats: [{ stat: 'mod_strength', val: '+2', tick: 1, try: 3 }],
    },
  ],
};

function createEngine(): GameEngine {
  const engine = new GameEngine();
  engine.loadModel(miniModel);
  engine.loadCatalog(miniCatalog);
  engine.createFromModel();
  return engine;
}

describe('expressions', () => {
  it('evaluates comparisons and exs/act/inact', () => {
    const stats = [
      { name: 'health', val: 0 },
      { name: 'is_dead', val: 0 },
    ];
    expect(
      evaluateCondition('health <= 0 and inact(is_dead)', { stats }),
    ).toBe(true);
    expect(evaluateCondition('act(health)', { stats })).toBe(false);
    expect(evaluateCondition('exs(health)', { stats })).toBe(true);
    expect(evaluateCondition('inact(missing_flag)', { stats })).toBe(true);
  });

  it('parses val with expressions', () => {
    const stats = [{ name: 'max_health', val: 100 }];
    expect(parseVal('+(max_health/2)', { stats })).toEqual({ op: '+', amount: 50 });
    expect(parseVal('=1', { stats })).toEqual({ op: '=', amount: 1 });
  });

  it('supports rnd', () => {
    const value = evaluateExpr('rnd(10)', { stats: [], random: () => 0.5 });
    expect(value).toBe(5);
  });
});

describe('effects helpers', () => {
  it('clamps values', () => {
    expect(clamp(120, 0, 100)).toBe(100);
    expect(clamp(-5, 0, 100)).toBe(0);
  });
});

describe('GameEngine', () => {
  it('does not put catalog recipes into inventory on create', () => {
    const engine = createEngine();
    expect(engine.getSnapshot().inventory).toEqual([]);
    expect(engine.getCatalogRecipes().length).toBe(4);
  });

  it('ticks metabolism and clamps', () => {
    const engine = createEngine();
    engine.tick();
    const snap = engine.getSnapshot();
    expect(snap.stats.find((s) => s.name === 'food')?.val).toBe(90);
    expect(snap.stats.find((s) => s.name === 'health')?.val).toBe(50);
  });

  it('applies instant recipe effects and tracks inventory uses', () => {
    const engine = createEngine();
    const result = engine.applyRecipe('stimpak');
    expect(result.ok).toBe(true);
    expect(engine.getSnapshot().stats.find((s) => s.name === 'health')?.val).toBe(85);
    expect(engine.getSnapshot().inventory.find((r) => r.name === 'stimpak')?.remaining).toBe(0);
  });

  it('damages health when food is depleted', () => {
    const engine = createEngine();
    for (let i = 0; i < 11; i += 1) {
      engine.tick();
    }
    const health = engine.getSnapshot().stats.find((s) => s.name === 'health');
    expect(health?.val).toBeLessThan(50);
  });

  it('applies timed mod buffs after reset each tick', () => {
    const engine = createEngine();
    engine.applyRecipe('buff_str');

    engine.tick();
    expect(engine.getSnapshot().stats.find((s) => s.name === 'mod_strength')?.val).toBe(2);

    engine.tick();
    engine.tick();
    engine.tick();
    expect(engine.getSnapshot().effects.some((e) => e.recipe === 'buff_str')).toBe(false);
    expect(engine.getSnapshot().stats.find((s) => s.name === 'mod_strength')?.val).toBe(0);
  });
});
