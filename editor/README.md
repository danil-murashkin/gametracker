# Редакторы (внешние)

Собственных редакторов в репозитории **нет** — только эта справка. UI и логику готовят во внешних инструментах, артефакты кладут в `common/`.

## UI — LVGL

| Инструмент | Ссылка | Экспорт | Куда положить |
|------------|--------|---------|---------------|
| **PicoPixel** | [picopixel.io](https://picopixel.io/) | LVGL 8.x C | `common/ui/` |
| **SquareLine Studio** | [squareline.io](https://squareline.io/) | LVGL 8.x C | `common/ui/` |

### Как подключить

1. Создайте проект **240×320**, цвет **RGB565**, LVGL **8.3**.
2. Экспортируйте сгенерированные `.c` / `.h`.
3. Скопируйте в `common/ui/` (или `firmware/main/ui/`).
4. Добавьте файлы в `firmware/main/CMakeLists.txt`.
5. Вызовите `ui_*_init()` из `app_main.c` вместо текущего `ui_counter_init()`.

Проверка без железа: [simulator/README.md](../simulator/README.md).

## Логика — FSM (`rules.json`)

| Способ | Описание |
|--------|----------|
| **Вручную** | Редактировать `common/rules/rules.json` по образцу ниже |
| **Blockly** | [developers.google.com/blockly](https://developers.google.com/blockly) — библиотека для визуального редактора; готового экспорта в наш формат нет, при необходимости пишется отдельный генератор |
| **Любой JSON-редактор** | VS Code, [jsoneditoronline.org](https://jsoneditoronline.org/) и т.п. |

### Формат `rules.json`

Схема — в [common/rules/rules.json](../common/rules/rules.json). Кратко:

- `initial` — стартовое состояние
- `states` — id → `{ "label", "color" }` (цвет UI в hex)
- `transitions` — `{ "from", "event", "to" }`; `from: "*"` — из любого состояния

События HAL (примеры): `enc_cw`, `enc_ccw`, `enc_press`, `jumper_inc`, `jumper_dec`.

После правки:

- **Симулятор** — положить файл и передать путь аргументом (если собран с Logic Engine).
- **ESP32** — пересобрать прошивку (`idf.py build flash`), если правила встроены в образ.

## Полезные ссылки

- [LVGL 8.3 docs](https://docs.lvgl.io/8.3/)
- [LVGL PC simulator (upstream)](https://github.com/lvgl/lv_port_pc_vscode)
- [ESP-IDF](https://docs.espressif.com/projects/esp-idf/)
