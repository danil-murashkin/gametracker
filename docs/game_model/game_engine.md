# Игровой движок

Две сущности:


| Сущность                | Роль                                                                   |
| ----------------------- | ---------------------------------------------------------------------- |
| **Статы** (`stats`)     | Состояние персонажа: здоровье, SPECIAL, радиация, флаги смерти/болезни |
| **Рецепты** (`recipes`) | Правила изменения статов: предметы, броня, механика мира, триггеры     |


**Принцип:** у каждого стата и каждого рецепта **одинаковый набор полей**  
**Сценарий:** `character_model.example.json` + `character_model.schema.json`  
**Рантайм:** `character_instance.example.json` + `character_instance.schema.json` (персонаж / PDA); для предмета на NFC — `recipe_instance.example.json` + `recipe_instance.schema.json`.

---



## Сценарий

```json
{
  "scenario_name": "fallout"
}
```

Примеры: `ft3`, `fallout`, `stalker`, `tarkov`.

У стата и рецепта поле `name` уникально **внутри сценария**.

---



## Статы

У **каждого** стата всегда одни и те же поля:


| Поле                | Тип                                         | описание                              |
| ------------------- | ------------------------------------------- | ------------------------------------- |
| `name`              | string                                      | уникальное имя стата в сценарии       |
| `description`       | string                                      | `""`                                  |
| `kind`              | `none` \| `instant` \| `timed` \| `passive` | —                                     |
| `min`               | number                                      | минимум                               |
| `max`               | number                                      | максимум                              |
| `default`           | number                                      | стартовое значение                    |
| `buff_rate`   | number                                      | `0` — значение не меняется по таймеру |
| `buff_duration` | number                                      | таймер бафа/дебафа на стате; `0` — нет |
| `buff_coefficient`  | number                                      | множитель к rate; `1` — без изменения |

`kind`:

- `none` — не задействован (движок игнорирует)
- `passive` — активен постоянно (здоровье, SPECIAL, флаги; `buff_rate` может быть 0)
- `instant` — однократное изменение
- `timed` — временный эффект (`buff_duration` > 0)

### Баф на стате: таймер и коэффициент

На тике:

```text
value += buff_rate * buff_coefficient
```

| Поле | Роль |
| ---- | ---- |
| `buff_rate` | базовая скорость изменения |
| `buff_coefficient` | множитель (баф > 1, дебаф < 1, `1` — нейтрально) |
| `buff_duration` | сколько секунд ещё действует временный баф; `0` — нет таймера |

Отдельно от `duration_sec` у рецепта: рецепт живёт своё время, а на стате — свой таймер и коэффициент.

Рецепт меняет их эффектами: `set_buff_rate` / `add_buff_rate`, `set_buff_duration`, `set_buff_coefficient` / `add_buff_coefficient`.

Пример: реген здоровья быстрее при высоком HP — пассивный рецепт каждый тик ставит коэффициент от текущего значения:

```json
{ "target": "health", "op": "set_buff_coefficient", "expr": "health / max_health" }
```

При `health = 90`, `max_health = 100`, `buff_rate = 1` → прирост `1 * 0.9` в секунду. При `health = 20` → `1 * 0.2` (медленно).

В сценарии обычно `buff_coefficient: 1`, `buff_duration: 0`. Текущие значения — в `character_instance.stats`. При окончании таймера (`buff_duration` → 0) движок сбрасывает временные `buff_rate` и `buff_coefficient` к значениям из сценария.



### Пример: здоровье

```json
{
  "name": "health",
  "description": "",
  "kind": "passive",
  "min": 0,
  "max": 100,
  "default": 100,
  "buff_rate": 0,
  "buff_duration": 0,
  "buff_coefficient": 1
}
```



### Тик движка (каждую секунду)

1. обработать только статы с `kind` ≠ `none`
2. `value += buff_rate * buff_coefficient`
3. clamp в `[min, max]`
4. если `buff_duration > 0` → уменьшить на 1; при 0 сбросить временные `buff_rate` и `buff_coefficient` к сценарию
5. у активных рецептов: если `duration_left_sec > 0` → уменьшить на 1; если стало `0` — **удалить** (броня с `duration_left_sec: 0` не трогается — только снятие)
6. пересчитать активные рецепты / проверить `triggers` (в т.ч. синергии `has("…")`)

---



## Рецепты

У **каждого** рецепта всегда одни и те же поля:


