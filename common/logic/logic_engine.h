#pragma once

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

#include "hal_event.h"

#define LOGIC_MAX_STATES       8
#define LOGIC_MAX_TRANSITIONS 16
#define LOGIC_NAME_MAX         24
#define LOGIC_LABEL_MAX        32

typedef struct {
    char id[LOGIC_NAME_MAX];
    char label[LOGIC_LABEL_MAX];
    uint32_t color_rgb;
} logic_state_t;

typedef struct {
    char from[LOGIC_NAME_MAX];
    char to[LOGIC_NAME_MAX];
    hal_event_type_t event;
} logic_transition_t;

typedef void (*logic_state_cb_t)(const logic_state_t *state, void *user_data);

typedef struct {
    logic_state_t states[LOGIC_MAX_STATES];
    size_t state_count;
    logic_transition_t transitions[LOGIC_MAX_TRANSITIONS];
    size_t transition_count;
    char initial[LOGIC_NAME_MAX];
    char current[LOGIC_NAME_MAX];
    logic_state_cb_t on_state_change;
    void *user_data;
} logic_engine_t;

bool logic_engine_init(logic_engine_t *engine);
bool logic_engine_add_state(logic_engine_t *engine, const char *id, const char *label, uint32_t color_rgb);
bool logic_engine_add_transition(logic_engine_t *engine, const char *from, hal_event_type_t event,
                                 const char *to);
bool logic_engine_set_initial(logic_engine_t *engine, const char *state_id);
bool logic_engine_start(logic_engine_t *engine);
void logic_engine_post_event(logic_engine_t *engine, hal_event_type_t event);
const logic_state_t *logic_engine_get_current(const logic_engine_t *engine);
hal_event_type_t logic_event_from_name(const char *name);
