#include "ui_port.h"

#include "lvgl.h"

#include <stdio.h>

void ui_port_lock(void)
{
}

void ui_port_unlock(void)
{
}

void ui_port_run_async(void (*fn)(void *user_data), void *user_data)
{
    lv_async_call(fn, user_data);
}

void ui_port_log_info(const char *tag, const char *message)
{
    printf("I (%s) %s\n", tag, message);
}
