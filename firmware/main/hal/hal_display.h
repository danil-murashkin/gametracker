#pragma once

#include "esp_err.h"
#include "lvgl.h"

#define HAL_DISPLAY_HOR_RES 240
#define HAL_DISPLAY_VER_RES 320

esp_err_t hal_display_panel_init(void);
esp_err_t hal_display_lvgl_init(void);
esp_err_t hal_display_init(void);
lv_display_t *hal_display_get_lvgl_disp(void);

/** Full-screen R→G→B via esp_lcd. Call after hal_display_panel_init(), before LVGL. */
esp_err_t hal_display_hw_test_rgb(uint32_t hold_ms);
