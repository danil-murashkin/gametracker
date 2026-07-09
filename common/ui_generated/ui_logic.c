#include "ui.h"
#include "ui_logic.h"
#include <string.h>
#include <stdio.h>
#include "hal_buttons.h"

/* ------------------------------------------------------------ */
/* Logic Variables                                            */
/* ------------------------------------------------------------ */

static int32_t var_hits = 0;
static int32_t var_heal = 100;

/* ------------------------------------------------------------ */
/* Timer Callback Forward Declarations                        */
/* ------------------------------------------------------------ */

static void logic_health_update_timer_cb(lv_timer_t *timer);

/* ------------------------------------------------------------ */
/* Logic Functions                                            */
/* ------------------------------------------------------------ */

/**
 * Logic: health_update
 * Blocks-only demo: hits++ every 1s (0..100), heal=100, health=heal-hits, update bar/labels, toggle images
 */
void logic_health_update(void) {
    // Timer: interval, 50ms
    var_hits = (var_hits + 1);
    if ((var_hits > 100)) {
        var_hits = 100;
        var_heal = 100;
        lv_bar_set_value(ui_pb_health, (var_heal - var_hits), LV_ANIM_ON);
        char txt_node_set_hits_text[16];
        snprintf(txt_node_set_hits_text, sizeof(txt_node_set_hits_text), "%d", (int)(var_hits));
        lv_label_set_text(ui_lb_hits, txt_node_set_hits_text);
        char txt_node_set_heal_text[16];
        snprintf(txt_node_set_heal_text, sizeof(txt_node_set_heal_text), "%d", (int)(var_heal));
        lv_label_set_text(ui_lb_heal, txt_node_set_heal_text);
        if (((var_heal - var_hits) > 0)) {
            lv_obj_clear_flag(ui_img_alive, LV_OBJ_FLAG_HIDDEN);
            lv_obj_add_flag(ui_img_dead, LV_OBJ_FLAG_HIDDEN);
        } else {
            lv_obj_add_flag(ui_img_alive, LV_OBJ_FLAG_HIDDEN);
            lv_obj_clear_flag(ui_img_dead, LV_OBJ_FLAG_HIDDEN);
        }
    } else {
        var_heal = 100;
        lv_bar_set_value(ui_pb_health, (var_heal - var_hits), LV_ANIM_ON);
        char txt_node_set_hits_text[16];
        snprintf(txt_node_set_hits_text, sizeof(txt_node_set_hits_text), "%d", (int)(var_hits));
        lv_label_set_text(ui_lb_hits, txt_node_set_hits_text);
        char txt_node_set_heal_text[16];
        snprintf(txt_node_set_heal_text, sizeof(txt_node_set_heal_text), "%d", (int)(var_heal));
        lv_label_set_text(ui_lb_heal, txt_node_set_heal_text);
        if (((var_heal - var_hits) > 0)) {
            lv_obj_clear_flag(ui_img_alive, LV_OBJ_FLAG_HIDDEN);
            lv_obj_add_flag(ui_img_dead, LV_OBJ_FLAG_HIDDEN);
        } else {
            lv_obj_add_flag(ui_img_alive, LV_OBJ_FLAG_HIDDEN);
            lv_obj_clear_flag(ui_img_dead, LV_OBJ_FLAG_HIDDEN);
        }
    }
}

/** Timer callback for health_update */
static void logic_health_update_timer_cb(lv_timer_t *timer) {
    (void)timer;
    logic_health_update();
}

/**
 * Initialize logic system
 */
void ui_logic_init(void) {
    // health_update: timer interval, 50ms (auto-start)
    lv_timer_create(logic_health_update_timer_cb, 50, NULL);
}

/* USER_CODE_START: logic_custom */
/* USER_CODE_END: logic_custom */