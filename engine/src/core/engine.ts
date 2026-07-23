import { evaluateCondition, type ExprContext } from './expressions.js';
import {
  advanceEffect,
  createActiveEffect,
  createStatInstances,
  fireEffect,
  recipeEffects,
  resetEphemeralStats,
} from './effects.js';
import type {
  ActiveEffect,
  ApplyRecipeResult,
  Character,
  CharacterInstance,
  CharacterModel,
  EngineLogEntry,
  RecipeCatalog,
  RecipeDef,
  Snapshot,
  StatDef,
} from '../types.js';

export class GameEngine {
  private model: CharacterModel | null = null;
  private catalog: RecipeCatalog | null = null;
  private instance: CharacterInstance | null = null;
  private effects: ActiveEffect[] = [];
  private statDefs = new Map<string, StatDef>();
  private recipeDefs = new Map<string, RecipeDef>();
  private tickCount = 0;
  private logs: EngineLogEntry[] = [];
  private random: () => number;

  constructor(random: () => number = Math.random) {
    this.random = random;
  }

  loadCharacter(character: Character): void {
    this.loadModel({
      scenario_name: character.scenario_name,
      stats: character.stats,
    });
    this.loadInstance({
      scenario_name: character.scenario_name,
      instance_id: character.instance_id,
      stats: character.stats.map((stat) => ({
        name: stat.name,
        val: stat.val ?? stat.def,
      })),
      inventory: character.inventory ?? [],
      effects: character.effects ?? [],
    });
  }

  loadModel(model: CharacterModel): void {
    this.model = structuredClone(model);
    this.statDefs = new Map(model.stats.map((stat) => [stat.name, stat]));
  }

  loadCatalog(catalog: RecipeCatalog): void {
    if (this.model && catalog.scenario_name !== this.model.scenario_name) {
      throw new Error(
        `Scenario mismatch: catalog ${catalog.scenario_name} vs model ${this.model.scenario_name}`,
      );
    }
    this.catalog = structuredClone(catalog);
    this.recipeDefs = new Map(catalog.recipes.map((recipe) => [recipe.name, recipe]));
  }

  loadInstance(instance: CharacterInstance): void {
    if (!this.model) {
      throw new Error('Load model before instance');
    }
    if (instance.scenario_name !== this.model.scenario_name) {
      throw new Error(
        `Scenario mismatch: ${instance.scenario_name} vs ${this.model.scenario_name}`,
      );
    }

    this.instance = structuredClone(instance);
    this.effects = structuredClone(instance.effects ?? []);
    this.tickCount = 0;
    this.logs = [];
    this.log('info', 'Loaded character instance');
  }

  /** Пассивная механика мира из каталога (umax=0), без попадания в инвентарь. */
  applyWorldMechanics(): void {
    this.ensureCatalog();
    for (const recipe of this.catalog!.recipes) {
      if (recipe.type === 'pasv' && (recipe.umax ?? 0) === 0) {
        this.applyRecipe(recipe.name, { free: true, inventory: false });
      }
    }
  }

  createFromModel(instanceId = 'sim-001'): CharacterInstance {
    if (!this.model) {
      throw new Error('Load model first');
    }
    this.ensureCatalog();

    const instance: CharacterInstance = {
      scenario_name: this.model.scenario_name,
      instance_id: instanceId,
      stats: createStatInstances(this.model.stats),
      inventory: [],
      effects: [],
    };

    this.loadInstance(instance);
    this.applyWorldMechanics();
    return this.getInstanceCopy();
  }

  getLogs(): EngineLogEntry[] {
    return [...this.logs];
  }

  getSnapshot(): Snapshot {
    this.ensureReady();
    return {
      tick: this.tickCount,
      scenario_name: this.instance!.scenario_name,
      stats: structuredClone(this.instance!.stats),
      inventory: structuredClone(this.instance!.inventory),
      effects: structuredClone(this.effects),
    };
  }

  getInstanceCopy(): CharacterInstance {
    this.ensureReady();
    return {
      ...structuredClone(this.instance!),
      effects: structuredClone(this.effects),
    };
  }

  /** Полный каталог сценария (для UI «найти тег»). */
  getCatalogRecipes(): RecipeDef[] {
    return this.catalog ? [...this.catalog.recipes] : [];
  }