| Поле           | Тип                                         | описание                                     |
| -------------- | ------------------------------------------- | -------------------------------------------- |
| `name`         | string                                      | уникальное имя рецепта в сценарии            |
| `description`  | string                                      | `""`                                         |
| `kind`         | `none` \| `instant` \| `timed` \| `passive` | —                                            |
| `uses`         | number                                      | начальное `uses_left` при выпуске экземпляра |
| `uses_max`     | number                                      | максимум применений; `0` — без лимита        |
| `duration_sec` | number                                      | таймер присутствия на персонаже; `0` — без таймера (броня/экипировка — пока не снимешь) |
| `while`        | string                                      | `""` — без условия                           |
| `effects`      | array                                       | `[]`                                         |
| `start`        | array                                       | `[]` — имена рецептов (`name`)               |
| `stop`         | array                                       | `[]` — имена рецептов (`name`)               |
| `triggers`     | array                                       | `[]`                                         |
| `signature`    | string                                      | HMAC-SHA256 hex, см. ниже                    |


`kind`:

- `none` — выключен
- `instant` — эффекты **один раз** при применении; при `duration_sec > 0` запись ещё висит как маркер
- `timed` — живёт `duration_sec`, потом удаляется
- `passive` — пока в активном наборе (механика мира, **одетая броня** и т.п.)

Эффекты при применении исполняются сразу. Запись рецепта на персонаже:

| Случай | Как уходит с персонажа |
| ------ | ---------------------- |
| препарат / timed (`duration_sec > 0`) | по таймеру `duration_left_sec` → 0 → **удалить** |
| броня / экипировка (`duration_sec = 0`, `equipped`) | только когда **снимешь** (`equipped: false`) |
| механика (`passive`) | пока в наборе / `stop` |

Пока несколько рецептов в списке — можно делать наложения: `has("item_speech_strength") && has("nuka_cola_hangover")`.

`uses` и `uses_max` в сценарии — **шаблон**, не меняется при игре. Сколько раз уже применили и сколько осталось — в **экземпляре рецепта** (`recipe_instance`), с отдельной подписью.

При выпуске предмета / записи на тег: `uses_left = uses`, `uses_applied = uses_max > 0 ? uses_max - uses : 0`. При `uses_max: 0` оба счётчика остаются `0`, лимит не тратится.

### `signature` (сценарий)

У каждого рецепта обязательна подпись — движок не загружает и не применяет рецепт с неверной подписью.

Алгоритм:

1. Взять все поля рецепта **кроме** `signature`
2. Сериализовать в канонический JSON (ключи отсортированы, без пробелов)
3. `payload = scenario_name + "|" + canonical_json`
4. `signature = HMAC-SHA256(payload, engine_key)` в hex (64 символа)

Любое изменение эффектов, `triggers` и т.д. ломает подпись. Пересчитать подпись может только автор сценария (редактор / мастер), не PDA игрока.

Кто сейчас активен на персонаже — записи в `character_instance.recipes` со `status: "active"`.

### Экземпляр рецепта на NFC (`recipe_instance`)

Инвентаря нет: предметы реальные — NFC-карты. На карте лежит экземпляр рецепта.

У **каждой** карты всегда одни и те же поля:


| Поле            | Тип     | описание |
| --------------- | ------- | -------- |
| `scenario_name` | string  | **имя сценария игры** (`fallout`, `ft3`, …). PDA принимает карту только если совпадает с `character_instance.scenario_name` |
| `instance_id`   | string  | UID метки |
| `name`          | string  | имя рецепта из сценария |
| `equipped`      | boolean | `true` — одет / активен на персонаже; `false` — снят |
| `uses_applied`  | number  | сколько раз уже применили |
| `uses_left`     | number  | сколько применений осталось |
| `signature`     | string  | HMAC-SHA256 hex |

Инвариант при `uses_max > 0`: `uses_applied + uses_left == uses_max` (из сценария).

#### Одеть / снять

Это работа с рецептом, не с инвентарём. **При одевании и снятии меняется ключ подписи** — просто переключить `equipped` без PDA нельзя.

| Действие | На NFC | Ключ подписи | На персонаже |
| -------- | ------ | ------------ | ------------ |
| **Одеть** | `equipped: true`, переподписать | ключ **персонажа** (метка привязана к носителю) | добавить рецепт `active`, `effects` / `start` |
| **Снять** | `equipped: false`, переподписать | ключ **метки** (свободный предмет) | убрать рецепт (`stop`), снять эффекты |

Если `equipped: true` — карту нельзя «одеть» на другого: подпись с чужим ключом не сойдётся.

Расходники (стимпак, кола): `equipped` всегда `false`; ключ метки; сканирование = применение (`uses_*`).

