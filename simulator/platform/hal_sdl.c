#include "hal_sdl.h"

#include "lv_drv_conf.h"
#include "lvgl.h"
#include "sdl/sdl.h"

#define SDL_DRAW_BUF_LINES 40

void hal_sdl_init(void)
{
    sdl_init();

    static lv_disp_draw_buf_t draw_buf;
    static lv_color_t buf[SDL_HOR_RES * SDL_DRAW_BUF_LINES];

    lv_disp_draw_buf_init(&draw_buf, buf, NULL, SDL_HOR_RES * SDL_DRAW_BUF_LINES);

    static lv_disp_drv_t disp_drv;
    lv_disp_drv_init(&disp_drv);
    disp_drv.draw_buf = &draw_buf;
    disp_drv.flush_cb = sdl_display_flush;
    disp_drv.hor_res = SDL_HOR_RES;
    disp_drv.ver_res = SDL_VER_RES;
    lv_disp_drv_register(&disp_drv);
}
