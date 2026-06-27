#pragma once

#include <stdbool.h>

/** GPIO jumper (ESP32) or keyboard (simulator): increment / decrement. */
typedef void (*hal_jumper_cb_t)(bool increment, void *user_data);

void hal_jumper_init(hal_jumper_cb_t cb, void *user_data);

/** Simulator only: poll SDL events. No-op stub on ESP32 if linked. */
void hal_jumper_poll(void);
