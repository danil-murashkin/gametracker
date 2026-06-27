# Редакторы

Артефакты кладут в `common/` (UI → `common/ui/`, логика → `common/rules/rules.json`).

## Локальный Blockly (FSM → rules.json)

```powershell
cd editor/blockly
.\start.ps1
```

http://localhost:8081 — офлайн, Blockly 10.x из `npm`.

См. [blockly/README.md](blockly/README.md).

## Block Factory (свои блоки Blockly)

```powershell
cd editor/block-factory
.\start.ps1
```

http://localhost:8082 — официальный **Blockly Developer Tools** (Block Factory) из blockly-samples.

См. [block-factory/README.md](block-factory/README.md).

## UI — LVGL (внешние)

### Открытый исходный код

| Инструмент | Лицензия | LVGL 8.3 | Локально |
|------------|----------|----------|----------|
| **[EEZ Studio](https://github.com/eez-open/studio)** | GPL-3.0 | да | десктоп, офлайн |
| **[lvgl_editor](https://github.com/lvgl/lvgl_editor)** (LVGL Pro) | исходники есть, [коммерческая лицензия](https://pro.lvgl.io) | XML → C | десктоп |

Сгенерированный C из EEZ Studio — в `common/ui/`. Для вашего стека (LVGL **8.3**) EEZ Studio — основной **open-source** вариант.

### Закрытые (онлайн / десктоп)

| Инструмент | Open source | Примечание |
|------------|-------------|------------|
| [PicoPixel](https://picopixel.io/) | нет | браузер, бесплатный тариф |
| [SquareLine Studio](https://squareline.io/) | нет | десктоп, в основном LVGL 9 |

### Подключение UI

1. Проект **240×320**, **RGB565**, LVGL **8.3**
2. Экспорт `.c` / `.h` → `common/ui/`
3. Добавить в `firmware/main/CMakeLists.txt` и `common/common_sources.cmake`
4. Вызвать `ui_*_init()` из `app_main.c`

Проверка: [simulator/README.md](../simulator/README.md).

## Логика — rules.json

| Способ | Описание |
|--------|----------|
| **Blockly (локально)** | `editor/blockly/` — экспорт FSM |
| **Вручную** | `common/rules/rules.json` |
| **JSON-редактор** | VS Code, [jsoneditoronline.org](https://jsoneditoronline.org/) |

### Формат

Схема — [common/rules/rules.json](../common/rules/rules.json):

- `initial` — стартовое состояние
- `states` — id → `{ "label", "color" }`
- `transitions` — `{ "from", "event", "to" }`; `from: "*"` — из любого

События: `enc_cw`, `enc_ccw`, `enc_press`, `jumper_inc`, `jumper_dec`.

## Ссылки

- [LVGL 8.3 docs](https://docs.lvgl.io/8.3/)
- [Blockly](https://github.com/RaspberryPiFoundation/blockly) (Apache 2.0)
- [ESP-IDF](https://docs.espressif.com/projects/esp-idf/)
