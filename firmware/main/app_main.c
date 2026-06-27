#include "hal_display.h"
#include "ui.h"

#include "esp_log.h"
#include "nvs_flash.h"

static const char *TAG = "app_main";

void app_main(void)
{
    esp_err_t err = nvs_flash_init();
    if (err == ESP_ERR_NVS_NO_FREE_PAGES || err == ESP_ERR_NVS_NEW_VERSION_FOUND) {
        ESP_ERROR_CHECK(nvs_flash_erase());
        ESP_ERROR_CHECK(nvs_flash_init());
    }

    ESP_LOGI(TAG, "starting display bring-up");
    //ESP_ERROR_CHECK(hal_display_panel_init()); ESP_ERROR_CHECK(hal_display_hw_test_rgb(800)); ESP_ERROR_CHECK(hal_display_lvgl_init());
    ESP_ERROR_CHECK(hal_display_init());
    ui_init();
    ESP_LOGI(TAG, "ready");
}
