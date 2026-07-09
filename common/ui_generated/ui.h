#ifndef UI_H
#define UI_H

#include "lvgl.h"

/* ------------------------------------------------------------ */
/* Screen Declarations                                        */
/* ------------------------------------------------------------ */

extern lv_obj_t *ui_screen_main;

/* ------------------------------------------------------------ */
/* Component Declarations                                     */
/* ------------------------------------------------------------ */

extern lv_obj_t *ui_img_alive;
extern lv_obj_t *ui_img_dead;
extern lv_obj_t *ui_pb_health;
extern lv_obj_t *ui_lb_hits;
extern lv_obj_t *ui_lb_heal;

/* ------------------------------------------------------------ */
/* Symbol Font                                                */
/* ------------------------------------------------------------ */

extern const lv_font_t *ui_symbol_font;

/* ------------------------------------------------------------ */
/* Function Declarations                                      */
/* ------------------------------------------------------------ */

void ui_init(void);

void ui_load_screen_main(void);

#endif /* UI_H */