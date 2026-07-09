#include "ui.h"
#include "ui_events.h"
#include "ui_logic.h"

/*
 * LVGL Built-in Symbols (FontAwesome subset) — using font: lv_font_montserrat_14
 * Usage: lv_label_set_text(label, LV_SYMBOL_OK " Accept");
 *        lv_obj_set_style_text_font(label, &lv_font_montserrat_14, 0);
 * Symbols: LV_SYMBOL_AUDIO, LV_SYMBOL_VIDEO, LV_SYMBOL_LIST, LV_SYMBOL_OK,
 * LV_SYMBOL_CLOSE, LV_SYMBOL_POWER, LV_SYMBOL_SETTINGS, LV_SYMBOL_HOME,
 * LV_SYMBOL_DOWNLOAD, LV_SYMBOL_DRIVE, LV_SYMBOL_REFRESH, LV_SYMBOL_PLAY,
 * LV_SYMBOL_PAUSE, LV_SYMBOL_STOP, LV_SYMBOL_PREV, LV_SYMBOL_NEXT,
 * LV_SYMBOL_LEFT, LV_SYMBOL_RIGHT, LV_SYMBOL_UP, LV_SYMBOL_DOWN,
 * LV_SYMBOL_PLUS, LV_SYMBOL_MINUS, LV_SYMBOL_WARNING, LV_SYMBOL_WIFI,
 * LV_SYMBOL_BLUETOOTH, LV_SYMBOL_TRASH, LV_SYMBOL_EDIT, LV_SYMBOL_SAVE,
 * LV_SYMBOL_FILE, LV_SYMBOL_BELL, LV_SYMBOL_KEYBOARD, LV_SYMBOL_GPS, etc.
 */
const lv_font_t *ui_symbol_font = &lv_font_montserrat_14;

/* ------------------------------------------------------------ */
/* Image Resource Declarations                                */
/* ------------------------------------------------------------ */
LV_IMAGE_DECLARE(img_vault_boy_alive);
LV_IMAGE_DECLARE(img_vault_boy_dead);

/* ------------------------------------------------------------ */
/* Screen Definitions                                         */
/* ------------------------------------------------------------ */

lv_obj_t *ui_screen_main;

/* ------------------------------------------------------------ */
/* Component Definitions                                      */
/* ------------------------------------------------------------ */

lv_obj_t *ui_img_alive;
lv_obj_t *ui_img_dead;
lv_obj_t *ui_pb_health;
lv_obj_t *ui_pb_health_frame;
lv_obj_t *ui_lb_hits;
lv_obj_t *ui_lb_heal;

/* ------------------------------------------------------------ */
/* Screen Init Functions                                      */
/* ------------------------------------------------------------ */

