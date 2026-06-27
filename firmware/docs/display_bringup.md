# Display bring-up — ST7789 + LVGL

Минимальная прошивка для WEMOS LOLIN32 Lite + ST7789V-IPS 2.4" (240×320, SPI, без тача).

## Документация

- **Espressif:** [LCD_ST7789.pdf](https://dl.espressif.com/dl/schematics/LCD_ST7789.pdf) — референс для `esp_lcd`, инициализации и типового подключения
- **Модуль:** [ST7789V-IPS datasheet (LCSC)](https://atta.szlcsc.com/upload/public/pdf/source/231023/C17266248-824cb1ca90bae285eda83c99054d40ed.pdf)
- **Сводка:** [docs/st7789.md](../../docs/st7789.md)

## Ожидаемое поведение

После прошивки на экране:

- тёмный фон;
- синий квадрат по центру, **белые цифры** — счётчик;
- подсветка включена (GPIO 22).

### Счётчик (замыкание GPIO)

Пара **ref → GND**, **sense → лог. 1** (pull-up). Замыкание ref↔sense = «нажатие» (sense → 0).

| Действие | ref (GND) | sense |
|----------|-----------|-------|
| **+1** | GPIO **32** | GPIO **33** |
| **−1** | GPIO **12** | GPIO **14** |

Джампер: один конец на ref, другой на sense.

В UART monitor (115200):

```
I (xxx) hal_display: display init ok, 240x320
I (xxx) ui: ui init ok, 240x320
I (xxx) app_main: ready
```

## Pinout (единственное место в коде)

Файл: `main/hal/hal_display_st7789.c`

| Сигнал   | GPIO |
|----------|------|
| Backlight | 22  |
| RESET    | 16  |
| DC       | 17  |
| CS       | 5   |
| SCK      | 18  |
| MOSI     | 23  |
| MISO     | — (не используется, `-1`) |

## ST7789 — ручная подстройка

Стартовые значения в `hal_display_st7789.c`:

```c
.rgb_ele_order = LCD_RGB_ELEMENT_ORDER_RGB,
esp_lcd_panel_invert_color(panel_handle, true);
esp_lcd_panel_set_gap(panel_handle, 0, 0);
```

В `sdkconfig.defaults`: `CONFIG_LV_COLOR_16_SWAP=y`.

### Смещение / обрезка изображения

| Симптом | Действие |
|---------|----------|
| Картинка смещена вниз, мусор сверху (~20 px) | Модуль может быть 240×280 на 320 px GRAM — попробовать `esp_lcd_panel_set_gap(panel, 0, 20)` |
| Обрезка по краям | Проверить `mirror_x` / `mirror_y` / `swap_xy` через `esp_lcd_panel_mirror()` |
| Зеркальное отображение | `esp_lcd_panel_mirror(panel, true, false)` или `(false, true)` |

Для полноценного 240×320 модуля обычно достаточно `set_gap(0, 0)`.

### Неверные цвета

**Проверенная комбинация для этого модуля (LOLIN32 Lite + ST7789V-IPS 2.4"):**

| Параметр | Значение |
|----------|----------|
| `rgb_ele_order` | `LCD_RGB_ELEMENT_ORDER_RGB` |
| `CONFIG_LV_COLOR_16_SWAP` | `y` (в `sdkconfig` / `sdkconfig.defaults`) |
| `esp_lcd_panel_invert_color()` | `true` |

Симптомы при других настройках: зелёный квадрат / фиолетовый фон (без swap), оранжевый квадрат (BGR + swap).

Если цвета снова «поплыли»:

1. `esp_lcd_panel_invert_color()` — переключить `true` / `false`
2. `CONFIG_LV_COLOR_16_SWAP` — вкл./выкл.
3. `rgb_ele_order` — `RGB` vs `BGR`

### Чёрный экран

1. **Backlight** — GPIO 22 должен быть HIGH (3.3 V на LED)
2. **Питание** — VCC дисплея 3.3 V, общий GND с ESP32
3. **SPI wiring** — MOSI/SCK/CS/DC, не перепутаны
4. **RESET** — GPIO 16, pulse при init через `esp_lcd_panel_reset()`
5. **CS** — должен быть подтянут, не «висеть» при старте

### Артефакты / мерцание / полосы

1. Снизить SPI clock: `#define DISP_SPI_CLOCK_HZ (10 * 1000 * 1000)` (сейчас 20 MHz)
2. Убедиться, что `buff_dma = true` и buffer в DMA-capable RAM
3. Partial buffer: `240 * 32` px (~15 KB) — не увеличивать без PSRAM
4. Проверить качество проводов и длину SPI линий

### Reboot loop

1. Слишком большой draw buffer без PSRAM — уменьшить `DISP_DRAW_BUF_LINES`
2. Stack overflow LVGL task — увеличить в menuconfig (Component config → LVGL)
3. Ошибка SPI init — смотреть backtrace в monitor

## Внутренний hardware test (RGB)

Функция `hal_display_hw_test_rgb(hold_ms)` в `main/hal/hal_display_hw_test.c` — заливка экрана красный → зелёный → синий через `esp_lcd`, без LVGL.

Вызывать **после** `hal_display_panel_init()` и **до** `hal_display_lvgl_init()`.

Автозапуск при старте (menuconfig → **App** → *Run RGB display hardware test at boot*), либо вручную в `app_main.c`:

```c
ESP_ERROR_CHECK(hal_display_panel_init());
ESP_ERROR_CHECK(hal_display_hw_test_rgb(800));
ESP_ERROR_CHECK(hal_display_lvgl_init());
```

После теста стартует обычный UI (квадрат).

## Параметры буфера (без PSRAM)

| Параметр | Значение |
|----------|----------|
| Разрешение | 240×320 |
| Color depth | RGB565 (16 bit) |
| Partial buffer | 240 × 32 px (~15 KB) |
| Double buffer | false |
| PSRAM | не используется |

## Сборка

```bash
cd firmware
idf.py set-target esp32
idf.py build
idf.py -p COMx flash monitor
```

Windows: замените `COMx` на порт платы (Device Manager → Ports).
