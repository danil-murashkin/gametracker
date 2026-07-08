#include "app_counter.h"
#include "app_generated.h"
#include "hal_jumper.h"
#include "hal_buttons.h"
#include "hal_sdl.h"

#include "lvgl.h"

#include <SDL.h>
#include <stdio.h>

int main(int argc, char **argv)
{
    (void)argc;
    (void)argv;

    lv_init();
    hal_sdl_init();

    #ifdef SIM_USE_GENERATED_UI
    app_generated_init();
    #else
    app_counter_init();
    #endif
    hal_buttons_init();
    hal_jumper_init(app_counter_on_jumper, NULL);

    printf("simulator ready: Up/+ = value_1, Down/- = value_2, Esc/Q quit\n");

    uint32_t last_tick = SDL_GetTicks();

    while (1) {
        const uint32_t now = SDL_GetTicks();
        lv_tick_inc(now - last_tick);
        last_tick = now;

        hal_jumper_poll();
        hal_buttons_poll();
        lv_timer_handler();
        SDL_Delay(5);
    }

    return 0;
}
