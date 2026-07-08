# Примеры проектов LVGL Editor

## Logic Timer Counter (минимальный тест логики)

Файл: [logic-timer-counter.lvgl.json](logic-timer-counter.lvgl.json)

**Задача:** каждую секунду увеличивать переменную `counter` и обновлять label `lb_counter`.

| Design | Logic |
| --- | --- |
| Label `lb_counter`, текст `0` | Timer **Periodic**, 1000 ms → C code block: `var_counter++`, `snprintf`, `lv_label_set_text` |

### Проверка codegen (без железа)

```powershell
cd editor
npm test -- src/codegen/__tests__/logic-timer-counter.test.ts
```

Экспорт C-файлов в `examples/generated/logic-timer-counter/`:

```powershell
cd editor
npm run export:logic-counter
```

Дальше скопируйте `ui*.c` / `ui*.h` в `common/ui/` и пересоберите симулятор (см. [README.md](../README.md), шаг 2).

> **Почему логика «не работает» в симуляторе сейчас:** `simulator/` и `firmware/` линкуют ручной `common/ui/ui_counter.c`, а не код из редактора. Logic Editor генерирует C, но его нужно **экспортировать** и подключить в сборку.

---

## GameTracker Demo

Файл: [gametracker-demo.lvgl.json](gametracker-demo.lvgl.json)

Импорт: в редакторе **Import project** → выбрать этот файл. Картинки Vault Boy уже встроены в JSON.

### Виджеты (Design)

| Имя | Тип | Назначение |
| --- | --- | --- |
| `img_alive` | Image | Vault Boy «жив» (`vault_boy_alive.png`) |
| `img_dead` | Image | Vault Boy «мёртв» (`vault_boy_dead.png`), изначально скрыт |
| `lb_hits` | Label | Счётчик попаданий (начало: `0`) |
| `lb_heal` | Label | Счётчик лечения (всегда `100`) |
| `pb_health` | Progress Bar | Здоровье `heal - hits`, шкала 0…100 |

Настройки проекта: **240×320**, **RGB565**, фон чёрный, текст и индикатор — зелёный (#00FF00).

### Логика (Logic) — тест симуляции

Граф **health_update**, таймер **1 с** (проверка во вкладке **Compile** → Run):

- `hits++` каждую секунду (ограничение **0…100**)
- `heal` всегда **100**
- **pb_health** = `heal - hits`
- `health > 0` → `img_alive`, иначе `img_dead`

Вкладки **Design** / **Preview** логику не исполняют — только **Compile** (WASM).

### Пересборка примера

После замены PNG в `assets/`:

```powershell
cd editor
npm run build:demo
```

Скрипт пишет в `examples/gametracker-demo.lvgl.json`.
