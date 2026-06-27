#include "hal_jumper.h"
#include "hal_pins.h"

#include "driver/gpio.h"
#include "esp_log.h"
#include "freertos/FreeRTOS.h"
#include "freertos/queue.h"
#include "freertos/task.h"

#define JUMPER_POLL_MS       5
#define JUMPER_DEBOUNCE_MS   50
#define JUMPER_QUEUE_LEN     8

static const char *TAG = "hal_jumper";

static hal_jumper_cb_t s_cb;
static void *s_user_data;
static QueueHandle_t s_queue;
static int s_last_inc = 1;
static int s_last_dec = 1;
static TickType_t s_last_fire_inc;
static TickType_t s_last_fire_dec;

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

static void enqueue(bool increment)
{
    TickType_t now = xTaskGetTickCount();
    TickType_t *last_fire = increment ? &s_last_fire_inc : &s_last_fire_dec;

    if ((now - *last_fire) < pdMS_TO_TICKS(JUMPER_DEBOUNCE_MS)) {
        return;
    }
    *last_fire = now;

    const uint8_t ev = increment ? 1 : 0;
    xQueueSend(s_queue, &ev, 0);
}

static void scan_once(void)
{
    const int inc = gpio_get_level(HAL_PIN_JUMPER_INC_SENSE);
    const int dec = gpio_get_level(HAL_PIN_JUMPER_DEC_SENSE);

    if (inc == 0 && s_last_inc != 0) {
        enqueue(true);
    }
    if (dec == 0 && s_last_dec != 0) {
        enqueue(false);
    }

    s_last_inc = inc;
    s_last_dec = dec;
}

static void jumper_scan_task(void *arg)
{
    (void)arg;
    const TickType_t period = pdMS_TO_TICKS(JUMPER_POLL_MS);

    while (true) {
        scan_once();
        vTaskDelay(period);
    }
}

static void jumper_dispatch_task(void *arg)
{
    (void)arg;
    uint8_t ev;

    while (true) {
        if (xQueueReceive(s_queue, &ev, portMAX_DELAY) == pdTRUE && s_cb != NULL) {
            s_cb(ev != 0, s_user_data);
        }
    }
}

void hal_jumper_init(hal_jumper_cb_t cb, void *user_data)
{
    s_cb = cb;
    s_user_data = user_data;
    s_last_fire_inc = 0;
    s_last_fire_dec = 0;
    s_last_inc = 1;
    s_last_dec = 1;

    gpio_reset_pin(HAL_PIN_JUMPER_INC_REF);
    gpio_reset_pin(HAL_PIN_JUMPER_INC_SENSE);
    gpio_reset_pin(HAL_PIN_JUMPER_DEC_REF);
    gpio_reset_pin(HAL_PIN_JUMPER_DEC_SENSE);
    gpio_setup_once();

    s_queue = xQueueCreate(JUMPER_QUEUE_LEN, sizeof(uint8_t));

    xTaskCreate(jumper_scan_task, "jumper_scan", 2048, NULL, 3, NULL);
    xTaskCreate(jumper_dispatch_task, "jumper_disp", 2048, NULL, 4, NULL);

    ESP_LOGI(TAG, "buttons + ref:%d sense:%d | - ref:%d sense:%d (press = sense LOW)",
             HAL_PIN_JUMPER_INC_REF, HAL_PIN_JUMPER_INC_SENSE, HAL_PIN_JUMPER_DEC_REF,
             HAL_PIN_JUMPER_DEC_SENSE);
}
