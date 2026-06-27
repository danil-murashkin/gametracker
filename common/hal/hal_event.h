#pragma once

#include <stdint.h>

typedef enum {
    HAL_EVT_ENC_CW,
    HAL_EVT_ENC_CCW,
    HAL_EVT_ENC_PRESS,
} hal_event_type_t;

typedef struct {
    hal_event_type_t type;
} hal_event_t;

typedef void (*hal_event_cb_t)(const hal_event_t *event, void *user_data);

void hal_input_set_callback(hal_event_cb_t cb, void *user_data);
void hal_input_init(void);
void hal_input_poll(void);