  applyRecipe(
    recipeName: string,
    options: { free?: boolean; inventory?: boolean } = {},
  ): ApplyRecipeResult {
    this.ensureReady();
    this.ensureCatalog();
    const recipe = this.recipeDefs.get(recipeName);
    if (!recipe || recipe.type === 'none') {
      return { ok: false, message: `Recipe not found: ${recipeName}` };
    }

    const trackInventory = options.inventory !== false;
    const umax = recipe.umax ?? 0;
    let entry = this.instance!.inventory.find((r) => r.name === recipeName);

    if (!options.free && umax > 0) {
      if (!entry) {
        if (!trackInventory) {
          return { ok: false, message: `${recipeName}: not in inventory` };
        }
        entry = {
          name: recipeName,
          remaining: recipe.uses ?? umax,
          applied: 0,
        };
        this.instance!.inventory.push(entry);
      }
      if (entry.remaining <= 0) {
        return { ok: false, message: `${recipeName}: no uses left` };
      }
    }

    this.effects = this.effects.filter((e) => e.recipe !== recipeName);

    const ctx = this.exprContext();
    let applied = 0;

    for (const [index, def] of recipeEffects(recipe).entries()) {
      if (def.if && !evaluateCondition(def.if, ctx)) {
        continue;
      }

      const active = createActiveEffect(recipeName, index, def);
      const scheduled =
        active.delay_left > 0 ||
        active.tick > 0 ||
        active.try_left < 0 ||
        active.try_left > 1;

      if (scheduled) {
        this.effects.push(active);
      } else if (!active.while || evaluateCondition(active.while, ctx)) {
        fireEffect(active, this.instance!.stats, this.statDefs, ctx);
      }
      applied += 1;
    }

    if (!options.free && umax > 0 && entry) {
      entry.applied += 1;
      entry.remaining -= 1;
    }

    if (recipe.type === 'pasv' && umax > 0 && trackInventory) {
      const listed = this.instance!.inventory.some((r) => r.name === recipeName);
      if (!listed) {
        this.instance!.inventory.push({
          name: recipeName,
          remaining: entry?.remaining ?? (recipe.uses ?? umax) - 1,
          applied: entry?.applied ?? 1,
        });
      }
    }

    this.log('info', `Applied recipe: ${recipeName} (${applied} effects)`);
    return { ok: true, message: `Applied ${recipeName}` };
  }

  removeRecipe(recipeName: string): ApplyRecipeResult {
    this.ensureReady();
    const before = this.effects.length;
    this.effects = this.effects.filter((e) => e.recipe !== recipeName);

    const recipe = this.recipeDefs.get(recipeName);
    const index = this.instance!.inventory.findIndex((r) => r.name === recipeName);
    if (recipe?.type === 'pasv' && index >= 0) {
      this.instance!.inventory.splice(index, 1);
    }

    if (before === this.effects.length && !(recipe?.type === 'pasv' && index >= 0)) {
      return { ok: false, message: `${recipeName} has no active effects` };
    }

    this.log('info', `Removed recipe: ${recipeName}`);
    return { ok: true, message: `Removed ${recipeName}` };
  }

  tick(): void {
    this.ensureReady();
    this.tickCount += 1;

    resetEphemeralStats(this.instance!.stats, this.statDefs);

    const ctx = this.exprContext();
    const next: ActiveEffect[] = [];

    for (const effect of this.effects) {
      const keep = advanceEffect(
        effect,
        this.instance!.stats,
        this.statDefs,
        ctx,
      );
      if (keep) {
        next.push(effect);
      } else {
        this.log('info', `Effect ended: ${effect.id}`);
      }
    }

    this.effects = next;
    this.log('info', `Tick ${this.tickCount}`);
  }

  private exprContext(): ExprContext {
    return {
      stats: this.instance!.stats,
      random: this.random,
    };
  }

  private log(level: EngineLogEntry['level'], message: string): void {
    this.logs.unshift({ tick: this.tickCount, level, message });
    if (this.logs.length > 200) {
      this.logs.length = 200;
    }
  }

  private ensureReady(): void {
    if (!this.model || !this.instance) {
      throw new Error('Engine is not initialized');
    }
  }

  private ensureCatalog(): void {
    if (!this.catalog) {
      throw new Error('Load recipe catalog first');
    }
  }
}
