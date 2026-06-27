#pragma once

#include <stdbool.h>

#include "logic_engine.h"

bool rules_loader_apply_json(logic_engine_t *engine, const char *json);
