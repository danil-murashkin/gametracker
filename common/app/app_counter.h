#pragma once

#include <stdbool.h>

void app_counter_init(void);
void app_counter_on_jumper(bool increment, void *user_data);
