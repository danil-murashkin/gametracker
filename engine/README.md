# Gametracker Engine Simulator

Браузерный симулятор игровой механики по спецификации [`docs/game_data_format.md`](../docs/game_data_format.md).

Данные сценария **не вшиты в движок** — берутся из [`examples/fallout_demo/`](../examples/fallout_demo/) (препараты по [`docs/old_system/preparates.md`](../docs/old_system/preparates.md)).

Реализовано:

- тик 1 сек: сброс `mod_*` / `*_resist` к `def`, затем эффекты (`delay` / `tick` / `try` / `while`);
- применение рецептов (`none` / `inst` / `temp` / `pasv`) с `val` (`+` / `-` / `=`), `if` / `while`;
- выражения: `exs` / `act` / `inact`, `rnd`, `and` / `or` / `not`, имена статов;
- динамические статы (зависимости вроде `hangover_nuka`);
- загрузка `character.json` и `recipes.json` из examples.

## Запуск

```bash
cd engine
npm install
npm run dev
```

Откройте URL из вывода Vite (обычно `http://localhost:5173`).

## Сборка и тесты

```bash
npm run build
npm run test
```

## Структура

```text
engine/
  src/
    core/          # логика движка (без UI и без данных сценария)
    ui/            # браузерный интерфейс
    main.ts        # точка входа → examples/fallout_demo
examples/fallout_demo/
  character.json          # статы + инвентарь
  recipes.json            # каталог рецептов
```

## UI

- **+1 сек (тик)** — один шаг симуляции;
- **Авто 1 Гц** — тик каждую секунду;
- **Применить / Снять** — рецепт из **каталога** (при применении попадает в инвентарь);
- **Сброс (def)** — val = def, пустой инвентарь + мировая механика;
- **Загрузить character** — состояние из `character.json`.
