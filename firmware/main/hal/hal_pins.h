#pragma once

/* Display ST7789 — LOLIN32 Lite */
#define HAL_PIN_DISP_BL   22
#define HAL_PIN_DISP_RST  16
#define HAL_PIN_DISP_DC   17
#define HAL_PIN_DISP_CS    5
#define HAL_PIN_DISP_SCK  18
#define HAL_PIN_DISP_MOSI 23

/*
 * Buttons (jumper wires): ref pin → GND, sense pin → logic 1 (pull-up).
 * Press connects sense to ref → sense reads 0.
 *
 *   + : GPIO 32 (GND) — GPIO 33 (sense, internal pull-up)
 *   - : GPIO 12 (GND) — GPIO 14 (sense, internal pull-up)
 */
#define HAL_PIN_JUMPER_INC_REF    32
#define HAL_PIN_JUMPER_INC_SENSE  33
#define HAL_PIN_JUMPER_DEC_REF    12
#define HAL_PIN_JUMPER_DEC_SENSE  14
