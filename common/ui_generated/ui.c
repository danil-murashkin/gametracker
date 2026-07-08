#include "ui.h"
#include "ui_events.h"
#include "ui_logic.h"

/* ------------------------------------------------------------ */
/* Screen Definitions                                         */
/* ------------------------------------------------------------ */

lv_obj_t *ui_screen_main;

/* ------------------------------------------------------------ */
/* Component Definitions                                      */
/* ------------------------------------------------------------ */

lv_obj_t *ui_lb_counter;

/* ------------------------------------------------------------ */
/* Screen Init Functions                                      */
/* ------------------------------------------------------------ */

static void ui_screen_main_init(void) {
    // Create screen: main
    ui_screen_main = lv_obj_create(NULL);
    lv_obj_set_style_bg_color(ui_screen_main, lv_color_hex(0x1A1A1A), 0);

    // Create label: lb_counter
    ui_lb_counter = lv_label_create(ui_screen_main);
    lv_obj_set_pos(ui_lb_counter, 60, 140);
    lv_obj_set_size(ui_lb_counter, 120, 40);
    lv_obj_set_style_bg_opa(ui_lb_counter, LV_OPA_TRANSP, 0);
    lv_obj_set_style_border_color(ui_lb_counter, lv_color_hex(0x000000), 0);
    lv_obj_set_style_border_width(ui_lb_counter, 0, 0);
    lv_obj_set_style_radius(ui_lb_counter, 0, 0);
    lv_obj_set_style_text_color(ui_lb_counter, lv_color_hex(0x00FF00), 0);
    lv_obj_set_style_pad_all(ui_lb_counter, 0, 0);
    lv_label_set_text(ui_lb_counter, "0");

    /* USER_CODE_START: main_init */
/* USER_CODE_END: main_init */
}

/* ------------------------------------------------------------ */
/* Screen Load Functions                                      */
/* ------------------------------------------------------------ */

void ui_load_screen_main(void) {
    lv_scr_load_anim(ui_screen_main, LV_SCR_LOAD_ANIM_FADE_ON, 300, 0, false);
}

/* ------------------------------------------------------------ */
/* Main Init Function                                         */
/* ------------------------------------------------------------ */

void ui_init(void) {
    ui_screen_main_init();

    ui_load_screen_main();

    // Start logic timers and event handlers
    ui_logic_init();

    /* USER_CODE_START: ui_init */
/* USER_CODE_END: ui_init */
}

