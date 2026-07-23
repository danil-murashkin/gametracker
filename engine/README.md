# Gametracker Engine Simulator

Браузерный симулятор игровой механики по спецификации [`docs/game_data_format.md`](../docs/game_data_format.md).

Реализовано:

- тик движка (1 сек): `value += buff_rate * buff_coefficient`, clamp, таймеры статов;
- применение и снятие рецептов (`instant`, `timed`, `passive`);
- условия `while` у пассивных рецептов (например, урон от голода);
- триггеры (`on_rise`, `on_fall`, `while_true`, `once`);
- загрузка примера `character_model.example.json` и `character_instance.example.json`.

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
    core/          # логика движка (без UI)
    ui/            # браузерный интерфейс
    main.ts        # точка входа
```

## UI

- **+1 сек (тик)** — один шаг симуляции;
- **Авто 1 Гц** — тик каждую секунду;
- **Применить / Снять** — рецепт из сценария;
- **Сброс из модели** — новый персонаж из `character_model`;
- **Пример instance** — состояние из `character_instance.example.json`.
