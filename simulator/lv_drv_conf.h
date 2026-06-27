#ifndef LV_DRV_CONF_H
#define LV_DRV_CONF_H

#include "lv_conf.h"

#define USE_SDL 1
#define USE_SDL_GPU 0

#if USE_SDL
#    define SDL_HOR_RES     240
#    define SDL_VER_RES     320
#    define SDL_ZOOM        2
#    define SDL_INCLUDE_PATH <SDL.h>
#    define SDL_FULLSCREEN  0
#endif

#endif
