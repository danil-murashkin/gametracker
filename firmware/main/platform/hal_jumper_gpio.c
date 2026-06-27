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
static TickType_t s_last_fire;

static void gpio_setup_once(void)
{
    gpio_config_t bus = {
        .pin_bit_mask = 1ULL << HAL_PIN_JUMPER_GND,
        .mode = GPIO_MODE_OUTPUT,
        .pull_up_en = GPIO_PULLUP_DISABLE,
        .pull_down_en = GPIO_PULLDOWN_DISABLE,
        .intr_type = GPIO_INTR_DISABLE,
    };
    gpio_config(&bus);
    gpio_set_level(HAL_PIN_JUMPER_GND, 0);

    gpio_config_t inputs = {
        .pin_bit_mask = (1ULL << HAL_PIN_JUMPER_INC) | (1ULL << HAL_PIN_JUMPER_DEC),
        .mode = GPIO_MODE_INPUT,
        .pull_up_en = GPIO_PULLUP_DISABLE,
        .pull_down_en = GPIO_PULLDOWN_DISABLE,
        .intr_type = GPIO_INTR_DISABLE,
    };
    gpio_config(&inputs);
}

static void enqueue(bool increment)
{
    TickType_t now = xTaskGetTickCount();
    if ((now - s_last_fire) < pdMS_TO_TICKS(JUMPER_DEBOUNCE_MS)) {
        return;
    }
    s_last_fire = now;

    const uint8_t ev = increment ? 1 : 0;
    xQueueSend(s_queue, &ev, 0);
}

static void scan_once(void)
{
    const int inc = gpio_get_level(HAL_PIN_JUMPER_INC);
    const int dec = gpio_get_level(HAL_PIN_JUMPER_DEC);

    if (inc == 0 && dec == 0 && (s_last_inc != 0 || s_last_dec != 0)) {
        enqueue(true);
    } else if (inc == 0 && s_last_inc != 0) {
        enqueue(true);
    } else if (dec == 0 && s_last_dec != 0) {
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
    s_last_fire = 0;
    s_last_inc = 1;
    s_last_dec = 1;

    gpio_reset_pin(HAL_PIN_JUMPER_GND);
    gpio_reset_pin(HAL_PIN_JUMPER_INC);
    gpio_reset_pin(HAL_PIN_JUMPER_DEC);
    gpio_setup_once();

    s_queue = xQueueCreate(JUMPER_QUEUE_LEN, sizeof(uint8_t));

    xTaskCreate(jumper_scan_task, "jumper_scan", 2048, NULL, 3, NULL);
    xTaskCreate(jumper_dispatch_task, "jumper_disp", 2048, NULL, 4, NULL);

    ESP_LOGI(TAG, "gpio +:%d/%d -:%d/%d", HAL_PIN_JUMPER_INC, HAL_PIN_JUMPER_DEC, HAL_PIN_JUMPER_DEC,
             HAL_PIN_JUMPER_GND);
}
