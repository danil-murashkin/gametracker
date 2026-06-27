#include "app_runtime.h"

#include "hal_event.h"
#include "rules_loader.h"
#include "ui.h"
#include "ui_port.h"

static logic_engine_t s_engine;

static void on_logic_state(const logic_state_t *state, void *user_data)
{
    (void)user_data;
    if (state != NULL) {
        ui_set_state(state->label, state->color_rgb);
        ui_port_log_info("logic", state->id);
    }
}

bool app_runtime_init(const char *rules_json)
{
    if (!logic_engine_init(&s_engine)) {
        return false;
    }

    s_engine.on_state_change = on_logic_state;

    if (!rules_loader_apply_json(&s_engine, rules_json)) {
        return false;
    }

    ui_init();
    return logic_engine_start(&s_engine);
}

void app_runtime_on_hal_event(const hal_event_t *event)
{
    if (event != NULL) {
        logic_engine_post_event(&s_engine, event->type);
    }
}

logic_engine_t *app_runtime_get_engine(void)
{
    return &s_engine;
}