#### Применение (расход `uses`, если `uses_max > 0`)

1. проверить `scenario_name` и подпись (ключ метки, `equipped: false`)
2. если `uses_left <= 0` — отказ
3. выполнить эффекты рецепта из сценария
4. `uses_applied += 1`, `uses_left -= 1`
5. пересчитать `signature` тем же ключом метки и записать на тег

### `signature` (экземпляр на NFC)

1. `body = { "name", "equipped", "uses_applied", "uses_left" }` — канонический JSON
2. `payload = instance_id + "|" + scenario_name + "|" + canonical_json(body)`
3. выбрать ключ:
   - `equipped: false` → `instance_key = K_tag` (из UID метки)
   - `equipped: true` → `instance_key = K_char` (из UID метки **и** `instance_id` персонажа)
4. `signature = HMAC-SHA256(payload, instance_key)` в hex (64 символа)

`K_tag` и `K_char` выводятся в прошивке PDA (как шифрование FT3), в JSON не хранятся. Смена `equipped` без смены ключа → подпись невалидна.

### Пример: тег с бронёй (одета)

```json
{
  "scenario_name": "fallout",
  "instance_id": "deadbeef01",
  "name": "armor_leather",
  "equipped": true,
  "uses_applied": 0,
  "uses_left": 0,
  "signature": "d97a18eb132b8a7941a9ad0804c7a0e1cdb2cb10a5f443f261dde2f6bad043b4"
}
```

Полный пример: `recipe_instance.armor.example.json`.

### Пример: тег со стимпаком (расходник)

```json
{
  "scenario_name": "fallout",
  "instance_id": "04a1b2c3d4e5f6",
  "name": "item_stimpak",
  "equipped": false,
  "uses_applied": 0,
  "uses_left": 1,
  "signature": "232c4e9490ba2eb172b476231b4e050bf56384a3b13b20092ce3cd2e93f728f5"
}
```

### Пример: тег с Ядер-Колой после одного глотка

```json
{
  "scenario_name": "ft3",
  "instance_id": "aabbccddeeff",
  "name": "nuka_cola",
  "equipped": false,
  "uses_applied": 1,
  "uses_left": 1,
  "signature": "aeb74afec180cabca6b760245399aa881f19cbc3f949970f2c03122e6ec7d7bf"
}
```

Полный пример: `recipe_instance.example.json`.



### Эффект


| Поле     | Значения                                                  |
| -------- | --------------------------------------------------------- |
| `target` | `name` стата                                              |
| `op`     | `set`, `add`, `set_buff_rate`, `add_buff_rate`, `set_buff_duration`, `set_buff_coefficient`, `add_buff_coefficient` |
| `expr`   | число или формула                                         |




### Триггер


| `edge`       | Когда срабатывает               |
| ------------ | ------------------------------- |
| `on_rise`    | Условие стало истинным          |
| `on_fall`    | Условие перестало быть истинным |
| `while_true` | Каждый тик, пока истинно        |
| `once`       | Один раз при истинном условии   |




### Пример: стимпак

```json
{
  "name": "item_stimpak",
  "description": "",
  "kind": "instant",
  "uses": 1,
  "uses_max": 1,
  "duration_sec": 0,
  "while": "",
  "effects": [
    { "target": "health", "op": "add", "expr": "35" }
  ],
  "start": [],
  "stop": [],
  "triggers": [],
  "signature": "ab0d3dfaaca3ff4c9957ddc2eb37d664f91d908ca0a8a40097ba29d32dd595db"
}
```

Подпись считается для `scenario_name: "fallout"` (см. раздел `signature` выше).

### Пример: Ядер-Кола (порт FT3)

Исходник:

```text
nfcw PROTO:FT3
USES:2
PERK:SUR
NAME:Ядер-Кола
TEXT:Зарядись энергией атома!
EFFECTS:
TAR15 ADD40
TAR25 ADD100
TAR18 ADD18000
REMk EIDd CONfQTYk>0
TAR8 ADD-2 REP7200 AFT600 EIDk CONfQTYd>0
TAR8 ADD-2 REP7200 AFT600 EIDk CONv28!=3&fQTYk=0&v7+v14<fRND12
```

Соответствие:

- `PROTO:FT3` → `scenario_name: "ft3"`
- `NAME` → `name` корневого рецепта предмета
- `TEXT` → `description`
- `USES` → `uses_max` в сценарии; на теге — `uses_left` / `uses_applied` в `recipe_instance`
- `PERK:SUR` → trigger при `perk_survivor == 1`
- `EFFECTS` → `effects` + цепочка `start` / `stop` / timed-рецептов

