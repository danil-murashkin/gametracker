#ifndef UI_LOGIC_H
#define UI_LOGIC_H

#include "lvgl.h"
#include <stdbool.h>
#include <stdint.h>

/* ------------------------------------------------------------ */
/* Logic Function Declarations                                */
/* ------------------------------------------------------------ */

// Blocks-only demo: hits++ every 1s (0..100), heal=100, health=heal-hits, update bar/labels, toggle images
void logic_health_update(void);

// Initialize all logic graphs
void ui_logic_init(void);

#endif /* UI_LOGIC_H */