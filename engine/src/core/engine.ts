import { evaluateCondition } from './conditions.js';
import {
  applyEffectsToStats,
  clampStat,
  createStatInstances,
  resetTemporaryBuffs,
  revertChanges,
  type AppliedChange,
} from './effects.js';
import type {
  ApplyRecipeResult,
  CharacterInstance,
  CharacterModel,
  EngineLogEntry,
  RecipeDef,
  RecipeInstance,
  Snapshot,
  StatDef,
  TriggerDef,
} from '../types.js';

interface WhileRecipeState {
  active: boolean;
  changes: AppliedChange[];
}

interface TriggerState {
  previous: boolean;
  onceFired: boolean;
}

export class GameEngine {
  private model: CharacterModel | null = null;
  private instance: CharacterInstance | null = null;
  private statDefs = new Map<string, StatDef>();
  private recipeDefs = new Map<string, RecipeDef>();
  private tickCount = 0;
  private logs: EngineLogEntry[] = [];
  private persistentChanges = new Map<string, AppliedChange[]>();
  private whileStates = new Map<string, WhileRecipeState>();
  private triggerStates = new Map<string, TriggerState>();
  private random: () => number;

  constructor(random: () => number = Math.random) {
    this.random = random;
  }

  loadModel(model: CharacterModel): void {
    this.model = structuredClone(model);
    this.statDefs = new Map(model.stats.map((stat) => [stat.name, stat]));
    this.recipeDefs = new Map(model.recipes.map((recipe) => [recipe.name, recipe]));
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
    this.tickCount = 0;
    this.logs = [];
    this.persistentChanges.clear();
    this.whileStates.clear();
    this.triggerStates.clear();
    this.syncWhileRecipes();
    this.log('info', 'Loaded character instance');
  }

