# Игровой движок

---
Две сущности:


| Сущность                | Роль                                                                   |
| ----------------------- | ---------------------------------------------------------------------- |
| **Статы** (`stats`)     | Состояние персонажа: здоровье, SPECIAL, радиация, флаги смерти/болезни |
| **Рецепты** (`recipes`) | Правила изменения статов: предметы, броня, механика мира, триггеры     |


**Принцип:** у каждого стата и каждого рецепта **одинаковый набор полей**  
**Сценарий:** `character_model.example.json` + `character_model.schema.json`  
**Рантайм:** `character_instance.example.json` + `character_instance.schema.json` (персонаж / PDA); для предмета на NFC — `recipe_instance.example.json` + `recipe_instance.schema.json`.

---

## Протокол хранения данных

Протокол поддерживает гибкую передачу структурированных данных (статов, рецептов) в разных форматах. Все бинарные блоки (CBOR) при передаче через текстовые каналы обязательно кодируются в Base64.

На NFC-метке (≤ 512 байт) чистый CBOR или чистый JSON могут использоваться напрямую; при вложении в другой контейнер действуют правила ниже.

### Форматы обмена

| Формат | Контейнер | Содержимое `data` |
| ------ | --------- | ----------------- |
| **JSON внутри CBOR** | CBOR | `{ "dict": [...], "data": "<строка JSON>" }` — вложенный JSON как `text string`, **без** Base64 |
| **CBOR внутри JSON** | JSON | `{ "dict": [...], "data": "<base64-кодированный CBOR>" }` |
| **Чистый CBOR / JSON** | — | напрямую (NFC, прошивка) |

Все бинарные данные (CBOR-блоки) при передаче внутри других структур или по текстовым каналам всегда кодируются в Base64.

### Словарь имён параметров

Всегда первым элементом идёт словарь дополнительных имён (`dict`):

- значения с ID **0–127** — фиксированный словарь (базовые поля);
- ID **≥ 128** — индекс в `dict` (расширения).

Такой подход даёт компактность на NFC (до 512 байт), универсальность форматов и расширяемость без потери совместимости между устройствами.

### Имена полей на проводе ↔ схема

В компактном представлении (CBOR, бинарный pack) используются короткие имена; в JSON-сценарии и схемах — полные:

| Провод (`wire`) | Схема / JSON | Описание |
| --------------- | ------------ | -------- |
| `desc` | `description` | краткое описание |
| `type` | `kind` | `none`, `inst`→`instant`, `tmp`→`timed`, `pasv`→`passive` |
| `def` | `default` | значение по умолчанию |
| `rate` | `buff_rate` | базовая скорость изменения за тик |
| `time` | `buff_duration` | длительность баффа/дебаффа (с); `0` — нет таймера |
| `coef` | `buff_coefficient` | множитель к скорости изменения |
| `stats` | `effects` | эффекты рецепта по статам |
| `sig` | `signature` | подпись HMAC |

### Структура стата (`stat`) на проводе

Порядок значений в CBOR **строго фиксирован**: сначала базовые параметры (ID ≤ 127), затем расширения по `dict`.

| Поле | Описание |
| ---- | -------- |
| `name` | имя стата |
| `desc` | краткое описание |
| `type` | `none`, `inst`, `tmp`, `pasv` |
| `min` | минимум |
| `max` | максимум |
| `def` | значение по умолчанию |
| `rate` | базовая скорость изменения за тик |
| `time` | длительность баффа/дебаффа (с); `0` — нет таймера |
| `coef` | множитель к скорости изменения |

Пример (эквивалент `health` из раздела «Статы»):

```json
{
  "name": "health",
  "desc": "",
  "type": "pasv",
  "min": 0,
  "max": 100,
  "def": 100,
  "rate": 0,
  "time": 0,
  "coef": 1
}
```

### Структура рецепта на проводе

Рецепт содержит объект `stats` (в схеме — `effects`): ключи — имена статов, значения — только те параметры, которые нужно скорректировать.

Операция над параметром задаётся **строкой**:

| Запись | Действие |
| ------ | -------- |
| `+n` | прибавить `n` |
| `-n` | вычесть `n` |
| `=0` | занулить параметр |
| `=1..n` | установить конкретное число |
| `type: "<строка>"` | сменить тип поведения (`none`, `inst`, `tmp`, `pasv`) |

Пример стимпака (`item_stimpak`):

```json
{
  "name": "item_stimpak",
  "desc": "",
  "type": "inst",
  "uses": 3,
  "sig": "<подпись HMAC>",
  "stats": {
    "health": { "value": "+35" },
    "rad": { "value": "=0" }
  }
}
```

Рецепт брони (`armor_leather`) — броня как рецепт своего воздействия на статы:

```json
{
  "name": "armor_leather",
  "desc": "",
  "type": "pasv",
  "uses": 1,
  "sig": "<подпись HMAC>",
  "stats": {
    "phys_resist": { "value": "=40" },
    "armor_phys": { "value": "+2" }
  }
}
```

При надевании движок применяет изменения; при снятии — отменяет, так как рецепт перестаёт быть активным.

### Применение рецепта (проводной формат)

1. Проверить `sig` (HMAC).
2. Установить `uses` из рецепта.
3. Пройти по ключам `stats`.
4. Для каждого ключа найти соответствующий стат персонажа.
5. Разобрать строку значения: `+` / `-` / `=0` / `=n` / смена `type`.
6. Проверить ограничения (`min`, `max`) и целостность.
7. Для брони/предмета при снятии — убрать корректировки из активных рецептов.
8. При повторном применении: если `uses == 0`, блокировать до нового рецепта с `uses = 1` (механика «одеть/снять» через отдельные рецепты активации и деактивации).

Поведение по `type`:

- `inst` — мгновенно, затем исчезает;
- `pasv` — пока рецепт активен (броня, механика мира).

В каноническом JSON-сценарии те же правила описаны через `kind`, `effects` с числовыми дельтами и поля `signature` — см. разделы «Статы», «Рецепты» и «Экземпляр рецепта на NFC».

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

Рецепт меняет параметры стата через `effects` (см. ниже): нет записи — не трогать; `0` — обнулить; иначе прибавить число.



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
| `effects`      | object                                      | стат → какие параметры менять; `{}` — ничего |
| `start`        | array                                       | `[]` — имена рецептов (`name`)               |
| `stop`         | array                                       | `[]` — имена рецептов (`name`)               |
| `triggers`     | array                                       | `[]`                                         |
| `signature`    | string                                      | 8 hex (HMAC усечён до 4 байт), см. ниже      |


`kind`:

- `none` — выключен
- `instant` — эффекты **один раз** при применении; при `duration_sec > 0` запись ещё висит как маркер
- `timed` — живёт `duration_sec`, потом удаляется
- `passive` — пока в активном наборе (механика мира, **одетая броня** и т.п.)

### Эффекты рецепта

Рецепт — перечень статов и дельт их параметров. Нет ключа — параметр не трогаем.

```json
"effects": {
  "health": { "value": 35 },
  "strength": { "value": -2, "buff_duration": 7200 },
  "radiation": { "value": 0 }
}
```

Для **каждого** указанного параметра стата (`value`, `buff_rate`, `buff_duration`, `buff_coefficient`):

| Запись | Действие |
| ------ | -------- |
| нет ключа | ничего не делать |
| `0` | выставить **0** |
| `+N` (например `1`, `35`) | **прибавить** N |
| `-N` (например `-1`, `-2`) | **отнять** N |

Примеры: `value: 1` → +1 к значению; `value: -1` → −1; `value: 0` → значение = 0; нет `buff_rate` → rate не меняется.

Эффекты при применении исполняются сразу. Запись рецепта на персонаже:

| Случай | Как уходит с персонажа |
| ------ | ---------------------- |
| препарат / timed (`duration_sec > 0`) | по таймеру `duration_left_sec` → 0 → **удалить** |
| броня / экипировка (`duration_sec = 0`) | только когда **снимешь** (подпись снова ключом метки) |
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
4. `signature = HMAC-SHA256(payload, engine_key)` → первые **4 байта** в hex (**8 символов**)

Любое изменение эффектов, `triggers` и т.д. ломает подпись. Пересчитать подпись может только автор сценария (редактор / мастер), не PDA игрока.

Кто сейчас активен на персонаже — записи в `character_instance.recipes` со `status: "active"`.

### Экземпляр рецепта на NFC (`recipe_instance`)

Инвентаря нет: предметы — NFC-карты.

**Лимит памяти метки: 512 байт.** На карту пишется только компактный JSON (без пробелов, без `$schema`). Типичный размер ~150–200 байт; запас — под NDEF/служебные заголовки чипа.

На тег **не** пишется `instance_id`: UID берётся с чипа при чтении (экономия места + нельзя подделать UID в JSON).

Поля на карте:


| Поле            | Тип     | лимит     | описание |
| --------------- | ------- | --------- | -------- |
| `scenario_name` | string  | ≤ 16      | сценарий игры; должен совпадать с персонажем |
| `name`          | string  | ≤ 32      | имя рецепта из сценария |
| `uses_applied`  | integer | 0…65535   | сколько раз применили |
| `uses_left`     | integer | 0…65535   | сколько осталось |
| `signature`     | string  | **8 hex** | HMAC-SHA256, обрезан до 4 байт |

Инвариант при `uses_max > 0`: `uses_applied + uses_left == uses_max`. При `uses_max: 0` оба `0` (броня).