static void ui_screen_main_init(void) {
    // Create screen: main
    ui_screen_main = lv_obj_create(NULL);
    lv_obj_set_layout(ui_screen_main, LV_LAYOUT_NONE);
    lv_obj_remove_flag(ui_screen_main, LV_OBJ_FLAG_SCROLLABLE);
    lv_obj_set_style_bg_color(ui_screen_main, lv_color_hex(0x000000), 0);

    // Create img: img_alive
    ui_img_alive = lv_image_create(ui_screen_main);
    lv_obj_set_pos(ui_img_alive, 50, 24);
    lv_obj_set_size(ui_img_alive, 140, 200);
    lv_obj_set_style_bg_opa(ui_img_alive, LV_OPA_TRANSP, 0);
    lv_obj_set_style_border_color(ui_img_alive, lv_color_hex(0x000000), 0);
    lv_obj_set_style_border_width(ui_img_alive, 0, 0);
    lv_obj_set_style_radius(ui_img_alive, 0, 0);
    lv_obj_set_style_text_color(ui_img_alive, lv_color_hex(0x00FF00), 0);
    lv_obj_set_style_pad_all(ui_img_alive, 0, 0);
    lv_image_set_src(ui_img_alive, &img_vault_boy_alive);
    lv_image_set_inner_align(ui_img_alive, LV_IMAGE_ALIGN_STRETCH);

    // Create img: img_dead
    ui_img_dead = lv_image_create(ui_screen_main);
    lv_obj_set_pos(ui_img_dead, 50, 24);
    lv_obj_set_size(ui_img_dead, 140, 200);
    lv_obj_add_flag(ui_img_dead, LV_OBJ_FLAG_HIDDEN);
    lv_obj_set_style_bg_opa(ui_img_dead, LV_OPA_TRANSP, 0);
    lv_obj_set_style_border_color(ui_img_dead, lv_color_hex(0x000000), 0);
    lv_obj_set_style_border_width(ui_img_dead, 0, 0);
    lv_obj_set_style_radius(ui_img_dead, 0, 0);
    lv_obj_set_style_text_color(ui_img_dead, lv_color_hex(0x00FF00), 0);
    lv_obj_set_style_pad_all(ui_img_dead, 0, 0);
    lv_image_set_src(ui_img_dead, &img_vault_boy_dead);
    lv_image_set_inner_align(ui_img_dead, LV_IMAGE_ALIGN_STRETCH);
    lv_obj_add_flag(ui_img_dead, LV_OBJ_FLAG_HIDDEN);

    // Create bar: pb_health
    // Square outline frame for pb_health
    ui_pb_health_frame = lv_obj_create(ui_screen_main);
    lv_obj_remove_style_all(ui_pb_health_frame);
    lv_obj_set_style_bg_opa(ui_pb_health_frame, LV_OPA_TRANSP, 0);
    lv_obj_set_style_border_width(ui_pb_health_frame, 2, 0);
    lv_obj_set_style_border_opa(ui_pb_health_frame, LV_OPA_COVER, 0);
    lv_obj_set_style_radius(ui_pb_health_frame, 0, 0);
    lv_obj_set_style_pad_all(ui_pb_health_frame, 0, 0);
    lv_obj_set_style_border_color(ui_pb_health_frame, lv_color_hex(0x00FF00), 0);
    lv_obj_remove_flag(ui_pb_health_frame, LV_OBJ_FLAG_SCROLLABLE);
    lv_obj_clear_flag(ui_pb_health_frame, LV_OBJ_FLAG_CLICKABLE);
    lv_obj_set_layout(ui_pb_health_frame, LV_LAYOUT_NONE);
    lv_obj_add_flag(ui_pb_health_frame, LV_OBJ_FLAG_FLOATING);
    lv_obj_set_pos(ui_pb_health_frame, 56, 226);
    lv_obj_set_size(ui_pb_health_frame, 128, 18);
    lv_obj_move_background(ui_pb_health_frame);
    ui_pb_health = lv_bar_create(ui_screen_main);
    lv_obj_remove_flag(ui_pb_health, LV_OBJ_FLAG_SCROLLABLE);
    lv_obj_clear_flag(ui_pb_health, LV_OBJ_FLAG_CLICKABLE);
    lv_obj_set_layout(ui_pb_health, LV_LAYOUT_NONE);
    lv_obj_add_flag(ui_pb_health, LV_OBJ_FLAG_FLOATING);
    lv_obj_set_pos(ui_pb_health, 60, 230);
    lv_obj_set_size(ui_pb_health, 120, 10);
    lv_obj_set_style_bg_color(ui_pb_health, lv_color_hex(0x1A3D1A), 0);
    lv_obj_set_style_bg_opa(ui_pb_health, LV_OPA_COVER, 0);
    lv_obj_set_style_border_color(ui_pb_health, lv_color_hex(0x000000), 0);
    lv_obj_set_style_border_width(ui_pb_health, 0, 0);
    lv_obj_set_style_radius(ui_pb_health, 0, 0);
    lv_obj_set_style_text_color(ui_pb_health, lv_color_hex(0x00FF00), 0);
    lv_obj_set_style_pad_all(ui_pb_health, 0, 0);
    lv_obj_set_style_bg_color(ui_pb_health, lv_color_hex(0x00FF00), LV_PART_INDICATOR);
    lv_obj_set_style_bg_opa(ui_pb_health, LV_OPA_COVER, LV_PART_INDICATOR);
    lv_obj_set_style_radius(ui_pb_health, 0, LV_PART_INDICATOR);
    lv_obj_set_style_pad_all(ui_pb_health, 0, LV_PART_INDICATOR);
    lv_obj_set_style_pad_all(ui_pb_health, 0, 0);
    lv_bar_set_range(ui_pb_health, 0, 100);
    lv_bar_set_value(ui_pb_health, 100, LV_ANIM_OFF);

    // Create label: lb_hits
    ui_lb_hits = lv_label_create(ui_screen_main);
    lv_obj_set_pos(ui_lb_hits, 20, 264);
    lv_obj_set_size(ui_lb_hits, 100, 24);
    lv_obj_set_style_bg_opa(ui_lb_hits, LV_OPA_TRANSP, 0);
    lv_obj_set_style_border_color(ui_lb_hits, lv_color_hex(0x000000), 0);
    lv_obj_set_style_border_width(ui_lb_hits, 0, 0);
    lv_obj_set_style_radius(ui_lb_hits, 0, 0);
    lv_obj_set_style_text_color(ui_lb_hits, lv_color_hex(0x00FF00), 0);
    lv_obj_set_style_pad_all(ui_lb_hits, 0, 0);
    lv_label_set_text(ui_lb_hits, "0");
    lv_obj_set_style_text_align(ui_lb_hits, LV_TEXT_ALIGN_CENTER, 0);

    // Create label: lb_heal
    ui_lb_heal = lv_label_create(ui_screen_main);
    lv_obj_set_pos(ui_lb_heal, 120, 264);
    lv_obj_set_size(ui_lb_heal, 100, 24);
    lv_obj_set_style_bg_opa(ui_lb_heal, LV_OPA_TRANSP, 0);
    lv_obj_set_style_border_color(ui_lb_heal, lv_color_hex(0x000000), 0);
    lv_obj_set_style_border_width(ui_lb_heal, 0, 0);
    lv_obj_set_style_radius(ui_lb_heal, 0, 0);
    lv_obj_set_style_text_color(ui_lb_heal, lv_color_hex(0x00FF00), 0);
    lv_obj_set_style_pad_all(ui_lb_heal, 0, 0);
    lv_label_set_text(ui_lb_heal, "100");
    lv_obj_set_style_text_align(ui_lb_heal, LV_TEXT_ALIGN_CENTER, 0);

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