  createFromModel(instanceId = 'sim-001'): CharacterInstance {
    if (!this.model) {
      throw new Error('Load model first');
    }

    const passiveRecipes = this.model.recipes
      .filter((recipe) => recipe.kind === 'passive' && recipe.uses_max === 0)
      .filter((recipe) => recipe.name.startsWith('mech_'))
      .map(
        (recipe): RecipeInstance => ({
          name: recipe.name,
          status: 'active',
          duration_left_sec: recipe.duration_sec,
          uses_applied: 0,
          uses_left: 0,
        }),
      );

    const instance: CharacterInstance = {
      scenario_name: this.model.scenario_name,
      instance_id: instanceId,
      stats: createStatInstances(this.model.stats),
      recipes: passiveRecipes,
    };

    this.loadInstance(instance);
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
      recipes: structuredClone(this.instance!.recipes),
    };
  }

  getInstanceCopy(): CharacterInstance {
    this.ensureReady();
    return structuredClone(this.instance!);
  }

  getModelRecipes(): RecipeDef[] {
    return this.model ? [...this.model.recipes] : [];
  }

  applyRecipe(
    recipeName: string,
    options: { usesLeft?: number; usesApplied?: number } = {},
  ): ApplyRecipeResult {
    this.ensureReady();
    const recipe = this.recipeDefs.get(recipeName);
    if (!recipe || recipe.kind === 'none') {
      return { ok: false, message: `Recipe not found: ${recipeName}` };
    }

    const existing = this.findActiveRecipe(recipeName);
    if (existing && recipe.uses_max === 0 && recipe.duration_sec === 0 && recipe.kind === 'passive') {
      return { ok: false, message: `${recipeName} is already active` };
    }

    if (recipe.uses_max > 0) {
      const usesLeft = options.usesLeft ?? recipe.uses;
      if (usesLeft <= 0) {
        return { ok: false, message: `${recipeName}: no uses left` };
      }
    }

    const changes = applyEffectsToStats(
      this.instance!.stats,
      this.statDefs,
      recipe.effects,
    );

    for (const startName of recipe.start) {
      this.activateRecipe(startName);
    }

    if (recipe.triggers.length > 0) {
      this.runTriggersForRecipe(recipe, 'apply');
    }

    const keepOnCharacter =
      recipe.kind !== 'instant' ||
      recipe.duration_sec > 0 ||
      recipe.start.length > 0 ||
      recipe.triggers.length > 0;

    if (keepOnCharacter) {
      const entry = this.upsertActiveRecipe(recipe, options);
      if (changes.length > 0 && !recipe.while) {
        this.persistentChanges.set(entry.name, changes);
      }
    }

    if (recipe.uses_max > 0) {
      const entry = this.findActiveRecipe(recipeName) ?? this.upsertActiveRecipe(recipe, options);
      entry.uses_applied = (options.usesApplied ?? recipe.uses_max - (options.usesLeft ?? recipe.uses)) + 1;
      entry.uses_left = (options.usesLeft ?? recipe.uses) - 1;
    }

    this.syncWhileRecipes();
    this.log('info', `Applied recipe: ${recipeName}`);
    return { ok: true, message: `Applied ${recipeName}` };
  }

  removeRecipe(recipeName: string): ApplyRecipeResult {
    this.ensureReady();
    const recipe = this.recipeDefs.get(recipeName);
    const index = this.instance!.recipes.findIndex(
      (entry) => entry.name === recipeName && entry.status === 'active',
    );
    if (index < 0) {
      return { ok: false, message: `${recipeName} is not active` };
    }

    const changes = this.persistentChanges.get(recipeName);
    if (changes) {
      revertChanges(this.instance!.stats, this.statDefs, changes);
      this.persistentChanges.delete(recipeName);
    }

    if (recipe) {
      for (const stopName of recipe.stop) {
        this.deactivateRecipe(stopName);
      }
    }

    this.instance!.recipes.splice(index, 1);
    this.whileStates.delete(recipeName);
    this.syncWhileRecipes();
    this.log('info', `Removed recipe: ${recipeName}`);
    return { ok: true, message: `Removed ${recipeName}` };
  }

  tick(): void {
    this.ensureReady();
    this.tickCount += 1;

    this.syncWhileRecipes();
    this.processStats();
    this.processRecipeTimers();
    this.processTriggers();

    this.log('info', `Tick ${this.tickCount}`);
  }

  private processStats(): void {
    for (const stat of this.instance!.stats) {
      const def = this.statDefs.get(stat.name);
      if (!def || def.kind === 'none') {
        continue;
      }

      stat.value += stat.buff_rate * stat.buff_coefficient;
      clampStat(stat, def);

      if (stat.buff_duration > 0) {
        stat.buff_duration -= 1;
        if (stat.buff_duration === 0) {
          resetTemporaryBuffs(stat, def);
        }
      }
    }
  }

  private processRecipeTimers(): void {
    const expired: string[] = [];

    for (const entry of this.instance!.recipes) {
      if (entry.status !== 'active' || entry.duration_left_sec <= 0) {
        continue;
      }

      entry.duration_left_sec -= 1;
      if (entry.duration_left_sec === 0) {
        expired.push(entry.name);
      }
    }

    for (const recipeName of expired) {
      this.log('info', `Recipe expired: ${recipeName}`);
      this.removeRecipe(recipeName);
    }
  }

  private processTriggers(): void {
    for (const entry of this.instance!.recipes.filter((r) => r.status === 'active')) {
      const recipe = this.recipeDefs.get(entry.name);
      if (!recipe) {
        continue;
      }
      this.runTriggersForRecipe(recipe, 'tick');
    }
  }

  private runTriggersForRecipe(
    recipe: RecipeDef,
    phase: 'tick' | 'apply',
  ): void {
    for (const [index, trigger] of recipe.triggers.entries()) {
      const key = `${recipe.name}#${index}`;
      const current = evaluateCondition(trigger.when, this.conditionContext());
      const state = this.triggerStates.get(key) ?? { previous: false, onceFired: false };

      let shouldRun = false;
      switch (trigger.edge) {
        case 'on_rise':
          shouldRun = current && !state.previous;
          break;
        case 'on_fall':
          shouldRun = !current && state.previous;
          break;
        case 'while_true':
          shouldRun = current;
          break;
        case 'once':
          shouldRun = current && !state.onceFired;
          if (shouldRun) {
            state.onceFired = true;
          }
          break;
      }

      if (phase === 'apply' && trigger.edge !== 'once' && trigger.edge !== 'while_true') {
        shouldRun = false;
      }

      if (shouldRun) {
        this.executeTrigger(recipe.name, trigger);
      }

      state.previous = current;
      this.triggerStates.set(key, state);
    }
  }

  private executeTrigger(sourceRecipe: string, trigger: TriggerDef): void {
    applyEffectsToStats(this.instance!.stats, this.statDefs, trigger.effects);

    for (const startName of trigger.start) {
      this.activateRecipe(startName);
    }

    for (const stopName of trigger.stop) {
      this.deactivateRecipe(stopName);
    }

    this.log('info', `Trigger fired on ${sourceRecipe}: ${trigger.when}`);
  }

  private syncWhileRecipes(): void {
    for (const recipe of this.recipeDefs.values()) {
      if (!recipe.while) {
        continue;
      }

      const isListed = this.isRecipeActive(recipe.name);
      const condition = evaluateCondition(recipe.while, this.conditionContext());
      const state = this.whileStates.get(recipe.name) ?? { active: false, changes: [] };

      if (condition && !state.active) {
        state.changes = applyEffectsToStats(
          this.instance!.stats,
          this.statDefs,
          recipe.effects,
        );
        state.active = true;
        if (!isListed && recipe.kind === 'passive') {
          this.upsertActiveRecipe(recipe);
        }
        this.log('info', `While active: ${recipe.name}`);
      } else if (!condition && state.active) {
        revertChanges(this.instance!.stats, this.statDefs, state.changes);
        state.changes = [];
        state.active = false;
        if (recipe.kind === 'passive' && recipe.while && !recipe.duration_sec) {
          this.deactivateRecipe(recipe.name, false);
        }
        this.log('info', `While inactive: ${recipe.name}`);
      }

      this.whileStates.set(recipe.name, state);
    }
  }

  private activateRecipe(recipeName: string): void {
    const recipe = this.recipeDefs.get(recipeName);
    if (!recipe || recipe.kind === 'none') {
      return;
    }

    if (this.isRecipeActive(recipeName)) {
      this.runTriggersForRecipe(recipe, 'apply');
      return;
    }

    this.applyRecipe(recipeName);
  }

  private deactivateRecipe(recipeName: string, cascade = true): void {
    if (!this.isRecipeActive(recipeName)) {
      return;
    }
    if (cascade) {
      this.removeRecipe(recipeName);
    } else {
      const index = this.instance!.recipes.findIndex(
        (entry) => entry.name === recipeName && entry.status === 'active',
      );
      if (index >= 0) {
        this.instance!.recipes.splice(index, 1);
      }
    }
  }

  private upsertActiveRecipe(
    recipe: RecipeDef,
    options: { usesLeft?: number; usesApplied?: number } = {},
  ): RecipeInstance {
    const existing = this.findActiveRecipe(recipe.name);
    if (existing) {
      if (recipe.duration_sec > 0) {
        existing.duration_left_sec = recipe.duration_sec;
      }
      return existing;
    }

    const entry: RecipeInstance = {
      name: recipe.name,
      status: 'active',
      duration_left_sec: recipe.duration_sec,
      uses_applied: options.usesApplied ?? (recipe.uses_max > 0 ? recipe.uses_max - recipe.uses : 0),
      uses_left: options.usesLeft ?? recipe.uses,
    };
    this.instance!.recipes.push(entry);
    return entry;
  }

  private findActiveRecipe(name: string): RecipeInstance | undefined {
    return this.instance!.recipes.find(
      (entry) => entry.name === name && entry.status === 'active',
    );
  }

  private isRecipeActive(name: string): boolean {
    return Boolean(this.findActiveRecipe(name));
  }

  private conditionContext() {
    return {
      stats: this.instance!.stats,
      hasRecipe: (name: string) => this.isRecipeActive(name),
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
}
