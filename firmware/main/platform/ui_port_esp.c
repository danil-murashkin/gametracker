#include "ui_port.h"

#include "esp_log.h"
#include "esp_lvgl_port.h"
#include "lvgl.h"

void ui_port_lock(void)
{
    lvgl_port_lock(0);
}

void ui_port_unlock(void)
{
    lvgl_port_unlock();
}

void ui_port_run_async(void (*fn)(void *user_data), void *user_data)
{
    lv_async_call(fn, user_data);
}

void ui_port_log_info(const char *tag, const char *message)
{
    ESP_LOGI(tag, "%s", message);
}
