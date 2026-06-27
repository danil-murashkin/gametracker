#include "ui.h"

#include "esp_log.h"
#include "esp_lvgl_port.h"
#include "hal_display.h"
#include "lvgl.h"

static const char *TAG = "ui";

void ui_init(void)
{
    lvgl_port_lock(0);

    lv_obj_t *screen = lv_scr_act();
    lv_obj_set_style_bg_color(screen, lv_color_hex(0x1a1a1a), 0);
    lv_obj_set_style_bg_opa(screen, LV_OPA_COVER, 0);

    lv_obj_t *square = lv_obj_create(screen);
    lv_obj_set_size(square, 80, 80);
    lv_obj_set_style_bg_color(square, lv_color_hex(0x0066FF), 0);
    lv_obj_set_style_bg_opa(square, LV_OPA_COVER, 0);
    lv_obj_set_style_border_width(square, 0, 0);
    lv_obj_set_style_radius(square, 0, 0);
    lv_obj_center(square);

    lvgl_port_unlock();

    ESP_LOGI(TAG, "ui init ok, %dx%d", HAL_DISPLAY_HOR_RES, HAL_DISPLAY_VER_RES);
}
