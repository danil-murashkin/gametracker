#include "hal_display.h"
#include "hal_display_internal.h"

#include "esp_check.h"
#include "esp_lcd_panel_ops.h"
#include "esp_log.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

#define HW_TEST_FILL_LINES 32

static const char *TAG = "hal_display_hw";

static esp_err_t hal_display_fill_color(uint16_t rgb565)
{
    esp_lcd_panel_handle_t panel = hal_display_panel();
    if (panel == NULL) {
        return ESP_ERR_INVALID_STATE;
    }

    static uint16_t buf[HAL_DISPLAY_HOR_RES * HW_TEST_FILL_LINES];
    for (int i = 0; i < HAL_DISPLAY_HOR_RES * HW_TEST_FILL_LINES; i++) {
        buf[i] = rgb565;
    }

    for (int y = 0; y < HAL_DISPLAY_VER_RES; y += HW_TEST_FILL_LINES) {
        int h = HW_TEST_FILL_LINES;
        if (y + h > HAL_DISPLAY_VER_RES) {
            h = HAL_DISPLAY_VER_RES - y;
        }
        ESP_RETURN_ON_ERROR(
            esp_lcd_panel_draw_bitmap(panel, 0, y, HAL_DISPLAY_HOR_RES, y + h, buf), TAG,
            "draw_bitmap failed");
    }
    return ESP_OK;
}

esp_err_t hal_display_hw_test_rgb(uint32_t hold_ms)
{
    static const struct {
        uint16_t color;
        const char *name;
    } steps[] = {
        {0xF800, "red"},
        {0x07E0, "green"},
        {0x001F, "blue"},
    };

    ESP_LOGI(TAG, "RGB hardware test start (%u ms per color)", (unsigned)hold_ms);

    for (size_t i = 0; i < sizeof(steps) / sizeof(steps[0]); i++) {
        ESP_LOGI(TAG, "fill %s", steps[i].name);
        ESP_RETURN_ON_ERROR(hal_display_fill_color(steps[i].color), TAG, "fill failed");
        vTaskDelay(pdMS_TO_TICKS(hold_ms));
    }

    ESP_LOGI(TAG, "RGB hardware test done");
    return ESP_OK;
}
