#pragma once

#include <stdbool.h>

/**
 * GPIO button states updated by hal_buttons_poll().
 * value_1 — button 1 (+), value_2 — button 2 (-).
 * Declared in platform implementation; readable from generated ui_logic.c.
 */
extern bool value_1;
extern bool value_2;

void hal_buttons_init(void);
void hal_buttons_poll(void);
