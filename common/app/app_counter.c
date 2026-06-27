#include "app_counter.h"

#include "ui_counter.h"

static int s_counter;

void app_counter_init(void)
{
    s_counter = 0;
    ui_counter_init();
    ui_counter_set(s_counter);
}

void app_counter_on_jumper(bool increment, void *user_data)
{
    (void)user_data;
    s_counter += increment ? 1 : -1;
    ui_counter_set(s_counter);
}
