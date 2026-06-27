#pragma once

#include <stdbool.h>
#include <stdint.h>

#include "logic_engine.h"

bool app_runtime_init(const char *rules_json);
void app_runtime_on_hal_event(const hal_event_t *event);
logic_engine_t *app_runtime_get_engine(void);
