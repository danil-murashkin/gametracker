#ifndef UI_LOGIC_H
#define UI_LOGIC_H

#include "lvgl.h"
#include <stdbool.h>
#include <stdint.h>

/* ------------------------------------------------------------ */
/* Logic Function Declarations                                */
/* ------------------------------------------------------------ */

// Minimal test: timer every 1s increments counter and updates label
void logic_counter_tick(void);

// Initialize all logic graphs
void ui_logic_init(void);

#endif /* UI_LOGIC_H */