Одет / снят — **отдельного поля нет**: по ключу подписи (`K_char` / `K_tag`) и счётчикам `uses_*`.

Запись на метку (wire):

```text
{"scenario_name":"ft3","name":"nuka_cola","uses_applied":1,"uses_left":1,"signature":"…"}
```

≈ 152 байта UTF-8 — укладывается в 512.

#### Одеть / снять

**При одевании и снятии меняется ключ подписи.**

| Действие | На NFC | Ключ | На персонаже |
| -------- | ------ | ---- | ------------ |
| **Одеть** | переподписать те же `uses_*` | `K_char` (UID метки + персонаж) | рецепт `active`, `effects` / `start` |
| **Снять** | переподписать те же `uses_*` | `K_tag` (только UID метки) | убрать рецепт (`stop`) |

Подпись с `K_char` этого персонажа → **одет**; с `K_tag` → **свободен**.

Расходники: всегда `K_tag`; меняются `uses_applied` / `uses_left`.

#### Применение (если `uses_max > 0`)

1. прочитать UID с чипа + JSON; проверить `scenario_name` и подпись (`K_tag`)
2. если `uses_left <= 0` — отказ
3. эффекты из сценария
4. `uses_applied += 1`, `uses_left -= 1`
5. переподписать и записать компактный JSON (≤ 512 байт)

### `signature` (экземпляр на NFC)

1. `body = { "name", "uses_applied", "uses_left" }` — канонический JSON
2. `payload = uid + "|" + scenario_name + "|" + canonical_json(body)` — `uid` с чипа
3. ключ: свободен → `K_tag`; одет → `K_char`
4. `signature = HMAC-SHA256(payload, key)` → первые **4 байта** в hex (**8 символов**)

### Пример: тег с бронёй (одета)

UID чипа (не в JSON): `deadbeef01`

```json
{"scenario_name":"fallout","name":"armor_leather","uses_applied":0,"uses_left":0,"signature":"80ca8366"}
```

### Пример: тег со стимпаком

UID: `04a1b2c3d4e5f6`

```json
{"scenario_name":"fallout","name":"item_stimpak","uses_applied":0,"uses_left":1,"signature":"b00e9fc4"}
```

### Пример: тег с Ядер-Колой (1 из 2)

UID: `aabbccddeeff`

```json
{"scenario_name":"ft3","name":"nuka_cola","uses_applied":1,"uses_left":1,"signature":"fdc1ba16"}
```

Файлы с отступами — для чтения в репо (`recipe_instance.example.json`); на чип — одна строка без пробелов.

#### Запись / чтение NFC (без Base64)

На метку пишутся **сырые байты** (NDEF payload / user memory). Base64 не нужен — это только для текста в чате/файлах.

На карту идёт **только экземпляр** (`uses_*` + подпись), не блок из 4 рецептов Ядер-Колы. Полный сценарий (~2.3 КБ JSON / ~0.7 КБ zlib) живёт в прошивке PDA; даже сжатым в **512 байт NFC не влезает**.

| Формат на NFC | Размер | Заметка |
| ------------- | ------ | ------- |
| Компактный JSON (UTF-8 байты) | ~152 | можно писать как есть |
| **Бинарный pack** | ~50 | предпочтительно |
| Словарь токенов (FT3-стиль) | ~86 | как старый `pda_8266` |
| zlib всего сценария | ~734 | **не для NFC** (> 512) |

##### Ядер-Кола на NFC (1 из 2) — что реально пишется

Компактный JSON как байты (~152):

```text
{"scenario_name":"ft3","name":"nuka_cola","uses_applied":1,"uses_left":1,"signature":"fdc1ba16"}
```

Бинарный pack (~50 байт) — layout и hex для `Write`/`Read`:

```text
u8 sn_len | sn | u8 name_len | name | u16 le uses_applied | u16 le uses_left | 4 bytes HMAC
```

```text
03 667433
09 6e756b615f636f6c61
0100 0100
fd c1 ba 16
```

