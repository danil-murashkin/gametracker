#include "ui.h"

#include "lvgl.h"
#include "ui_port.h"

static lv_obj_t *s_square;
static lv_obj_t *s_label;
static lv_obj_t *s_hint;

void ui_init(void)
{
    ui_port_lock();

    lv_obj_t *screen = lv_scr_act();
    lv_obj_set_style_bg_color(screen, lv_color_hex(0x1a1a1a), 0);
    lv_obj_set_style_bg_opa(screen, LV_OPA_COVER, 0);

    s_label = lv_label_create(screen);
    lv_obj_set_style_text_color(s_label, lv_color_hex(0xFFFFFF), 0);
    lv_label_set_text(s_label, "Demo");
    lv_obj_align(s_label, LV_ALIGN_TOP_MID, 0, 12);

    s_square = lv_obj_create(screen);
    lv_obj_set_size(s_square, 80, 80);
    lv_obj_set_style_bg_color(s_square, lv_color_hex(0x0066FF), 0);
    lv_obj_set_style_bg_opa(s_square, LV_OPA_COVER, 0);
    lv_obj_set_style_border_width(s_square, 0, 0);
    lv_obj_set_style_radius(s_square, 0, 0);
    lv_obj_center(s_square);

    s_hint = lv_label_create(screen);
    lv_obj_set_width(s_hint, UI_DISPLAY_HOR_RES - 16);
    lv_obj_set_style_text_align(s_hint, LV_TEXT_ALIGN_CENTER, 0);
    lv_obj_set_style_text_color(s_hint, lv_color_hex(0xAAAAAA), 0);
    lv_label_set_long_mode(s_hint, LV_LABEL_LONG_WRAP);
    lv_label_set_text(s_hint, "Encoder: CW / CCW / Press");
    lv_obj_align(s_hint, LV_ALIGN_BOTTOM_MID, 0, -8);

    ui_port_unlock();

    ui_port_log_info("ui", "demo ui ready");
}

void ui_set_state(const char *label, uint32_t color_rgb)
{
    ui_port_lock();

    if (s_label != NULL && label != NULL) {
        lv_label_set_text(s_label, label);
    }
    if (s_square != NULL) {
        lv_obj_set_style_bg_color(s_square, lv_color_hex(color_rgb), 0);
    }

    ui_port_unlock();
}
