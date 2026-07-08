#include "ui.h"
#include "ui_logic.h"
#include <string.h>
#include <stdio.h>
/* ------------------------------------------------------------ */
/* Logic Variables                                            */
/* ------------------------------------------------------------ */

static int32_t var_counter = 0;

/* ------------------------------------------------------------ */
/* Timer Callback Forward Declarations                        */
/* ------------------------------------------------------------ */

static void logic_counter_tick_timer_cb(lv_timer_t *timer);

/* ------------------------------------------------------------ */
/* Logic Functions                                            */
/* ------------------------------------------------------------ */

/**
 * Logic: counter_tick
 * Minimal test: timer every 1s increments counter and updates label
 */
void logic_counter_tick(void) {
    // Timer: interval, 1000ms
    char counter_buf[16];
    
    var_counter++;
    snprintf(counter_buf, sizeof(counter_buf), "%d", (int)var_counter);
    lv_label_set_text(ui_lb_counter, counter_buf);
}

/** Timer callback for counter_tick */
static void logic_counter_tick_timer_cb(lv_timer_t *timer) {
    (void)timer;
    logic_counter_tick();
}

/**
 * Initialize logic system
 */
void ui_logic_init(void) {
    // counter_tick: timer interval, 1000ms (auto-start)
    lv_timer_create(logic_counter_tick_timer_cb, 1000, NULL);
}

/* USER_CODE_START: logic_custom */
/* USER_CODE_END: logic_custom */

