import { GameEngine } from '../core/engine.js';
import type { Character, RecipeCatalog, Snapshot } from '../types.js';

export interface SimulatorAppOptions {
  character: Character;
  catalog: RecipeCatalog;
}

export function mountSimulator(
  root: HTMLElement,
  options: SimulatorAppOptions,
): { engine: GameEngine; destroy: () => void } {
  const engine = new GameEngine();
  engine.loadCatalog(options.catalog);
  engine.loadCharacter(options.character);
  engine.applyWorldMechanics();

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
          <button type="button" id="btn-reset-defs" class="btn secondary">Сброс (def)</button>
          <button type="button" id="btn-load-character" class="btn secondary">Загрузить character</button>
        </div>
      </header>

      <section class="controls">
        <button type="button" id="btn-tick" class="btn primary">+1 сек (тик)</button>
        <button type="button" id="btn-auto" class="btn">Авто 1 Гц</button>
        <label class="apply-group">
          <span>Каталог</span>
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
                  <th>val</th>
                </tr>
              </thead>
              <tbody></tbody>
            </table>
          </div>
        </section>

        <section class="panel">
          <h2>Инвентарь</h2>
          <div class="table-wrap">
            <table id="inventory-table">
              <thead>
                <tr>
                  <th>name</th>
                  <th>remaining</th>
                  <th>applied</th>
                </tr>
              </thead>
              <tbody></tbody>
            </table>
          </div>
        </section>

        <section class="panel">
          <h2>Активные эффекты</h2>
          <div class="table-wrap">
            <table id="effects-table">
              <thead>
                <tr>
                  <th>id</th>
                  <th>stat</th>
                  <th>val</th>
                  <th>delay</th>
                  <th>try</th>
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
  const inventoryBody = root.querySelector<HTMLTableSectionElement>('#inventory-table tbody')!;
  const effectsBody = root.querySelector<HTMLTableSectionElement>('#effects-table tbody')!;
  const logList = root.querySelector<HTMLOListElement>('#log-list')!;
  const recipeSelect = root.querySelector<HTMLSelectElement>('#recipe-select')!;

  function renderRecipesSelect(): void {
    recipeSelect.innerHTML = engine
      .getCatalogRecipes()
      .filter((recipe) => recipe.type !== 'none')
      .map(
        (recipe) =>
          `<option value="${recipe.name}">${recipe.name} (${recipe.type})${recipe.desc ? ' — ' + escapeHtml(recipe.desc) : ''}</option>`,
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
            <td>${formatNumber(stat.val)}</td>
          </tr>
        `,
      )
      .join('');

    inventoryBody.innerHTML = data.inventory.length
      ? data.inventory
          .map(
            (item) => `
              <tr>
                <td>${item.name}</td>
                <td>${item.remaining}</td>
                <td>${item.applied}</td>
              </tr>
            `,
          )
          .join('')
      : '<tr><td colspan="3" class="empty">пусто</td></tr>';

    effectsBody.innerHTML = data.effects.length
      ? data.effects
          .map(
            (effect) => `
              <tr>
                <td>${effect.id}</td>
                <td>${effect.stat}</td>
                <td>${escapeHtml(effect.val)}</td>
                <td>${effect.delay_left}</td>
                <td>${effect.try_left}</td>
              </tr>
            `,
          )
          .join('')
      : '<tr><td colspan="5" class="empty">нет активных эффектов</td></tr>';

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

  const onResetDefs = () => {
    stopAuto();
    engine.createFromModel();
    refresh();
  };

  const onLoadCharacter = () => {
    stopAuto();
    engine.loadCharacter(structuredClone(options.character));
    engine.applyWorldMechanics();
    refresh();
  };

  root.querySelector('#btn-tick')!.addEventListener('click', onTick);
  root.querySelector('#btn-auto')!.addEventListener('click', onAuto);
  root.querySelector('#btn-apply')!.addEventListener('click', onApply);
  root.querySelector('#btn-remove')!.addEventListener('click', onRemove);
  root.querySelector('#btn-reset-defs')!.addEventListener('click', onResetDefs);
  root.querySelector('#btn-load-character')!.addEventListener('click', onLoadCharacter);

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
