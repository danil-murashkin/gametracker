export type StatKind = 'none' | 'instant' | 'timed' | 'passive';
export type RecipeKind = StatKind;
export type RecipeStatus = 'active' | 'pending';
export type TriggerEdge = 'on_rise' | 'on_fall' | 'while_true' | 'once';

export type StatParam = 'value' | 'buff_rate' | 'buff_duration' | 'buff_coefficient';

export interface StatDef {
  name: string;
  description?: string;
  title?: string;
  kind: StatKind;
  min: number;
  max: number;
  default: number;
  buff_rate: number;
  buff_duration: number;
  buff_coefficient: number;
}

export interface StatEffects {
  value?: number;
  buff_rate?: number;
  buff_duration?: number;
  buff_coefficient?: number;
}

export interface TriggerDef {
  when: string;
  edge: TriggerEdge;
  effects: Record<string, StatEffects>;
  start: string[];
  stop: string[];
}

export interface RecipeDef {
  name: string;
  description?: string;
  title?: string;
  kind: RecipeKind;
  uses: number;
  uses_max: number;
  duration_sec: number;
  while: string;
  effects: Record<string, StatEffects>;
  start: string[];
  stop: string[];
  triggers: TriggerDef[];
  signature?: string;
}

export interface CharacterModel {
  scenario_name: string;
  stats: StatDef[];
  recipes: RecipeDef[];
}

export interface StatInstance {
  name: string;
  value: number;
  buff_rate: number;
  buff_duration: number;
  buff_coefficient: number;
}

export interface RecipeInstance {
  name: string;
  status: RecipeStatus;
  duration_left_sec: number;
  uses_applied: number;
  uses_left: number;
  signature?: string;
}

export interface CharacterInstance {
  scenario_name: string;
  instance_id?: string;
  stats: StatInstance[];
  recipes: RecipeInstance[];
}

export interface EngineLogEntry {
  tick: number;
  level: 'info' | 'warn' | 'error';
  message: string;
}

export interface ApplyRecipeResult {
  ok: boolean;
  message: string;
}

export interface Snapshot {
  tick: number;
  scenario_name: string;
  stats: StatInstance[];
  recipes: RecipeInstance[];
}
