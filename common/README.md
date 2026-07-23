# Common — код для прошивки ESP32

Платформо-независимый код, который линкуется в **firmware** (ESP32).  
Список исходников — в [`common_sources.cmake`](common_sources.cmake).

Целевая версия LVGL (IDF / editor WASM / codegen) — [`lvgl-target.json`](lvgl-target.json).

Симуляция UI и логики — во вкладке **Simulator** в [`../editor/`](../editor/) (WASM в браузере, тот же сгенерированный C).

## Сейчас (счётчик)

| Файл | Роль |
|------|------|
| `app/app_counter.c` | Логика приложения (счётчик, обработка jumper) |
| `ui/ui_counter.c` | LVGL-интерфейс (фон, квадрат, цифра) |
| `ui/ui_port.h` | Контракт порта LVGL (lock / async) |
| `hal/hal_jumper.h` | API ввода +/- (реализация — в `firmware/`) |

```
firmware/main/app_main.c  ──► app_counter_init()
                               hal_jumper_init(app_counter_on_jumper)
                               ▼
                    common/app/app_counter.c
                               │
                               ▼
                    common/ui/ui_counter.c
```

## Заготовка FSM (`rules.json`)

| Файл | Роль |
|------|------|
| `rules/rules.json` | Конфиг FSM |
| `logic/logic_engine.c` | Движок состояний |
| `logic/rules_loader.c` | JSON → engine |
| `app/app_runtime.c` | Связка rules + UI |
| `ui/ui_demo.c` | Экран под FSM |

Чтобы включить FSM на ESP32 — заменить `app_counter` на `app_runtime` в `common_sources.cmake`.

## Порты UI

| Платформа | Файл |
|-----------|------|
| ESP32 | `firmware/main/platform/ui_port_esp.c` |