```json
{
  "scenario_name": "ft3",
  "recipes": [
    {
      "name": "nuka_cola",
      "description": "Charge up with atomic energy!",
      "kind": "instant",
      "uses": 2,
      "uses_max": 2,
      "duration_sec": 0,
      "while": "",
      "effects": [
        { "target": "health", "op": "add", "expr": "40" },
        { "target": "radiation", "op": "add", "expr": "100" },
        { "target": "water", "op": "add", "expr": "18000" }
      ],
      "start": ["nuka_cola_logic"],
      "stop": [],
      "triggers": [
        {
          "when": "perk_survivor == 1",
          "edge": "once",
          "effects": [
            { "target": "radiation", "op": "set", "expr": "0" }
          ],
          "start": [],
          "stop": []
        }
      ],
      "signature": "4e51d97ddc8e0df38ebd1c754be5b76b0bc5beeba9af76306467f25e7cce69c3"
    },
    {
      "name": "nuka_cola_logic",
      "description": "Addiction / refresh branches",
      "kind": "instant",
      "uses": 0,
      "uses_max": 0,
      "duration_sec": 0,
      "while": "",
      "effects": [],
      "start": [],
      "stop": [],
      "triggers": [
        {
          "when": "nuka_addicted == 1",
          "edge": "once",
          "effects": [
            { "target": "nuka_crash_pending", "op": "set", "expr": "1" }
          ],
          "start": ["nuka_cola_crash_arm"],
          "stop": ["nuka_cola_hangover"]
        },
        {
          "when": "nuka_addicted == 0 && perk_party_king == 0 && luck < rnd(12)",
          "edge": "once",
          "effects": [],
          "start": ["nuka_cola_crash_arm"],
          "stop": []
        }
      ],
      "signature": "c506ceb543068fdc4bbe4ea816ca6dc8514ec23ce7f3ce59df7ed4a1f3a4e33c"
    },
    {
      "name": "nuka_cola_crash_arm",
      "description": "Delay 600s before hangover",
      "kind": "timed",
      "uses": 0,
      "uses_max": 0,
      "duration_sec": 600,
      "while": "",
      "effects": [
        { "target": "nuka_crash_timer", "op": "set", "expr": "600" },
        { "target": "nuka_crash_timer", "op": "set_buff_rate", "expr": "-1" },
        { "target": "nuka_crash_timer", "op": "set_buff_duration", "expr": "600" }
      ],
      "start": [],
      "stop": [],
      "triggers": [
        {
          "when": "nuka_crash_timer <= 0",
          "edge": "on_rise",
          "effects": [
            { "target": "nuka_crash_timer", "op": "set_buff_rate", "expr": "0" },
            { "target": "nuka_crash_pending", "op": "set", "expr": "0" }
          ],
          "start": ["nuka_cola_hangover"],
          "stop": []
        }
      ],
      "signature": "7a5f2ce30accea7ff4282f1ef29d3a6934c4ba9383a7d5d246ca0f49b695cfdd"
    },
    {
      "name": "nuka_cola_hangover",
      "description": "Strength -2 for 7200s",
      "kind": "timed",
      "uses": 0,
      "uses_max": 0,
      "duration_sec": 7200,
      "while": "",
      "effects": [
        { "target": "strength", "op": "add", "expr": "-2" },
        { "target": "strength", "op": "set_buff_duration", "expr": "7200" },
        { "target": "nuka_addicted", "op": "set", "expr": "1" }
      ],
      "start": [],
      "stop": [],
      "triggers": [],
      "signature": "8f479fe9444e0fa740552f0f6195c44261c126c683abe106c34bd39892f0d3ff"
    }
  ]
}
```

Цепочка: `nuka_cola` → `nuka_cola_logic` → `nuka_cola_crash_arm` (600 с) → `nuka_cola_hangover` (7200 с).

---



## Экземпляр персонажа (PDA)

У персонажа всегда три блока:

| Поле            | Роль |
| --------------- | ---- |
| `scenario_name` | **обязательно** — имя сценария (`fallout`, `ft3`, …). Движок грузит соответствующий `character_model` |
| `stats`         | текущие значения статов + `buff_rate`, `buff_duration`, `buff_coefficient` |
| `recipes`       | применённые препараты, одетые предметы, механика; маркер присутствия до конца `duration_left_sec` |

Плюс `instance_id` — id PDA / персонажа. Инвентаря нет — предметы только как NFC-карты.

