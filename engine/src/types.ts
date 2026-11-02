export type RecipeType = 'none' | 'inst' | 'temp' | 'pasv';

export interface StatDef {
  id?: number;
  name: string;
  desc?: string;
  /** Текущее значение (в character.json). */
  val?: number;
  min: number;
  max: number;
  def: number;
}

export interface EffectDef {
  stat: string;
  val: string;
  delay?: number;
  coef?: number;
  tick?: number;
  /** Число срабатываний; -1 или отсутствие при tick — пока жив эффект / while. */
  try?: number;
  if?: string;
  while?: string;
  /** Какой ответ на вопрос рецепта включает это воздействие. */
  choice?: string;
}

export interface RecipeDef {
  id?: number;
  name: string;
  desc?: string;
  type: RecipeType;
  uses?: number;
  umax?: number;
  sig?: string;
  /** Короткая форма: один стат. */
  stat?: string;
  val?: string;
  delay?: number;
  coef?: number;
  tick?: number;
  try?: number;
  if?: string;
  while?: string;
  /** Несколько воздействий. */
  stats?: EffectDef[];
  /** Маркеры, чьи штрафные таймеры (`while act(маркер)`) снимаются при применении. */
  clear?: string[];
  /** Текст отказа живого персонажа. Без поля — «Не вышло». */
  fail?: string;
  /** Строка на экран, когда рецепт сработал. */
  say?: string;
  /** Вопрос перед применением. Без choice использование не тратится. */
  prompt?: string;
}

/** Каталог рецептов сценария (не инвентарь персонажа). */
export interface RecipeCatalog {
  scenario_name: string;
  recipes: RecipeDef[];
}

export interface StatInstance {
  name: string;
  val: number;
}

export interface InventoryItem {
  name: string;
  /** Остаток / наличие использований. */
  remaining: number;
  /** Сколько раз уже применено. */
  applied: number;
}

export interface ActiveEffect {
  id: string;
  recipe: string;
  index: number;
  stat: string;
  val: string;
  delay_left: number;
  tick: number;
  tick_acc: number;
  try_left: number;
  coef: number;
  while?: string;
  if?: string;
  /** Маркеры, чьи штрафные таймеры снимаются, когда этот эффект сработал. */
  clear?: string[];
  /** Таймер уже обнулён: строка эффекта снимается со следующего тика. */
  retire?: boolean;
}

/** Персонаж: статы (схема + val) и инвентарь в одном документе. */
export interface Character {
  scenario_name: string;
  instance_id?: string;
  stats: StatDef[];
  inventory: InventoryItem[];
  effects?: ActiveEffect[];
}

export type CharacterModel = Pick<Character, 'scenario_name' | 'stats'>;

export interface CharacterInstance {
  scenario_name: string;
  instance_id?: string;
  stats: StatInstance[];
  inventory: InventoryItem[];
  effects?: ActiveEffect[];
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
  inventory: InventoryItem[];
  effects: ActiveEffect[];
}
