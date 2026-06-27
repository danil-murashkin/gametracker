#include "rules_loader.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "cJSON.h"

static uint32_t parse_hex_color(const char *hex)
{
    if (hex == NULL || hex[0] != '#') {
        return 0x0066FF;
    }

    unsigned int value = 0;
    sscanf(hex + 1, "%6x", &value);
    return value;
}

static bool load_states(logic_engine_t *engine, const cJSON *states)
{
    const cJSON *item = NULL;
    cJSON_ArrayForEach(item, states)
    {
        const cJSON *label = cJSON_GetObjectItem(item, "label");
        const cJSON *color = cJSON_GetObjectItem(item, "color");
        if (!cJSON_IsString(label) || !cJSON_IsString(color)) {
            return false;
        }
        if (!logic_engine_add_state(engine, item->string, label->valuestring,
                                    parse_hex_color(color->valuestring))) {
            return false;
        }
    }
    return true;
}

static bool load_transitions(logic_engine_t *engine, const cJSON *transitions)
{
    const cJSON *item = NULL;
    cJSON_ArrayForEach(item, transitions)
    {
        const cJSON *from = cJSON_GetObjectItem(item, "from");
        const cJSON *event = cJSON_GetObjectItem(item, "event");
        const cJSON *to = cJSON_GetObjectItem(item, "to");
        if (!cJSON_IsString(from) || !cJSON_IsString(event) || !cJSON_IsString(to)) {
            return false;
        }
        if (!logic_engine_add_transition(engine, from->valuestring,
                                         logic_event_from_name(event->valuestring),
                                         to->valuestring)) {
            return false;
        }
    }
    return true;
}

bool rules_loader_apply_json(logic_engine_t *engine, const char *json)
{
    if (engine == NULL || json == NULL) {
        return false;
    }

    cJSON *root = cJSON_Parse(json);
    if (root == NULL) {
        return false;
    }

    bool ok = false;
    const cJSON *initial = cJSON_GetObjectItem(root, "initial");
    const cJSON *states = cJSON_GetObjectItem(root, "states");
    const cJSON *transitions = cJSON_GetObjectItem(root, "transitions");

    if (cJSON_IsString(initial) && cJSON_IsObject(states) && cJSON_IsArray(transitions) &&
        load_states(engine, states) && load_transitions(engine, transitions) &&
        logic_engine_set_initial(engine, initial->valuestring)) {
        ok = true;
    }

    cJSON_Delete(root);
    return ok;
}
