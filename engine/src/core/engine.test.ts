import { describe, expect, it } from 'vitest';
import characterJson from '@examples/fallout_demo/character.json';
import catalogJson from '@examples/fallout_demo/recipes.json';
import { evaluateCondition, evaluateExpr, parseVal } from './expressions.js';
import { clamp } from './effects.js';
import { GameEngine } from './engine.js';
import type { Character, CharacterModel, RecipeCatalog } from '../types.js';

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
    expect(evaluateExpr('4 * 246 / 250', { stats: [] })).toBe(3);
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
    engine.tick();
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

const falloutCharacter = characterJson as unknown as Character;
const falloutCatalog = catalogJson as unknown as RecipeCatalog;

function loadFallout(random: () => number = () => 0): GameEngine {
  const engine = new GameEngine(random);
  engine.loadCatalog(falloutCatalog);
  engine.loadCharacter(structuredClone(falloutCharacter));
  engine.applyWorldMechanics();
  return engine;
}

function stat(engine: GameEngine, name: string): number {
  return engine.getSnapshot().stats.find((item) => item.name === name)?.val ?? 0;
}

describe('fallout_demo expressions', () => {
  it('ticks metabolism from stat expressions', () => {
    const engine = loadFallout();
    engine.tick();
    expect(stat(engine, 'food')).toBe(49);
    expect(stat(engine, 'water')).toBe(27);
    expect(stat(engine, 'exhaustion')).toBe(0);
    expect(stat(engine, 'dehydration')).toBe(0);
    expect(stat(engine, 'max_health')).toBe(320);
    expect(stat(engine, 'mod_strength')).toBe(0);
  });

  it('raises exhaustion and dehydration icons when a reserve hits zero', () => {
    const engine = loadFallout();
    for (let tick = 0; tick < 10; tick += 1) {
      engine.tick();
    }
    expect(stat(engine, 'water')).toBe(0);
    expect(stat(engine, 'dehydration')).toBe(1);
    expect(stat(engine, 'exhaustion')).toBe(0);
    expect(stat(engine, 'health')).toBe(74);
    for (let tick = 0; tick < 40; tick += 1) {
      engine.tick();
    }
    expect(stat(engine, 'food')).toBe(0);
    expect(stat(engine, 'exhaustion')).toBe(1);
    expect(stat(engine, 'dehydration')).toBe(1);
  });

  it('heals a living human for half max health and a ghoul for a fifth of that', () => {
    const human = loadFallout();
    human.tick();
    human.applyRecipe('stimpak');
    human.tick();
    expect(stat(human, 'health')).toBe(235);

    const ghoul = loadFallout();
    const body = structuredClone(falloutCharacter);
    const race = body.stats.find((item) => item.name === 'race');
    if (!race) {
      throw new Error('race stat missing');
    }
    race.val = 1;
    ghoul.loadCharacter(body);
    ghoul.applyWorldMechanics();
    ghoul.tick();
    ghoul.applyRecipe('stimpak');
    ghoul.tick();
    expect(stat(ghoul, 'health')).toBe(110);
  });

  it('does not heal a dead character and sets death at zero health', () => {
    const engine = loadFallout();
    const body = structuredClone(falloutCharacter);
    const health = body.stats.find((item) => item.name === 'health');
    if (!health) {
      throw new Error('health stat missing');
    }
    health.val = 0;
    engine.loadCharacter(body);
    engine.applyWorldMechanics();
    engine.tick();
    expect(stat(engine, 'is_dead')).toBe(1);

    const before = stat(engine, 'health');
    const uses = engine.getSnapshot().inventory.find((item) => item.name === 'stimpak')?.remaining;
    const result = engine.applyRecipe('stimpak');
    expect(result.message).toBe('ПУСТО');
    expect(stat(engine, 'health')).toBe(before);
    expect(engine.getSnapshot().inventory.find((item) => item.name === 'stimpak')?.remaining).toBe(uses);
  });

  it('rolls addiction, refreshes it, and stops the debuff when the marker is cleared', () => {
    const hooked = loadFallout(() => 0.99);
    hooked.applyRecipe('nuka_cola');
    hooked.tick();
    expect(stat(hooked, 'hangover_nuka')).toBe(1);
    expect(hooked.getSnapshot().effects.some((effect) => effect.stat === 'mod_strength' && effect.while)).toBe(true);

    const sober = loadFallout(() => 0);
    sober.applyRecipe('nuka_cola');
    sober.tick();
    expect(sober.getSnapshot().stats.some((item) => item.name === 'hangover_nuka')).toBe(false);

    const king = loadFallout(() => 0.99);
    const body = structuredClone(falloutCharacter);
    const party = body.stats.find((item) => item.name === 'party_king');
    if (!party) {
      throw new Error('party_king stat missing');
    }
    party.val = 1;
    king.loadCharacter(body);
    king.applyWorldMechanics();
    king.applyRecipe('nuka_cola');
    king.tick();
    expect(king.getSnapshot().stats.some((item) => item.name === 'hangover_nuka')).toBe(false);

    expect(sober.applyRecipe('addictol').message).toBe('Не вышло');

    hooked.applyRecipe('addictol');
    hooked.tick();
    expect(stat(hooked, 'hangover_nuka')).toBe(0);
    const penalty = hooked.getSnapshot().effects.find((effect) => effect.recipe === 'nuka_cola' && effect.while);
    expect(penalty?.delay_left).toBe(0);
    expect(penalty?.retire).toBe(true);
    hooked.tick();
    expect(
      hooked.getSnapshot().effects.some((effect) => effect.recipe === 'nuka_cola' && effect.while),
    ).toBe(false);
  });

  it('stacks two recipes on one stat and restarts only the reapplied recipe', () => {
    const engine = loadFallout(() => 0.99);
    engine.applyRecipe('buffout');
    engine.applyRecipe('magazine_grognak');
    engine.applyRecipe('nuka_cola');
    engine.tick();
    expect(stat(engine, 'mod_strength')).toBe(4);
    expect(stat(engine, 'mod_endurance')).toBe(2);

    const debuff = () =>
      engine.getSnapshot().effects.find((effect) => effect.recipe === 'nuka_cola' && effect.stat === 'mod_strength');
    expect(debuff()?.delay_left).toBe(599);
    engine.applyRecipe('nuka_cola');
    expect(debuff()?.delay_left).toBe(600);
    expect(engine.getSnapshot().effects.some((effect) => effect.recipe === 'magazine_grognak')).toBe(true);
    expect(engine.getSnapshot().effects.some((effect) => effect.recipe === 'buffout')).toBe(true);
  });

  it('skips a perk-gated effect and scales rnd by coef', () => {
    const engine = loadFallout(() => 0);
    const repairAsk = engine.applyRecipe('repair_armor');
    expect(repairAsk.message).toBe('Есть 5 зарядов, что починить?');
    expect(stat(engine, 'armor_state')).toBe(0);
    expect(engine.getSnapshot().effects.some((effect) => effect.recipe === 'repair_armor')).toBe(false);

    const before = stat(engine, 'health');
    engine.applyRecipe('experiment_rnd');
    engine.tick();
    expect(stat(engine, 'health')).toBe(before + 6);
  });

  it('plays the scenario arc', () => {
    const rolls = [0, 0.99, 0.9];
    let roll = 0;
    const engine = loadFallout(() => rolls[roll++]);
    engine.tick();
    expect(stat(engine, 'max_health')).toBe(320);
    expect(stat(engine, 'health')).toBe(75);

    engine.applyRecipe('bobblehead_strength');
    engine.tick();
    expect(stat(engine, 'strength')).toBe(6);
    expect(stat(engine, 'max_health')).toBe(370);
    expect(engine.getLogs().some((entry) => entry.message === 'Ты стал сильнее. Сила +1')).toBe(true);

    const power = engine.applyRecipe('armor_power');
    expect(power.message).toBe('Не вышло. Ты слабый. Нужна сила 8');
    expect(stat(engine, 'armor_state')).toBe(0);
    expect(engine.getSnapshot().inventory.some((item) => item.name === 'armor_power')).toBe(false);

    engine.setStat('ble_rssi', -35);
    engine.applyRecipe('armor_light_phys');
    engine.tick();
    expect(stat(engine, 'armor_state')).toBe(250);
    expect(stat(engine, 'phys_resist')).toBe(4);
    expect(engine.getLogs().some((entry) => entry.message === 'Лёгкая броня одета')).toBe(true);
    engine.tick();
    expect(stat(engine, 'phys_resist')).toBe(4);

    engine.applyRecipe('armor_power');
    expect(stat(engine, 'armor_state')).toBe(250);
    expect(stat(engine, 'armor_phys')).toBe(4);

    const laser = engine.applyRecipe('laser_shot');
    expect(laser.message).toBe('Не вышло, ты не Инженер');
    expect(engine.getSnapshot().inventory.some((item) => item.name === 'laser_shot')).toBe(false);

    expect(stat(engine, 'perception')).toBe(5);
    engine.applyRecipe('sense_monsters');
    engine.tick();
    expect(stat(engine, 'phy_flag')).toBe(1);
    expect(stat(engine, 'monsters_seen')).toBe(1);
    expect(stat(engine, 'health')).toBe(75);
    engine.tick();
    expect(stat(engine, 'phy_flag')).toBe(0);

    engine.applyRecipe('stimpak');
    engine.tick();
    expect(stat(engine, 'health')).toBe(260);

    engine.applyRecipe('buffout');
    engine.applyRecipe('magazine_grognak');
    engine.tick();
    expect(stat(engine, 'mod_strength')).toBe(4);
    expect(stat(engine, 'mod_endurance')).toBe(2);
    expect(stat(engine, 'max_health')).toBe(770);

    const waterBeforeCola = stat(engine, 'water');
    engine.applyRecipe('nuka_cola');
    engine.applyRecipe('food_apple_pie');
    engine.tick();
    expect(stat(engine, 'health')).toBe(300);
    expect(stat(engine, 'rad_dose')).toBe(220);
    expect(stat(engine, 'max_health')).toBe(745);
    expect(stat(engine, 'water')).toBe(waterBeforeCola + 18000 - 3);
    expect(stat(engine, 'hangover_nuka')).toBe(1);

    for (let tick = 0; tick < 99; tick += 1) {
      engine.tick();
    }
    engine.applyRecipe('addictol');
    engine.tick();
    expect(stat(engine, 'hangover_nuka')).toBe(0);
    expect(engine.getSnapshot().effects.some((effect) => effect.while?.includes('hangover_nuka'))).toBe(true);
    engine.tick();
    expect(engine.getSnapshot().effects.some((effect) => effect.while?.includes('hangover_nuka'))).toBe(false);
    for (let tick = 102; tick < 702; tick += 1) {
      engine.tick();
    }
    expect(stat(engine, 'mod_strength')).toBe(2);

    engine.applyRecipe('gps_zone');
    engine.tick();
    expect(stat(engine, 'rad_seen')).toBe(1);
    expect(stat(engine, 'rad_dose')).toBe(320);
    expect(stat(engine, 'health')).toBe(300);

    engine.applyRecipe('shelter_near');
    engine.tick();
    engine.tick();
    expect(stat(engine, 'shelter')).toBe(1);
    expect(stat(engine, 'radio_rssi')).toBe(-60);
    const doseInShelter = stat(engine, 'rad_dose');
    engine.applyRecipe('gps_zone');
    engine.tick();
    expect(stat(engine, 'rad_dose')).toBe(doseInShelter);
    engine.applyRecipe('sense_monsters');
    engine.tick();
    expect(stat(engine, 'phy_flag')).toBe(1);
    expect(stat(engine, 'monsters_seen')).toBe(1);

    engine.applyRecipe('shelter_far');
    engine.tick();
    engine.tick();
    expect(stat(engine, 'shelter')).toBe(0);
    expect(stat(engine, 'health')).toBe(300);

    engine.applyRecipe('anomaly_phys');
    engine.tick();
    expect(stat(engine, 'health')).toBe(264);
    expect(stat(engine, 'armor_state')).toBe(246);
    engine.tick();
    expect(stat(engine, 'phys_resist')).toBe(3);

    const repair = engine.applyRecipe('repair_armor');
    expect(repair.message).toBe('Есть 5 зарядов, что починить?');
    expect(engine.getSnapshot().inventory.find((item) => item.name === 'repair_armor')?.remaining).toBe(5);
    engine.applyRecipe('repair_armor', { choice: 'armor' });
    engine.tick();
    expect(stat(engine, 'armor_state')).toBe(250);
    expect(engine.getSnapshot().inventory.find((item) => item.name === 'repair_armor')?.remaining).toBe(4);

    engine.applyRecipe('phys_blow');
    engine.tick();
    expect(stat(engine, 'health')).toBe(0);
    expect(stat(engine, 'is_dead')).toBe(1);
    expect(stat(engine, 'armor_state')).toBe(250);
    expect(engine.getLogs().some((entry) => entry.message === 'У Вас Инсульт. Вы умерли! Нам очень жаль :(')).toBe(true);
    const dose = stat(engine, 'rad_dose');
    const food = stat(engine, 'food');
    const water = stat(engine, 'water');
    const timers = engine.getSnapshot().effects.map((effect) => effect.try_left);
    for (let tick = 0; tick < 10; tick += 1) {
      engine.tick();
    }
    expect(stat(engine, 'health')).toBe(0);
    expect(stat(engine, 'armor_state')).toBe(250);
    expect(stat(engine, 'rad_dose')).toBe(dose);
    expect(stat(engine, 'food')).toBe(food);
    expect(stat(engine, 'water')).toBe(water);
    expect(engine.getSnapshot().effects.map((effect) => effect.try_left)).toEqual(timers);

    const stim = engine.getSnapshot().inventory.find((item) => item.name === 'stimpak')?.remaining;
    expect(engine.applyRecipe('stimpak').message).toBe('ПУСТО');
    expect(engine.getSnapshot().inventory.find((item) => item.name === 'stimpak')?.remaining).toBe(stim);
  });
});
