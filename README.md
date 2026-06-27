# lvgl_test

## Отладка дисплея

Тестовая плата — **WEMOS LOLIN32 Lite** (ESP32). На время отладки к плате подключён **только дисплей** [ST7789V-IPS](https://atta.szlcsc.com/upload/public/pdf/source/231023/C17266248-824cb1ca90bae285eda83c99054d40ed.pdf) 2.4" · 240×320 · SPI · без тача.

Подключение по **4-wire SPI** (аппаратный SPI ESP32):


| Дисплей         | LOLIN32 Lite |
| --------------- | ------------ |
| GND             | GND          |
| VCC             | 3.3 V        |
| LED (Backlight) | GPIO 22      |
| RESET           | GPIO 16      |
| DC (Data/Command) | GPIO 17      |
| CS (Chip Select)  | GPIO 5       |
| SCK             | GPIO 18      |
| SDI (MOSI)      | GPIO 23      |
| SDO (MISO)      | GPIO 19      |


## Софт

- **LoRa:** [libdriver/llcc68](https://github.com/libdriver/llcc68) — драйвер для MCU и Linux
- **UI:** [LVGL](https://github.com/lvgl/lvgl) — графическая библиотека для embedded

## Компоненты


| Наименование          | Модель                                                                                                                                                                                                                                                                                                    | Характеристики                                              |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Дисплей               | [ST7789V-IPS](https://atta.szlcsc.com/upload/public/pdf/source/231023/C17266248-824cb1ca90bae285eda83c99054d40ed.pdf) [(китай)](https://click.world.taobao.com/_b.cpupc)                                                                                                                                  | 2.4" · IPS · ST7789 · SPI · 240×320 · FPC 18 pin · без тача |
| GPS                   | [ATGM332D-5N71](https://pese.oss-cn-shenzhen.aliyuncs.com/pdfs/1911211831_ZHONGKEWEI-ATGM332D_C458416.pdf) [(китай)](https://item.taobao.com/item.htm?id=669388277778&skuId=4886966828708)                                                                                                                | GPS + GLONASS · UART NMEA0183 · 2.7–3.6 V · 12.2×16 mm      |
| Микроконтроллер       | [ESP32](https://m5stack.oss-cn-shenzhen.aliyuncs.com/resource/docs/datasheet/core/esp32_datasheet_cn.pdf) [ESP32-S3](https://m5stack-doc.oss-cn-shenzhen.aliyuncs.com/472/esp32-s3_datasheet_cn.pdf) [ESP32-C6](https://www.espressif.com.cn/sites/default/files/documentation/esp32-c6_datasheet_cn.pdf) | Wi-Fi · BLE · ESP32-S3 / ESP32-C6 / ESP32                   |
| Аккумулятор резервный | [LiPo 150 mAh](https://atta.szlcsc.com/upload/public/pdf/source/20220914/ED735F4F9B1062A69980EE16902043DC.pdf)                                                                                                                                                                                            | LiPo 150 mAh                                                |
| Аккумулятор основной  | [LiPo 10000 mAh (146074)](https://atta.szlcsc.com/upload/public/pdf/source/20240508/57699078A8D750A37A92A5375737A576.pdf) [LiPo 2000 mAh (18650)](https://atta.szlcsc.com/upload/public/pdf/source/20180125/C165987_15168650465801302945.pdf)                                                             | LiPo 10000 mAh (146074) / LiPo 18650 2000 mAh               |
| LoRa                  | [LLCC68](https://atta.szlcsc.com/upload/public/pdf/source/20221229/96B0032DA4E361705241C07294BF0368.pdf) [(китай)](https://item.taobao.com/item.htm?id=916210411051)                                                                                                                                      | LLCC68 · 410–525 MHz · SPI · 22 dBm                         |
| Управление            | [EC11](https://atta.szlcsc.com/upload/public/pdf/source/20190109/C361167_8025A1363C62EF4BA37C0EA12E1AE3EA.pdf) [B3F](https://datasheet.lcsc.com/datasheet/C93157.pdf)                                                                                                                                     | энкодер · 1–2 кнопки                                        |
| NFC                   | [MFRC52202HN1](https://datasheet.lcsc.com/datasheet/pdf/4003bd6175b1d67870d9c9f9ebe671c6.pdf) [(китай)](https://item.taobao.com/item.htm?id=631022878377&skuId=4659695028435)                                                                                                                             | 13.56 MHz · ISO14443A / MIFARE · SPI / I²C / UART           |


