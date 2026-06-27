#include "hal_display.h"
#include "hal_display_internal.h"
#include "hal_pins.h"

#include "driver/gpio.h"
#include "driver/spi_master.h"
#include "esp_check.h"
#include "esp_lcd_panel_io.h"
#include "esp_lcd_panel_ops.h"
#include "esp_lcd_panel_vendor.h"
#include "esp_log.h"
#include "esp_lvgl_port.h"
#include "sdkconfig.h"

#define DISP_SPI_HOST       SPI2_HOST
#define DISP_SPI_CLOCK_HZ   (40 * 1000 * 1000)
#define DISP_DRAW_BUF_LINES 64

static const char *TAG = "hal_display";

static lv_disp_t *s_disp;
static esp_lcd_panel_io_handle_t s_io;
static esp_lcd_panel_handle_t s_panel;

static esp_err_t hal_display_backlight_init(void)
{
    gpio_config_t cfg = {
        .pin_bit_mask = 1ULL << HAL_PIN_DISP_BL,
        .mode = GPIO_MODE_OUTPUT,
        .pull_up_en = GPIO_PULLUP_DISABLE,
        .pull_down_en = GPIO_PULLDOWN_DISABLE,
        .intr_type = GPIO_INTR_DISABLE,
    };
    ESP_RETURN_ON_ERROR(gpio_config(&cfg), TAG, "backlight gpio config failed");
    ESP_RETURN_ON_ERROR(gpio_set_level(HAL_PIN_DISP_BL, 1), TAG, "backlight on failed");
    return ESP_OK;
}

esp_lcd_panel_handle_t hal_display_panel(void)
{
    return s_panel;
}

esp_err_t hal_display_panel_init(void)
{
    if (s_panel != NULL) {
        return ESP_OK;
    }

    const size_t max_transfer_sz = HAL_DISPLAY_HOR_RES * DISP_DRAW_BUF_LINES * sizeof(uint16_t);

    spi_bus_config_t bus_cfg = {
        .mosi_io_num = HAL_PIN_DISP_MOSI,
        .miso_io_num = -1,
        .sclk_io_num = HAL_PIN_DISP_SCK,
        .quadwp_io_num = -1,
        .quadhd_io_num = -1,
        .max_transfer_sz = max_transfer_sz,
    };
    ESP_RETURN_ON_ERROR(spi_bus_initialize(DISP_SPI_HOST, &bus_cfg, SPI_DMA_CH_AUTO), TAG,
                        "spi bus init failed");

    esp_lcd_panel_io_spi_config_t io_cfg = {
        .cs_gpio_num = HAL_PIN_DISP_CS,
        .dc_gpio_num = HAL_PIN_DISP_DC,
        .spi_mode = 0,
        .pclk_hz = DISP_SPI_CLOCK_HZ,
        .trans_queue_depth = 20,
        .lcd_cmd_bits = 8,
        .lcd_param_bits = 8,
    };
    ESP_RETURN_ON_ERROR(
        esp_lcd_new_panel_io_spi((esp_lcd_spi_bus_handle_t)DISP_SPI_HOST, &io_cfg, &s_io), TAG,
        "panel io init failed");

    esp_lcd_panel_dev_config_t panel_cfg = {
        .reset_gpio_num = HAL_PIN_DISP_RST,
        .rgb_ele_order = LCD_RGB_ELEMENT_ORDER_RGB,
        .bits_per_pixel = 16,
    };
    ESP_RETURN_ON_ERROR(esp_lcd_new_panel_st7789(s_io, &panel_cfg, &s_panel), TAG,
                        "panel init failed");

    ESP_RETURN_ON_ERROR(esp_lcd_panel_reset(s_panel), TAG, "panel reset failed");
    ESP_RETURN_ON_ERROR(esp_lcd_panel_init(s_panel), TAG, "panel init cmd failed");
    ESP_RETURN_ON_ERROR(esp_lcd_panel_invert_color(s_panel, true), TAG, "panel invert failed");
    ESP_RETURN_ON_ERROR(esp_lcd_panel_set_gap(s_panel, 0, 0), TAG, "panel gap failed");
    ESP_RETURN_ON_ERROR(esp_lcd_panel_disp_on_off(s_panel, true), TAG, "panel on failed");
    ESP_RETURN_ON_ERROR(hal_display_backlight_init(), TAG, "backlight init failed");

#if CONFIG_APP_DISPLAY_HW_TEST_AT_BOOT
    ESP_RETURN_ON_ERROR(hal_display_hw_test_rgb(CONFIG_APP_DISPLAY_HW_TEST_HOLD_MS), TAG,
                        "hw test failed");
#endif

    ESP_LOGI(TAG, "panel ok %dx%d spi=%dMHz buf=%d lines", HAL_DISPLAY_HOR_RES,
             HAL_DISPLAY_VER_RES, DISP_SPI_CLOCK_HZ / 1000000, DISP_DRAW_BUF_LINES);
    return ESP_OK;
}

esp_err_t hal_display_lvgl_init(void)
{
    if (s_disp != NULL) {
        return ESP_OK;
    }
    if (s_panel == NULL) {
        return ESP_ERR_INVALID_STATE;
    }

    lvgl_port_cfg_t lvgl_cfg = ESP_LVGL_PORT_INIT_CONFIG();
    lvgl_cfg.task_priority = 6;
    lvgl_cfg.timer_period_ms = 5;
    lvgl_cfg.task_max_sleep_ms = 50;
    ESP_RETURN_ON_ERROR(lvgl_port_init(&lvgl_cfg), TAG, "lvgl port init failed");

    const lvgl_port_display_cfg_t disp_cfg = {
        .io_handle = s_io,
        .panel_handle = s_panel,
        .buffer_size = HAL_DISPLAY_HOR_RES * DISP_DRAW_BUF_LINES,
        .double_buffer = true,
        .hres = HAL_DISPLAY_HOR_RES,
        .vres = HAL_DISPLAY_VER_RES,
        .monochrome = false,
        .rotation = {
            .swap_xy = false,
            .mirror_x = false,
            .mirror_y = false,
        },
        .flags = {
            .buff_dma = true,
            .buff_spiram = false,
            .full_refresh = false,
            .direct_mode = false,
        },
    };

    s_disp = lvgl_port_add_disp(&disp_cfg);
    if (s_disp == NULL) {
        ESP_LOGE(TAG, "lvgl display registration failed");
        return ESP_FAIL;
    }

    ESP_LOGI(TAG, "lvgl ok (double buf)");
    return ESP_OK;
}

esp_err_t hal_display_init(void)
{
    ESP_RETURN_ON_ERROR(hal_display_panel_init(), TAG, "panel init failed");
    ESP_RETURN_ON_ERROR(hal_display_lvgl_init(), TAG, "lvgl init failed");
    return ESP_OK;
}

lv_disp_t *hal_display_get_lvgl_disp(void)
{
    return s_disp;
}
