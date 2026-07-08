#include "hal_buttons.h"

#include <SDL.h>
#include <stdbool.h>

bool value_1 = false;
bool value_2 = false;

static const Uint8 *s_keys = NULL;

void hal_buttons_init(void)
{
    s_keys = SDL_GetKeyboardState(NULL);
}

void hal_buttons_poll(void)
{
    if (s_keys == NULL) {
        s_keys = SDL_GetKeyboardState(NULL);
    }

    /* Up/+ = button 1, Down/- = button 2 (matches hal_jumper_sdl keys) */
    value_1 = s_keys[SDL_SCANCODE_UP] || s_keys[SDL_SCANCODE_EQUALS] || s_keys[SDL_SCANCODE_KP_PLUS];
    value_2 = s_keys[SDL_SCANCODE_DOWN] || s_keys[SDL_SCANCODE_MINUS] || s_keys[SDL_SCANCODE_KP_MINUS];
}
