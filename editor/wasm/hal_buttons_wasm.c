#include "hal_buttons.h"

#include <stdbool.h>
#include <emscripten.h>

bool value_1 = false;
bool value_2 = false;

static bool btn1_down = false;
static bool btn2_down = false;

void hal_buttons_init(void)
{
    btn1_down = false;
    btn2_down = false;
    value_1 = false;
    value_2 = false;
}

EMSCRIPTEN_KEEPALIVE void app_button_event(int button, int pressed)
{
    const bool down = pressed != 0;
    if (button == 1) {
        btn1_down = down;
    } else if (button == 2) {
        btn2_down = down;
    }
}

void hal_buttons_poll(void)
{
    value_1 = btn1_down;
    value_2 = btn2_down;
}
