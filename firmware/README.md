# GameTracker firmware (ESP32)

Прошивка для **WEMOS LOLIN32 Lite** + **ST7789V-IPS 2.4"** (240×320, SPI).  
Общий UI-код — в [`../common/`](../common/). Симуляция — вкладка **Simulator** в [`../editor/`](../editor/).

## Требования

| Компонент | Путь / версия |
|-----------|----------------|
| **ESP-IDF** | `C:\esp\esp-idf` (v5.2+, проверено на **5.3.2**) |
| **LVGL** | **9.4** (см. [`../common/lvgl-target.json`](../common/lvgl-target.json)) |
| **Python** | 3.8+ (ставится с ESP-IDF tools) |
| **Git** | для Component Manager |

Проверка окружения:

```powershell
cd firmware
. .\activate-idf.ps1
idf.py --version
```

Если ESP-IDF ещё не установлен — см. [`../scripts/setup-esp-idf.ps1`](../scripts/setup-esp-idf.ps1).

## Сборка

```powershell
cd firmware
.\build.ps1
```

Опции:

| Флаг | Действие |
|------|----------|
| `-Clean` | `idf.py fullclean` перед сборкой |
| `-Menuconfig` | открыть menuconfig (LVGL, RGB test, и т.д.) |

Или вручную:

```powershell
. .\activate-idf.ps1
idf.py set-target esp32   # только первый раз
idf.py build
```

## Прошивка и монитор

```powershell
.\flash.ps1 -Port COM8
.\flash.ps1 -Port COM8 -Monitor   # flash + serial monitor
.\monitor.ps1 -Port COM8
```

Порт смотрите в **Диспетчер устройств → Порты (COM и LPT)**.

## Отладка (Cursor / VS Code)

1. Установите расширение **[Espressif IDF](https://marketplace.visualstudio.com/items?itemName=espresif.esp-idf-extension)**.
2. Откройте корень репозитория в Cursor.
3. Настройки уже в [`.vscode/settings.json`](../.vscode/settings.json).
4. **Terminal → Run Task → ESP-IDF: Build** или `F5` → **ESP-IDF: Debug**.

Отладка через **OpenOCD + GDB** (JTAG) или **UART** (если поддерживается платой). Для LOLIN32 Lite обычно достаточно **flash + monitor** и `ESP_LOGI` в коде.

## Экспорт UI из редактора

1. В [`../editor/`](../editor/) — Design + Logic → вкладка **Code**.
2. Скачайте `ui.c`, `ui_events.c`, `ui_logic.c`, `ui.h`, … → [`../common/ui/`](../common/ui/) (или `ui_generated/`).
3. Обновите [`../common/common_sources.cmake`](../common/common_sources.cmake), если менялись имена файлов.
4. `.\build.ps1` → `.\flash.ps1`.

## Документация по дисплею

[docs/display_bringup.md](docs/display_bringup.md) — pinout, цвета, RGB-тест, troubleshooting.
