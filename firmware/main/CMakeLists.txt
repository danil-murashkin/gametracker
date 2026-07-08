set(COMMON_DIR "${CMAKE_CURRENT_LIST_DIR}/../../common")
include("${COMMON_DIR}/common_sources.cmake")

idf_component_register(
    SRCS "app_main.c"
         "hal/hal_display_st7789.c"
         "hal/hal_display_hw_test.c"
         "platform/ui_port_esp.c"
         "platform/hal_jumper_gpio.c"
         "platform/hal_jumper_poll_stub.c"
         "platform/hal_buttons_esp.c"
         ${COMMON_APP_SOURCES}
         ${COMMON_UI_SOURCES}
    INCLUDE_DIRS "." "hal" "platform"
                 ${COMMON_INCLUDE_DIRS}
    REQUIRES nvs_flash driver esp_lcd esp_lvgl_port
)
