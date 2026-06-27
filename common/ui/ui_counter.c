#include "ui_counter.h"

#include "lvgl.h"
#include "ui_port.h"

#include <stdint.h>
#include <stdio.h>

static lv_obj_t *s_value;
static char s_buf[16];

static void apply_counter(void *user_data)
{
    const int value = (int)(intptr_t)user_data;
    snprintf(s_buf, sizeof(s_buf), "%d", value);
    if (s_value != NULL) {
        lv_label_set_text(s_value, s_buf);
    }
}

void ui_counter_init(void)
{
    ui_port_lock();

    lv_obj_t *screen = lv_scr_act();
    lv_obj_set_style_bg_color(screen, lv_color_hex(0x1a1a1a), 0);
    lv_obj_set_style_bg_opa(screen, LV_OPA_COVER, 0);

    lv_obj_t *square = lv_obj_create(screen);
    lv_obj_set_size(square, 120, 120);
    lv_obj_set_style_bg_color(square, lv_color_hex(0x0066FF), 0);
    lv_obj_set_style_bg_opa(square, LV_OPA_COVER, 0);
    lv_obj_set_style_border_width(square, 0, 0);
    lv_obj_set_style_radius(square, 8, 0);
    lv_obj_center(square);

    s_value = lv_label_create(square);
    lv_obj_set_style_text_font(s_value, &lv_font_montserrat_28, 0);
    lv_obj_set_style_text_color(s_value, lv_color_hex(0xFFFFFF), 0);
    lv_label_set_text(s_value, "0");
    lv_obj_center(s_value);

    ui_port_unlock();
}

void ui_counter_set(int value)
{
    ui_port_run_async(apply_counter, (void *)(intptr_t)value);
}