PDA после чтения по `scenario_name` + `name` подтягивает эффекты/триггеры из локальной модели.




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
  "effects": {
    "health": {
      "value": 35
    }
  },
  "start": [],
  "stop": [],
  "triggers": [],
  "signature": "5b792b6d"
}
```

Подпись для `scenario_name: "fallout"`.

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
      "effects": {
        "health": {
          "value": 40
        },
        "radiation": {
          "value": 100
        },
        "water": {
          "value": 18000
        }
      },
      "start": [
        "nuka_cola_logic"
      ],
      "stop": [],
      "triggers": [
        {
          "when": "perk_survivor == 1",
          "edge": "once",
          "effects": {
            "radiation": {
              "value": 0
            }
          },
          "start": [],
          "stop": []
        }
      ],
      "signature": "f778e666"
    },
    {
      "name": "nuka_cola_logic",
      "description": "REMk EIDd CONfQTYk>0 + hangover roll",
      "kind": "instant",
      "uses": 0,
      "uses_max": 0,
      "duration_sec": 0,
      "while": "",
      "effects": {},
      "start": [],
      "stop": [],
      "triggers": [
        {
          "when": "nuka_addicted == 1",
          "edge": "once",
          "effects": {
            "nuka_crash_pending": {
              "value": 1
            }
          },
          "start": [
            "nuka_cola_crash_arm"
          ],
          "stop": [
            "nuka_cola_hangover"
          ]
        },
        {
          "when": "nuka_addicted == 0 && perk_party_king == 0 && luck < rnd(12)",
          "edge": "once",
          "effects": {},
          "start": [
            "nuka_cola_crash_arm"
          ],
          "stop": []
        }
      ],
      "signature": "e6c63028"
    },
    {
      "name": "nuka_cola_crash_arm",
      "description": "AFT600 then hangover",
      "kind": "timed",
      "uses": 0,
      "uses_max": 0,
      "duration_sec": 600,
      "while": "",
      "effects": {
        "nuka_crash_timer": {
          "value": 600,
          "buff_rate": -1,
          "buff_duration": 600
        }
      },
      "start": [],
      "stop": [],
      "triggers": [
        {
          "when": "nuka_crash_timer <= 0",
          "edge": "on_rise",
          "effects": {
            "nuka_crash_timer": {
              "buff_rate": 0
            },
            "nuka_crash_pending": {
              "value": 0
            }
          },
          "start": [
            "nuka_cola_hangover"
          ],
          "stop": []
        }
      ],
      "signature": "5e9422a8"
    },
    {
      "name": "nuka_cola_hangover",
      "description": "TAR8 ADD-2 for 7200s (EID k)",
      "kind": "timed",
      "uses": 0,
      "uses_max": 0,
      "duration_sec": 7200,
      "while": "",
      "effects": {
        "strength": {
          "value": -2,
          "buff_duration": 7200
        },
        "nuka_addicted": {
          "value": 1
        }
      },
      "start": [],
      "stop": [],
      "triggers": [],
      "signature": "02c509b0"
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
      "signature": "ad258f9f"
    },
    {
      "name": "armor_leather",
      "status": "active",
      "duration_left_sec": 0,
      "uses_applied": 0,
      "uses_left": 0,
      "signature": "d7091425"
    },
    {
      "name": "item_speech_strength",
      "status": "active",
      "duration_left_sec": 420,
      "uses_applied": 1,
      "uses_left": 4,
      "signature": "0a449b44"
    },
    {
      "name": "nuka_cola_hangover",
      "status": "active",
      "duration_left_sec": 5400,
      "uses_applied": 0,
      "uses_left": 0,
      "signature": "02c509b0"
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
| `signature`         | string                | 8 hex (HMAC × 4 байта) |

`status`:

- `active` — механика, **одетый** предмет, **уже применённый** препарат (эффекты сделаны, запись для сверки и синергий)
- `pending` — ждёт активации по триггеру / `start`

Одеть броню: подпись ключом **персонажа** (`K_char`) + рецепт на персонаже `active`, `duration_left_sec: 0`.  
Снять: подпись ключом **метки** (`K_tag`) + убрать рецепт.  
Препарат: эффекты сразу + обновить `uses_applied` / `uses_left`; при `duration_sec > 0` — запись на персонаже до таймера.

### `signature` (рецепт на персонаже)

1. `body = { "name", "status", "uses_applied", "uses_left" }` — канонический JSON
2. `payload = instance_id + "|" + scenario_name + "|" + canonical_json(body)`
3. `signature = HMAC-SHA256(payload, instance_key)` → 4 байта hex (8 символов)

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

Сценарий неизменяем на PDA. Состояние персонажа — в `character_instance`. Предметы — NFC ≤ **512 байт** (`recipe_instance`: компактный JSON + подпись; UID с чипа; одет/снят — по `K_char` / `K_tag`).

---

## Симулятор (браузер)

Референсная реализация тиков, рецептов и триггеров — в каталоге [`engine/`](../../engine/).

| Что | Где |
| --- | --- |
| Спецификация | этот файл |
| Код движка | `engine/src/core/` |
| UI симулятора | `engine/src/ui/` |
| Примеры данных | `docs/game_model/*.example.json` |

Запуск:

```bash
cd engine
npm install
npm run dev
```

Откройте URL из вывода Vite (обычно `http://localhost:5173`).

В симуляторе можно:

- делать **тик** (1 сек) и **авто-тик** 1 Гц;
- **применять** и **снимать** рецепты из сценария;
- загрузить **пример instance** или **сбросить** персонажа из модели;
- смотреть таблицы статов, активных рецептов и журнал событий.

Подробнее: [`engine/README.md`](../../engine/README.md).