```json
{
  "scenario_name": "fallout",
  "instance_id": "04a1b2c3d4e5f6",
  "stats": [
    { "name": "health", "value": 87, "buff_rate": 1, "buff_duration": 0, "buff_coefficient": 0.87 },
    { "name": "radiation", "value": 12, "buff_rate": 0, "buff_duration": 0, "buff_coefficient": 1 },
    { "name": "strength", "value": 5, "buff_rate": 0, "buff_duration": 420, "buff_coefficient": 1 },
    { "name": "armor_phys_resist", "value": 15, "buff_rate": 0, "buff_duration": 0, "buff_coefficient": 1 }
  ],
  "recipes": [
    {
      "name": "mech_core",
      "status": "active",
      "duration_left_sec": 0,
      "uses_applied": 0,
      "uses_left": 0,
      "signature": "ad258f9f769c70013538e55b7c4945c387ce227862bc9723d1cdee5da4dcfb61"
    },
    {
      "name": "armor_leather",
      "status": "active",
      "duration_left_sec": 0,
      "uses_applied": 0,
      "uses_left": 0,
      "signature": "d70914254aa7fc4d527b51431a163dce56b5faf17bc9a90c544366564e27118b"
    },
    {
      "name": "item_speech_strength",
      "status": "active",
      "duration_left_sec": 420,
      "uses_applied": 1,
      "uses_left": 4,
      "signature": "0a449b448940750be6f43d703eb384359667dd786e4fce7acaba3fe5859839fa"
    },
    {
      "name": "nuka_cola_hangover",
      "status": "active",
      "duration_left_sec": 5400,
      "uses_applied": 0,
      "uses_left": 0,
      "signature": "02c509b05add671fb493e5bd115d686ba2ba9651d909af8b8cd02cee3ec27665"
    }
  ]
}
```

Применение препарата: эффекты сразу → запись в `recipes` с `duration_left_sec = duration_sec`. По нулю таймера запись удаляется. Пока оба «речи» и «похмелье» в списке — можно проверить `has("item_speech_strength") && has("nuka_cola_hangover")` для доп. эффекта.

### Стат на персонаже

| Поле                | Тип    | описание |
| ------------------- | ------ | -------- |
| `name`              | string | имя стата из сценария |
| `value`             | number | текущее значение |
| `buff_rate`   | number | базовый rate |
| `buff_duration` | number | сколько секунд ещё действует временный баф; `0` — нет |
| `buff_coefficient`  | number | множитель к rate (`1` — нейтрально) |

Пример: похмелье держит `strength` с `buff_duration: 5400`. Реген: `health` с `buff_rate: 1` и `buff_coefficient: 0.87` → +0.87 HP/с.

### Рецепт на персонаже

У каждой записи в `recipes` одни и те же поля:

| Поле                | Тип                   | описание |
| ------------------- | --------------------- | -------- |
| `name`              | string                | имя рецепта из сценария |
| `status`            | `active` \| `pending` | `active` — на персонаже сейчас; `pending` — ждёт `start` / триггер |
| `duration_left_sec` | number                | остаток таймера присутствия; тикает только если `> 0`. У брони / passive — `0` (живёт до снятия / `stop`) |
| `uses_applied`      | number                | сколько раз уже применили (если считаем на персонаже) |
| `uses_left`         | number                | сколько осталось |
| `signature`         | string                | HMAC-SHA256 hex |

`status`:

- `active` — механика, **одетый** предмет, **уже применённый** препарат (эффекты сделаны, запись для сверки и синергий)
- `pending` — ждёт активации по триггеру / `start`

Одеть броню: NFC `equipped: true`, подпись ключом **персонажа** + рецепт на персонаже `active`, `duration_left_sec: 0`.  
Снять: NFC `equipped: false`, подпись ключом **метки** + убрать рецепт.  
Препарат: эффекты сразу + `duration_left_sec = duration_sec`; по таймеру — удалить запись.

### `signature` (рецепт на персонаже)

1. `body = { "name", "status", "uses_applied", "uses_left" }` — канонический JSON
2. `payload = instance_id + "|" + scenario_name + "|" + canonical_json(body)`
3. `signature = HMAC-SHA256(payload, instance_key)` в hex

Полный пример: `character_instance.example.json`.

---

## Минимальный JSON-файл сценария

```json
{
  "scenario_name": "fallout",
  "stats": [ ],
  "recipes": [ ]
}
```

Сценарий неизменяем на PDA. Состояние персонажа — в `character_instance` (обязательно с `scenario_name`). Предметы — NFC-карты (`recipe_instance` с тем же `scenario_name` и флагом `equipped`).