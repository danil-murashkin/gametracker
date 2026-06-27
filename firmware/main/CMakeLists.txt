idf_component_register(
    SRCS "app_main.c"
         "hal/hal_display_st7789.c"
         "hal/hal_display_hw_test.c"
         "ui/ui_test_square.c"
    INCLUDE_DIRS "." "hal" "ui"
    REQUIRES nvs_flash driver esp_lcd esp_lvgl_port
)
