# lvgl_test

## Архитектура

UI — [PicoPixel](https://picopixel.io/) (export → LVGL C), логика — Blockly в браузере (`rules.json`).

На **ПК** — **симулятор** (LVGL + Logic Engine + HAL mock): те же `ui/*.c` и `rules.json`, разработка UI и бизнес-логики **без железа**.

На **ESP32** — прошивка **ESP-IDF**: Logic Engine (FSM) и HAL для реальной периферии.

```mermaid
flowchart TB

%% =======================
%% SIMULATOR
%% =======================
subgraph S["Симулятор (ПК)"]
    direction TB
    s_lvgl["LVGL\n(SDL 240×320)"]
    s_le["Logic Engine\n(FSM)"]
    s_hal["HAL mock"]

    s_lvgl --> s_le --> s_hal
end

%% =======================
%% DESIGN
%% =======================
subgraph D["Design (ПК)"]
    direction TB
    PP["PicoPixel"]
    UI["ui/*.c"]
    BL["Blockly"]
    RJ["rules.json"]

    PP --> UI
    BL --> RJ
end

%% =======================
%% ESP32
%% =======================
subgraph E["ESP32 (ESP-IDF)"]
    direction TB
    e_lvgl["LVGL\n(ST7789)"]
    e_le["Logic Engine\n(FSM)"]
    e_hal["HAL"]
    e_hw["Периферия\nST7789 · EC11 · LoRa · GPS · NFC"]

    e_lvgl --> e_le --> e_hal --> e_hw
end

%% =======================
%% CROSS LINKS
%% =======================
UI --> s_lvgl
UI --> e_lvgl

RJ --> s_le
RJ --> e_le
```





### Симулятор (ПК)

Разработка и отладка без ESP32: общий код с прошивкой, подмена железа заглушками.


| Компонент        | В симуляторе          | На ESP32          |
| ---------------- | --------------------- | ----------------- |
| UI               | LVGL (SDL), 240×320   | LVGL → ST7789     |
| Logic Engine     | тот же `logic_engine` | тот же            |
| rules.json       | загрузка с диска      | LittleFS / embed  |
| Энкодер          | клавиши ↑↓ Enter      | EC11              |
| LoRa / GPS / NFC | mock + ручные события | реальные драйверы |


Структура репозитория: `simulator/` (PC), `editor/` (Blockly), `firmware/` (ESP-IDF).

### Текущий этап

Реализован минимальный **display bring-up**: HAL ST7789 + LVGL 8.3 + один квадрат в `ui/`. Logic Engine, симулятор и периферия — заготовки.

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

**Если** `Python was not found`**:** перезапустите терминал после установки Python, либо выполните обновление PATH (строка выше). Отключите заглушки: *Параметры → Приложения → Дополнительные параметры приложения → Псевдонимы выполнения приложений* — выключить **python.exe** и **python3.exe** (Microsoft Store).

Либо откройте **ESP-IDF PowerShell** из меню Пуск — там `export.ps1` уже выполнен.

Windows: укажите COM-порт платы (Device Manager → Ports), например `COM3`.

Отладка дисплея: [firmware/docs/display_bringup.md](firmware/docs/display_bringup.md).

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

- **UI:** [LVGL](https://github.com/lvgl/lvgl) 8.3 — embedded + PC-симулятор (SDL)
- **UI editor:** [PicoPixel](https://picopixel.io/) — design time
- **Logic editor:** Blockly (браузер) → `rules.json`
- **LoRa:** [libdriver/llcc68](https://github.com/libdriver/llcc68) — драйвер для MCU (в симуляторе — mock)



## Компоненты


| Наименование          | Модель                                                                                                                                                                                                                                                                                                    | Характеристики                                              |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Дисплей               | [ST7789V-IPS](https://atta.szlcsc.com/upload/public/pdf/source/231023/C17266248-824cb1ca90bae285eda83c99054d40ed.pdf) [(pdf)](https://dl.espressif.com/dl/schematics/LCD_ST7789.pdf) [(китай)](https://click.world.taobao.com/_b.cpupc)                                                                                                                             | 2.4" · IPS · ST7789 · SPI · 240×320 · FPC 18 pin · без тача |
| GPS                   | [ATGM332D-5N71](https://pese.oss-cn-shenzhen.aliyuncs.com/pdfs/1911211831_ZHONGKEWEI-ATGM332D_C458416.pdf) [(китай)](https://item.taobao.com/item.htm?id=669388277778&skuId=4886966828708)                                                                                                                | GPS + GLONASS · UART NMEA0183 · 2.7–3.6 V · 12.2×16 mm      |
| Микроконтроллер       | [ESP32](https://m5stack.oss-cn-shenzhen.aliyuncs.com/resource/docs/datasheet/core/esp32_datasheet_cn.pdf) [ESP32-S3](https://m5stack-doc.oss-cn-shenzhen.aliyuncs.com/472/esp32-s3_datasheet_cn.pdf) [ESP32-C6](https://www.espressif.com.cn/sites/default/files/documentation/esp32-c6_datasheet_cn.pdf) | Wi-Fi · BLE · ESP32-S3 / ESP32-C6 / ESP32                   |
| Аккумулятор резервный | [LiPo 150 mAh](https://atta.szlcsc.com/upload/public/pdf/source/20220914/ED735F4F9B1062A69980EE16902043DC.pdf)                                                                                                                                                                                            | LiPo 150 mAh                                                |
| Аккумулятор основной  | [LiPo 10000 mAh (146074)](https://atta.szlcsc.com/upload/public/pdf/source/20240508/57699078A8D750A37A92A5375737A576.pdf) [LiPo 2000 mAh (18650)](https://atta.szlcsc.com/upload/public/pdf/source/20180125/C165987_15168650465801302945.pdf)                                                             | LiPo 10000 mAh (146074) / LiPo 18650 2000 mAh               |
| LoRa                  | [LLCC68](https://atta.szlcsc.com/upload/public/pdf/source/20221229/96B0032DA4E361705241C07294BF0368.pdf) [(китай)](https://item.taobao.com/item.htm?id=916210411051)                                                                                                                                      | LLCC68 · 410–525 MHz · SPI · 22 dBm                         |
| Управление            | [EC11](https://atta.szlcsc.com/upload/public/pdf/source/20190109/C361167_8025A1363C62EF4BA37C0EA12E1AE3EA.pdf) [B3F](https://datasheet.lcsc.com/datasheet/C93157.pdf)                                                                                                                                     | энкодер · 1–2 кнопки                                        |
| NFC                   | [MFRC52202HN1](https://datasheet.lcsc.com/datasheet/pdf/4003bd6175b1d67870d9c9f9ebe671c6.pdf) [(китай)](https://item.taobao.com/item.htm?id=631022878377&skuId=4659695028435)                                                                                                                             | 13.56 MHz · ISO14443A / MIFARE · SPI / I²C / UART           |


