#include "logic_engine.h"

#include <string.h>

static logic_state_t *find_state(logic_engine_t *engine, const char *id)
{
    for (size_t i = 0; i < engine->state_count; i++) {
        if (strcmp(engine->states[i].id, id) == 0) {
            return &engine->states[i];
        }
    }
    return NULL;
}

static void enter_state(logic_engine_t *engine, const char *id)
{
    logic_state_t *state = find_state(engine, id);
    if (state == NULL) {
        return;
    }

    strncpy(engine->current, state->id, sizeof(engine->current) - 1);
    engine->current[sizeof(engine->current) - 1] = '\0';

    if (engine->on_state_change != NULL) {
        engine->on_state_change(state, engine->user_data);
    }
}

static hal_event_type_t event_from_name(const char *name)
{
    if (strcmp(name, "enc_cw") == 0) {
        return HAL_EVT_ENC_CW;
    }
    if (strcmp(name, "enc_ccw") == 0) {
        return HAL_EVT_ENC_CCW;
    }
    if (strcmp(name, "enc_press") == 0) {
        return HAL_EVT_ENC_PRESS;
    }
    return HAL_EVT_ENC_CW;
}

bool logic_engine_init(logic_engine_t *engine)
{
    if (engine == NULL) {
        return false;
    }

    memset(engine, 0, sizeof(*engine));
    return true;
}

bool logic_engine_add_state(logic_engine_t *engine, const char *id, const char *label,
                            uint32_t color_rgb)
{
    if (engine == NULL || id == NULL || label == NULL ||
        engine->state_count >= LOGIC_MAX_STATES) {
        return false;
    }

    logic_state_t *state = &engine->states[engine->state_count++];
    strncpy(state->id, id, sizeof(state->id) - 1);
    strncpy(state->label, label, sizeof(state->label) - 1);
    state->color_rgb = color_rgb;
    return true;
}

bool logic_engine_add_transition(logic_engine_t *engine, const char *from, hal_event_type_t event,
                                 const char *to)
{
    if (engine == NULL || from == NULL || to == NULL ||
        engine->transition_count >= LOGIC_MAX_TRANSITIONS) {
        return false;
    }

    logic_transition_t *tr = &engine->transitions[engine->transition_count++];
    strncpy(tr->from, from, sizeof(tr->from) - 1);
    strncpy(tr->to, to, sizeof(tr->to) - 1);
    tr->event = event;
    return true;
}

bool logic_engine_set_initial(logic_engine_t *engine, const char *state_id)
{
    if (engine == NULL || state_id == NULL) {
        return false;
    }

    strncpy(engine->initial, state_id, sizeof(engine->initial) - 1);
    return true;
}

bool logic_engine_start(logic_engine_t *engine)
{
    if (engine == NULL || engine->initial[0] == '\0') {
        return false;
    }

    enter_state(engine, engine->initial);
    return true;
}

void logic_engine_post_event(logic_engine_t *engine, hal_event_type_t event)
{
    if (engine == NULL || engine->current[0] == '\0') {
        return;
    }

    for (size_t i = 0; i < engine->transition_count; i++) {
        const logic_transition_t *tr = &engine->transitions[i];
        if (tr->event != event) {
            continue;
        }
        if (strcmp(tr->from, "*") != 0 && strcmp(tr->from, engine->current) != 0) {
            continue;
        }

        enter_state(engine, tr->to);
        return;
    }
}

const logic_state_t *logic_engine_get_current(const logic_engine_t *engine)
{
    if (engine == NULL) {
        return NULL;
    }
    return find_state((logic_engine_t *)engine, engine->current);
}

hal_event_type_t logic_event_from_name(const char *name)
{
    return event_from_name(name);
}
