#include "hal_buttons.h"
#include "hal_pins.h"

#include "driver/gpio.h"
#include "esp_log.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

static const char *TAG = "hal_buttons";

bool value_1 = false;
bool value_2 = false;

static void gpio_setup_once(void)
{
    gpio_config_t ref_pins = {
        .pin_bit_mask = (1ULL << HAL_PIN_JUMPER_INC_REF) | (1ULL << HAL_PIN_JUMPER_DEC_REF),
        .mode = GPIO_MODE_INPUT,
        .pull_up_en = GPIO_PULLUP_DISABLE,
        .pull_down_en = GPIO_PULLDOWN_ENABLE,
        .intr_type = GPIO_INTR_DISABLE,
    };
    gpio_config(&ref_pins);

    gpio_config_t sense_pins = {
        .pin_bit_mask = (1ULL << HAL_PIN_JUMPER_INC_SENSE) | (1ULL << HAL_PIN_JUMPER_DEC_SENSE),
        .mode = GPIO_MODE_INPUT,
        .pull_up_en = GPIO_PULLUP_ENABLE,
        .pull_down_en = GPIO_PULLDOWN_DISABLE,
        .intr_type = GPIO_INTR_DISABLE,
    };
    gpio_config(&sense_pins);
}

static void buttons_poll_task(void *arg)
{
    (void)arg;
    const TickType_t period = pdMS_TO_TICKS(10);

    while (true) {
        hal_buttons_poll();
        vTaskDelay(period);
    }
}

void hal_buttons_init(void)
{
    gpio_reset_pin(HAL_PIN_JUMPER_INC_REF);
    gpio_reset_pin(HAL_PIN_JUMPER_INC_SENSE);
    gpio_reset_pin(HAL_PIN_JUMPER_DEC_REF);
    gpio_reset_pin(HAL_PIN_JUMPER_DEC_SENSE);
    gpio_setup_once();

    value_1 = false;
    value_2 = false;

    xTaskCreate(buttons_poll_task, "btn_poll", 2048, NULL, 3, NULL);

    ESP_LOGI(TAG, "value_1: GPIO %d, value_2: GPIO %d (LOW = pressed)",
             HAL_PIN_JUMPER_INC_SENSE, HAL_PIN_JUMPER_DEC_SENSE);
}

void hal_buttons_poll(void)
{
    value_1 = gpio_get_level(HAL_PIN_JUMPER_INC_SENSE) == 0;
    value_2 = gpio_get_level(HAL_PIN_JUMPER_DEC_SENSE) == 0;
}
