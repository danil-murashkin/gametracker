#include "hal_jumper.h"

#include <SDL.h>
#include <stdbool.h>
#include <stdlib.h>

static hal_jumper_cb_t s_cb;
static void *s_user_data;
static Uint32 s_last_fire;

#define DEBOUNCE_MS 50

static void fire(bool increment)
{
    Uint32 now = SDL_GetTicks();
    if ((now - s_last_fire) < DEBOUNCE_MS) {
        return;
    }
    s_last_fire = now;
    if (s_cb != NULL) {
        s_cb(increment, s_user_data);
    }
}

void hal_jumper_init(hal_jumper_cb_t cb, void *user_data)
{
    s_cb = cb;
    s_user_data = user_data;
    s_last_fire = 0;
}

static bool is_plus_key(SDL_Keycode sym)
{
    return sym == SDLK_UP || sym == SDLK_EQUALS || sym == SDLK_KP_PLUS;
}

static bool is_minus_key(SDL_Keycode sym)
{
    return sym == SDLK_DOWN || sym == SDLK_MINUS || sym == SDLK_KP_MINUS;
}

void hal_jumper_poll(void)
{
    SDL_Event event;

    while (SDL_PollEvent(&event)) {
        if (event.type == SDL_QUIT) {
            SDL_Quit();
            exit(0);
        }
        if (event.type == SDL_KEYDOWN && event.key.repeat == 0) {
            if (event.key.keysym.sym == SDLK_ESCAPE || event.key.keysym.sym == SDLK_q) {
                SDL_Quit();
                exit(0);
            }
            if (is_plus_key(event.key.keysym.sym)) {
                fire(true);
            } else if (is_minus_key(event.key.keysym.sym)) {
                fire(false);
            }
        }
    }
}
