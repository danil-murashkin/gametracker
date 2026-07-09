# Research

Рабочие заметки и исследования по проекту gametracker.

## Архитектура

UI — [PicoPixel](https://picopixel.io/) / [SquareLine](https://squareline.io/) (export → LVGL C), логика — `rules.json` (вручную или внешние инструменты, см. [editor/README.md](../editor/README.md)).

На **ПК** — **симулятор** (LVGL + Logic Engine + HAL mock): те же `ui/*.c` и `rules.json`, разработка UI и бизнес-логики **без железа**.

На **ESP32** — прошивка **ESP-IDF**: Logic Engine (FSM) и HAL для реальной периферии.

```mermaid
flowchart LR

%% =======================
%% DESIGN
%% =======================
subgraph D["Design (ПК)"]
    direction TB
    LE["LVGL editor"]
    BE["Blockly editor"]
end

%% =======================
%% RUNTIME
%% =======================
subgraph R["Runtime (ESP32 / симулятор)"]
    direction LR
    lvgl["LVGL\n(SDL 240×320 / ST7789)"]
    le["Logic Engine\n(FSM)"]
    hal["HAL\n(mock / периферия)"]

    lvgl --> le --> hal
end

%% =======================
%% CROSS LINKS
%% =======================
LE -->|"ui/*.c"| lvgl
BE -->|"rules.json"| le
```





### Симулятор vs ESP32


| Компонент        | В симуляторе          | На ESP32          |
| ---------------- | --------------------- | ----------------- |
| UI               | LVGL (SDL), 240×320   | LVGL → ST7789     |
| Logic Engine     | тот же `logic_engine` | тот же            |
| rules.json       | загрузка с диска      | LittleFS / embed  |
| Энкодер          | клавиши ↑↓ Enter      | EC11              |
| LoRa / GPS / NFC | mock + ручные события | реальные драйверы |




### Структура репозитория


| Путь                      | Роль                                                       |
| ------------------------- | ---------------------------------------------------------- |
| `editor/`                 | LVGL Editor: Design, Logic, Code, Preview, **Simulator** (WASM) |
| `common/rules/rules.json` | Единый файл логики (симулятор читает с диска, ESP — embed) |
| `common/logic/`           | Logic Engine (FSM) + загрузчик JSON                        |
| `common/ui/`              | LVGL UI (демо-экран: метка + квадрат)                      |
| `common/app/`             | Склейка logic + ui                                         |
| `firmware/`               | ESP-IDF, ST7789, тот же common-код                         |




### Текущий этап

**Демо архитектуры:** Blockly → `rules.json` → Logic Engine → common UI → HAL (mock в симуляторе, ST7789 на ESP32).

## Demo — FSM

Демонстрация цепочки **Design → rules.json → Logic Engine → UI → HAL** на ПК и ESP32.

### Сценарий

Три состояния FSM: **Home** (синий) → **Warning** (оранжевый) → **OK** (зелёный).

- **enc_cw** (→ / ↑) — следующее состояние
- **enc_ccw** (← / ↓) — предыдущее
- **enc_press** (Space / Enter) — сброс в Home



### 1. Логика (`rules.json`)

Отредактируйте [common/rules/rules.json](../common/rules/rules.json) вручную или во внешнем JSON-редакторе. Формат и ссылки на инструменты: [editor/README.md](../editor/README.md).

### 2. Симулятор (браузер)

Вкладка **Simulator** в [`editor/`](../editor/): `cd editor` → `.\lvgl-editor-start.ps1` → http://localhost:8083.

Компилируется и запускается тот же сгенерированный C (Emscripten + LVGL). Управление: клик по canvas; GPIO: ↑/+ = value_1, ↓/− = value_2.

### 3. Прошивка (ESP32)

```powershell
cd firmware
. .\activate-idf.ps1
idf.py build flash monitor
```

На плате без энкодера отображается **начальное состояние** из `rules.json`. Полное управление — в **Simulator** (редактор) или на устройстве.

После изменения `common/rules/rules.json` пересоберите прошивку (`rules.json` вшивается через `EMBED_FILES`).

### Поток данных

```
Blockly (editor) ──► rules.json
                         │
         ┌───────────────┴───────────────┐
         ▼                               ▼
   editor Simulator (WASM)        firmware (embed)
         │                               │
         └─► rules_loader ─► logic_engine ─► ui_demo
                         ▲
                   hal_input (mock / stub)
```



### PicoPixel

UI в `common/ui/ui_demo.c` — ручной аналог экспорта PicoPixel. В продакшене сюда попадает сгенерированный `ui/*.c`.

## Симулятор и редакторы

**Редактор:** UI и логика в [`editor/`](../editor/) (форк IoTSharp/lvgl-editor). Симуляция — вкладка **Simulator** (WASM в браузере). Подробно: [editor/README.md](../editor/README.md).

## Сборка и прошивка

Требуется [ESP-IDF](https://docs.espressif.com/projects/esp-idf/) v5.2+.

**Windows (PowerShell):** перед `idf.py` активируйте окружение (в каждой новой сессии терминала):

```powershell
cd firmware
. .\activate-idf.ps1
idf.py set-target esp32
idf.py build
idf.py -p COM3 flash monitor
```

`activate-idf.ps1` обновляет PATH и вызывает `C:\esp\esp-idf\export.ps1`.

Вручную:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned   # один раз, если export.ps1 блокируется
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
. C:\esp\esp-idf\export.ps1
```

**Если** `Python was not found`**:** перезапустите терминал после установки Python, либо выполните обновление PATH (строка выше). Отключите заглушки: *Параметры → Приложения → Дополнительные параметры приложения → Псевдонимы выполнения приложения* — выключить **python.exe** и **python3.exe** (Microsoft Store).

Либо откройте **ESP-IDF PowerShell** из меню Пуск — там `export.ps1` уже выполнен.

Windows: укажите COM-порт платы (Device Manager → Ports), например `COM3`.

Отладка дисплея: [firmware/docs/display_bringup.md](../firmware/docs/display_bringup.md).

## Дисплей

Тестовая плата — **WEMOS LOLIN32 Lite** (ESP32). На время отладки к плате подключён **только дисплей** [ST7789V-IPS](https://atta.szlcsc.com/upload/public/pdf/source/231023/C17266248-824cb1ca90bae285eda83c99054d40ed.pdf) 2.4" · 240×320 · SPI · без тача.

Подключение по **4-wire SPI** (аппаратный SPI ESP32):


| Дисплей           | LOLIN32 Lite |
| ----------------- | ------------ |
| GND               | GND          |
| VCC               | 3.3 V        |
| LED (Backlight)   | GPIO 22      |
| RESET             | GPIO 16      |
| DC (Data/Command) | GPIO 17      |
| CS (Chip Select)  | GPIO 5       |
| SCK               | GPIO 18      |
| SDI (MOSI)        | GPIO 23      |
| SDO (MISO)        | GPIO 19      |




## Софт

- **UI:** [LVGL](https://github.com/lvgl/lvgl) 8.3 — embedded; симуляция в браузере (Emscripten, вкладка Simulator в `editor/`)
- **UI editor:** [PicoPixel](https://picopixel.io/) — design time
- **Logic:** `rules.json` (редактирование вручную или внешние инструменты — см. [editor/README.md](../editor/README.md))
- **LoRa:** [libdriver/llcc68](https://github.com/libdriver/llcc68) — драйвер для MCU (в симуляторе — mock)



## Компоненты


| Наименование          | Модель                                                                                                                                                                                                                                                                                                    | Характеристики                                              |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Дисплей               | [ST7789V-IPS](https://atta.szlcsc.com/upload/public/pdf/source/231023/C17266248-824cb1ca90bae285eda83c99054d40ed.pdf) [(pdf)](https://dl.espressif.com/dl/schematics/LCD_ST7789.pdf) [(китай)](item.taobao.com/item.htm?id=748230294619&skuId=5331484727441)                                              | 2.4" · IPS · ST7789 · SPI · 240×320 · FPC 18 pin · без тача |
| GPS                   | [ATGM332D-5N71](https://pese.oss-cn-shenzhen.aliyuncs.com/pdfs/1911211831_ZHONGKEWEI-ATGM332D_C458416.pdf) [(китай)](https://item.taobao.com/item.htm?id=669388277778&skuId=4886966828708) (*AT6558)                                                                                                      | GPS + GLONASS · UART NMEA0183 · 2.7–3.6 V · 12.2×16 mm      |
| Микроконтроллер       | [ESP32](https://m5stack.oss-cn-shenzhen.aliyuncs.com/resource/docs/datasheet/core/esp32_datasheet_cn.pdf) [ESP32-S3](https://m5stack-doc.oss-cn-shenzhen.aliyuncs.com/472/esp32-s3_datasheet_cn.pdf) [ESP32-C6](https://www.espressif.com.cn/sites/default/files/documentation/esp32-c6_datasheet_cn.pdf) | Wi-Fi · BLE · ESP32-S3 / ESP32-C6 / ESP32                   |
| Аккумулятор резервный | [LiPo 150 mAh](https://atta.szlcsc.com/upload/public/pdf/source/20220914/ED735F4F9B1062A69980EE16902043DC.pdf)                                                                                                                                                                                            | LiPo 150 mAh                                                |
| Аккумулятор основной  | [LiPo 10000 mAh (146074)](https://atta.szlcsc.com/upload/public/pdf/source/20240508/57699078A8D750A37A92A5375737A576.pdf) [LiPo 2000 mAh (18650)](https://atta.szlcsc.com/upload/public/pdf/source/20180125/C165987_15168650465801302945.pdf)                                                             | LiPo 10000 mAh (146074) / LiPo 18650 2000 mAh               |
| LoRa                  | [LLCC68IMLTRT](https://atta.szlcsc.com/upload/public/pdf/source/20221229/96B0032DA4E361705241C07294BF0368.pdf) [(китай)](https://item.taobao.com/item.htm?id=916210411051)                                                                                                                                | LLCC68 · 410–525 MHz · SPI · 22 dBm                         |
| Управление            | [EC11](https://atta.szlcsc.com/upload/public/pdf/source/20190109/C361167_8025A1363C62EF4BA37C0EA12E1AE3EA.pdf) [B3F](https://datasheet.lcsc.com/datasheet/C93157.pdf)                                                                                                                                     | энкодер · 1–2 кнопки                                        |
| NFC                   | [MFRC52202HN1](https://datasheet.lcsc.com/datasheet/pdf/4003bd6175b1d67870d9c9f9ebe671c6.pdf) [(китай)](https://item.taobao.com/item.htm?id=631022878377&skuId=4659695028435)                                                                                                                             | 13.56 MHz · ISO14443A / MIFARE · SPI / I²C / UART           |


