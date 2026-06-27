#pragma once

#include <stdint.h>

#define UI_DISPLAY_HOR_RES 240
#define UI_DISPLAY_VER_RES 320

void ui_port_lock(void);
void ui_port_unlock(void);
/** Run fn(user_data) on the LVGL thread (safe from other tasks). */
void ui_port_run_async(void (*fn)(void *user_data), void *user_data);
void ui_port_log_info(const char *tag, const char *message);
