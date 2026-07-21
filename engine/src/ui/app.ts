import { GameEngine } from '../core/engine.js';
import type { CharacterInstance, CharacterModel, Snapshot } from '../types.js';

export interface SimulatorAppOptions {
  model: CharacterModel;
  initialInstance?: CharacterInstance;
}

export function mountSimulator(
  root: HTMLElement,
  options: SimulatorAppOptions,
): { engine: GameEngine; destroy: () => void } {
  const engine = new GameEngine();
  engine.loadModel(options.model);

  if (options.initialInstance) {
    engine.loadInstance(options.initialInstance);
  } else {
    engine.createFromModel();
  }

  let autoTimer: number | null = null;
  let snapshot = engine.getSnapshot();

  root.innerHTML = `
    <div class="layout">
      <header class="header">
        <div>
          <h1>Gametracker Engine Simulator</h1>
          <p class="subtitle">Сценарий: <strong id="scenario-name"></strong> · тик: <strong id="tick-count">0</strong></p>
        </div>
        <div class="header-actions">
          <button type="button" id="btn-reset-model" class="btn secondary">Сброс из модели</button>
          <button type="button" id="btn-load-example" class="btn secondary">Пример instance</button>
        </div>
      </header>

      <section class="controls">
        <button type="button" id="btn-tick" class="btn primary">+1 сек (тик)</button>
        <button type="button" id="btn-auto" class="btn">Авто 1 Гц</button>
        <label class="apply-group">
          <span>Рецепт</span>
          <select id="recipe-select"></select>
          <button type="button" id="btn-apply" class="btn">Применить</button>
          <button type="button" id="btn-remove" class="btn secondary">Снять</button>
        </label>
      </section>

      <div class="panels">
        <section class="panel">
          <h2>Статы</h2>
          <div class="table-wrap">
            <table id="stats-table">
              <thead>
                <tr>
                  <th>name</th>
                  <th>value</th>
                  <th>buff_rate</th>
                  <th>buff_duration</th>
                  <th>buff_coef</th>
                </tr>
              </thead>
              <tbody></tbody>
            </table>
          </div>
        </section>

        <section class="panel">
          <h2>Активные рецепты</h2>
          <div class="table-wrap">
            <table id="recipes-table">
              <thead>
                <tr>
                  <th>name</th>
                  <th>status</th>
                  <th>duration_left</th>
                  <th>uses_left</th>
                </tr>
              </thead>
              <tbody></tbody>
            </table>
          </div>
        </section>
      </div>

      <section class="panel log-panel">
        <h2>Журнал</h2>
        <ol id="log-list" class="log-list"></ol>
      </section>
    </div>
  `;

  const scenarioName = root.querySelector<HTMLElement>('#scenario-name')!;
  const tickCount = root.querySelector<HTMLElement>('#tick-count')!;
  const statsBody = root.querySelector<HTMLTableSectionElement>('#stats-table tbody')!;
  const recipesBody = root.querySelector<HTMLTableSectionElement>('#recipes-table tbody')!;
  const logList = root.querySelector<HTMLOListElement>('#log-list')!;
  const recipeSelect = root.querySelector<HTMLSelectElement>('#recipe-select')!;

  function renderRecipesSelect(): void {
    recipeSelect.innerHTML = engine
      .getModelRecipes()
      .filter((recipe) => recipe.kind !== 'none')
      .map(
        (recipe) =>
          `<option value="${recipe.name}">${recipe.title ?? recipe.name} (${recipe.kind})</option>`,
      )
      .join('');
  }

  function renderSnapshot(data: Snapshot): void {
    scenarioName.textContent = data.scenario_name;
    tickCount.textContent = String(data.tick);

    statsBody.innerHTML = data.stats
      .map(
        (stat) => `
          <tr>
            <td>${stat.name}</td>
            <td>${formatNumber(stat.value)}</td>
            <td>${formatNumber(stat.buff_rate)}</td>
            <td>${stat.buff_duration}</td>
            <td>${formatNumber(stat.buff_coefficient)}</td>
          </tr>
        `,
      )
      .join('');

    recipesBody.innerHTML = data.recipes.length
      ? data.recipes
          .map(
            (recipe) => `
              <tr>
                <td>${recipe.name}</td>
                <td>${recipe.status}</td>
                <td>${recipe.duration_left_sec}</td>
                <td>${recipe.uses_left}</td>
              </tr>
            `,
          )
          .join('')
      : '<tr><td colspan="4" class="empty">нет активных рецептов</td></tr>';

    logList.innerHTML = engine
      .getLogs()
      .map((entry) => `<li class="${entry.level}">[${entry.tick}] ${escapeHtml(entry.message)}</li>`)
      .join('');
  }

  function refresh(): void {
    snapshot = engine.getSnapshot();
    renderSnapshot(snapshot);
  }

  function stopAuto(): void {
    if (autoTimer !== null) {
      window.clearInterval(autoTimer);
      autoTimer = null;
    }
    root.querySelector<HTMLButtonElement>('#btn-auto')!.textContent = 'Авто 1 Гц';
  }

  renderRecipesSelect();
  refresh();

  const onTick = () => {
    engine.tick();
    refresh();
  };

  const onAuto = () => {
    if (autoTimer !== null) {
      stopAuto();
      return;
    }
    autoTimer = window.setInterval(onTick, 1000);
    root.querySelector<HTMLButtonElement>('#btn-auto')!.textContent = 'Стоп';
  };

  const onApply = () => {
    const name = recipeSelect.value;
    const result = engine.applyRecipe(name);
    if (!result.ok) {
      window.alert(result.message);
    }
    refresh();
  };

  const onRemove = () => {
    const name = recipeSelect.value;
    const result = engine.removeRecipe(name);
    if (!result.ok) {
      window.alert(result.message);
    }
    refresh();
  };

  const onResetModel = () => {
    stopAuto();
    engine.createFromModel();
    refresh();
  };

  const onLoadExample = () => {
    if (!options.initialInstance) {
      return;
    }
    stopAuto();
    engine.loadInstance(options.initialInstance);
    refresh();
  };

  root.querySelector('#btn-tick')!.addEventListener('click', onTick);
  root.querySelector('#btn-auto')!.addEventListener('click', onAuto);
  root.querySelector('#btn-apply')!.addEventListener('click', onApply);
  root.querySelector('#btn-remove')!.addEventListener('click', onRemove);
  root.querySelector('#btn-reset-model')!.addEventListener('click', onResetModel);
  root.querySelector('#btn-load-example')!.addEventListener('click', onLoadExample);

  return {
    engine,
    destroy: () => {
      stopAuto();
      root.innerHTML = '';
    },
  };
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}
