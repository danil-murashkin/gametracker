# Редактор GameTracker (форк IoTSharp)

`editor/` — встроенный **визуальный редактор** LVGL-интерфейсов: браузер, без тяжёлых IDE, **open source** (MIT).

Основа — [IoTSharp/lvgl-editor](https://github.com/IoTSharp/lvgl-editor). Исходники форка лежат **в этом каталоге**, с **английским интерфейсом** и примерами проектов.

Интеграция с прошивкой и симулятором репозитория — в [корневом README](../README.md).

## Вкладки


| Вкладка     | Назначение                                                    |
| ----------- | ------------------------------------------------------------- |
| **Design**  | Экран: виджеты, стили, ресурсы (картинки, шрифты)             |
| **Logic**   | Визуальная логика: триггеры, условия, действия над UI         |
| **Code**    | Просмотр и скачивание сгенерированных `.c` / `.h`             |
| **Preview** | Быстрый Canvas 2D-превью + **Simulator** (компиляция сгенерированного C-кода, как на ESP32) |


На **Design** у компонентов настраиваются свойства и вкладка **Events** (обработчики на конкретном виджете). На **Logic** — графы из нод: триггеры, ветвления, чтение переменных, show/hide и т.д.

## Экспорт кода

Вкладка **Code** — скачать отдельные файлы или ZIP.


| Файл                          | Содержимое                         |
| ----------------------------- | ---------------------------------- |
| `ui.c` / `ui.h`               | Инициализация LVGL, виджеты, стили |
| `ui_events.c` / `ui_events.h` | Обработчики событий UI (Events)    |
| `ui_logic.c` / `ui_logic.h`   | Логика из Logic Editor             |


## Logic Editor

### Палитра нод (кратко)

| Категория   | Примеры |
| ----------- | ------- |
| **Trigger** | Event trigger, Timer trigger, **Hardware trigger** |
| **Condition** | If/Else, Compare, Logic (AND/OR) |
| **Actions** | Show/hide, Set text, Set property, Navigate page |
| **Data**    | **Read variable**, Write variable, Get property, Math |

### Debug (Logic tab)

Пошаговая симуляция графа **внутри Logic** (не Preview):

1. **Debug** — старт с первого trigger-нода
2. **Step** — выполнить следующую ноду (переменные обновляются справа)
3. **Fire** — на таймере: один тик цепочки Execute
4. **Ctrl+click** на ноде — breakpoint

Debug исполняет те же правила, что Preview и codegen (C block, Write variable, If/Else ветки).


- **User variables** — свои `int` / `float` / `string` / `bool` (панель **Variables** справа).
- **Hardware (ESP32)** — встроенные только для чтения:
  - `value_1` — состояние кнопки 1 (GPIO «+»)
  - `value_2` — состояние кнопки 2 (GPIO «−»)

Читать их — нода **Read variable**. Писать в железные переменные нельзя.

### Типовые сценарии

**Скрыть картинку при старте, показать по кнопке**

1. На **Design**: у изображения в иерархии отключить видимость (👁️) или **Flags → Hidden** — скрыто сразу при создании UI.
2. На **Logic**: **Hardware trigger** (`value_1`, Pressed) → **Show/hide** (Show, ваш `img`).

**Реакция на нажатие кнопки на устройстве**

**Hardware trigger** → действия (Set text, Set value, Show/hide …). Параметр **Trigger on**: Pressed / Released / Any change.

**Timer trigger**

| Порт / параметр | Назначение |
| --- | --- |
| **Start** (вход) | Запуск таймера по execution-цепочке (например, после клика). **Если не подключён** — таймер стартует сам в `ui_logic_init()`. |
| **Execute** (выход) | Срабатывает каждый тик таймера → действия дальше по цепочке |
| **Mode → Periodic** | Повтор каждые N ms (для счётчика раз в секунду) |
| **Mode → Delayed** | Один раз через N ms |

**Однократное действие после загрузки** (без отдельного Startup-нода)

**Timer trigger** (Delayed, 1 ms) → нужное действие (например **Show/hide → Hide**). Для мгновенного скрытия без мигания предпочтительнее **Hidden** в свойствах компонента.

**Клик по виджету на экране**

**Event trigger** (тип события, например Click) → цепочка действий. Для привязки к компоненту используйте также вкладку **Events** на Design.

Документация по виджетам: [docs/components/](docs/components/README.md).

## Compile & Run (симуляция внутри браузера)

В Preview есть под‑вкладка **🔨 Compile & Run** — она компилирует текущий проект в WASM и запускает LVGL‑runtime прямо в браузере (таймеры, логика, обработчики).

В `lvgl-editor-start.ps1` это включается переменной окружения `VITE_ENABLE_COMPILE_PREVIEW=true`.

## Структура `editor/`

```
editor/
├── src/                   # React + codegen
├── docs/                  # компоненты LVGL, шрифты
├── scripts/               # apply-en-ui.mjs, build-gametracker-demo.mjs
├── lvgl-editor-start.ps1  # запуск dev-сервера
├── package.json
└── FORK.md                # отличия от upstream
```

## Запуск

```powershell
cd editor
.\lvgl-editor-start.ps1
```

→ [http://localhost:8083](http://localhost:8083)

Нужен **Node.js 18+** (`winget install OpenJS.NodeJS.LTS`) или portable Node в `.tools/node`.

При первом запуске: `npm install`.

## Новый проект

Рекомендуемые настройки под дисплей трекера **240×320, RGB565**:


| Параметр     | Значение                         |
| ------------ | -------------------------------- |
| Resolution   | **240×320 (QVGA)**               |
| Color depth  | **16 bit (RGB565)**              |
| Default font | `montserrat_14`                  |
| Memory size  | **48 KB** (можно 32–64 для Demo) |


Картинки в **Resources** — формат **RGB565** (C-массив), без тяжёлого PNG/JPEG на устройстве.

## Пример Demo

Готовый проект: [../examples/gametracker-demo.lvgl.json](../examples/gametracker-demo.lvgl.json)


| Имя виджета  | Тип          | Роль в Demo                          |
| ------------ | ------------ | ------------------------------------ |
| `img_alive`  | Image        | Vault Boy «жив»                      |
| `img_dead`   | Image        | Vault Boy «мёртв»                    |
| `lb_hits`    | Label        | Счётчик попаданий (старт: 0)         |
| `lb_heal`    | Label        | Счётчик лечения (старт: 100)         |
| `pb_health`  | Progress Bar | Здоровье `heal - hits`, шкала 0…100   |

Тест симуляции: таймер **1 с** → `hits++` (0…100), `heal` всегда **100**, бар = `heal - hits`.

**Import project** на стартовом экране → выбрать файл из `examples/`.

Подробнее: [../examples/README.md](../examples/README.md).

## Разработка и тесты

```powershell
cd editor
npm run dev          # то же, что lvgl-editor-start.ps1
npm test             # vitest (codegen)
npm run build        # production-сборка
```

## Локализация (English UI)

Перевод уже внесён в `src/`. Скрипты обновления — [scripts/README.md](scripts/README.md).

После слияния с upstream:

```powershell
cd editor
node scripts/apply-en-ui.mjs
```

## Ссылки

- Upstream: [IoTSharp/lvgl-editor](https://github.com/IoTSharp/lvgl-editor) — [UPSTREAM-README.md](UPSTREAM-README.md)
- Отличия форка: [FORK.md](FORK.md)
- [LVGL docs](https://docs.lvgl.io/)
- Репозиторий GameTracker: [README](../README.md)
