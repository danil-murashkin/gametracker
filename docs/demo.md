# Demo — полная архитектура

Демонстрация цепочки **Design → rules.json → Logic Engine → UI → HAL** на ПК и ESP32.

## Компоненты

| Путь | Роль |
|------|------|
| `editor/` | Ссылки на внешние редакторы (PicoPixel, SquareLine, …) |
| `common/rules/rules.json` | Единый файл логики (симулятор читает с диска, ESP — embed) |
| `common/logic/` | Logic Engine (FSM) + загрузчик JSON |
| `common/ui/` | LVGL UI (демо-экран: метка + квадрат) |
| `common/app/` | Склейка logic + ui |
| `simulator/` | LVGL 8.3 + SDL2, mock HAL (клавиатура = энкодер) |
| `firmware/` | ESP-IDF, ST7789, тот же common-код |

## Сценарий демо

Три состояния FSM: **Home** (синий) → **Warning** (оранжевый) → **OK** (зелёный).

- **enc_cw** (→ / ↑) — следующее состояние
- **enc_ccw** (← / ↓) — предыдущее
- **enc_press** (Space / Enter) — сброс в Home

## 1. Логика (`rules.json`)

Отредактируйте [common/rules/rules.json](../common/rules/rules.json) вручную или во внешнем JSON-редакторе. Формат и ссылки на инструменты: [editor/README.md](../editor/README.md).

## 2. Симулятор (ПК)

Требуется: CMake 3.16+, компилятор C, Git (для FetchContent).

```powershell
cd simulator
cmake -B build -G Ninja
cmake --build build
.\build\simulator.exe ..\common\rules\rules.json
```

Управление: стрелки = энкодер, Space/Enter = нажатие.

## 3. Прошивка (ESP32)

```powershell
cd firmware
. .\activate-idf.ps1
idf.py build flash monitor
```

На плате без энкодера отображается **начальное состояние** из `rules.json`. Полное управление — в симуляторе.

После изменения `common/rules/rules.json` пересоберите прошивку (`rules.json` вшивается через `EMBED_FILES`).

## Поток данных

```
Blockly (editor) ──► rules.json
                         │
         ┌───────────────┴───────────────┐
         ▼                               ▼
   simulator (file)              firmware (embed)
         │                               │
         └─► rules_loader ─► logic_engine ─► ui_demo
                         ▲
                   hal_input (mock / stub)
```

## PicoPixel

UI в `common/ui/ui_demo.c` — ручной аналог экспорта PicoPixel. В продакшене сюда попадает сгенерированный `ui/*.c`.
