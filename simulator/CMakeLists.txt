cmake_minimum_required(VERSION 3.16)
project(lvgl_simulator C)

set(CMAKE_C_STANDARD 11)

set(COMMON_DIR "${CMAKE_CURRENT_SOURCE_DIR}/../common")
set(LVGL_CONF_DIR "${CMAKE_CURRENT_SOURCE_DIR}")
include("${COMMON_DIR}/common_sources.cmake")

include(FetchContent)

option(SIM_USE_GENERATED_UI "Use common/ui_generated (exported from editor)" OFF)

set(SDL_SHARED OFF CACHE BOOL "" FORCE)
set(SDL_STATIC ON CACHE BOOL "" FORCE)
set(SDL_TEST OFF CACHE BOOL "" FORCE)
set(SDL_INSTALL OFF CACHE BOOL "" FORCE)

FetchContent_Declare(
    SDL2
    GIT_REPOSITORY https://github.com/libsdl-org/SDL.git
    GIT_TAG release-2.30.10
    GIT_SHALLOW TRUE
)

FetchContent_Declare(
    lvgl
    GIT_REPOSITORY https://github.com/lvgl/lvgl.git
    GIT_TAG v8.3.11
    GIT_SHALLOW TRUE
)

FetchContent_Declare(
    lv_drivers
    GIT_REPOSITORY https://github.com/lvgl/lv_drivers.git
    GIT_TAG release/v8.3
    GIT_SHALLOW TRUE
)

FetchContent_MakeAvailable(SDL2)

FetchContent_GetProperties(lvgl)
if(NOT lvgl_POPULATED)
    FetchContent_Populate(lvgl)
endif()

FetchContent_GetProperties(lv_drivers)
if(NOT lv_drivers_POPULATED)
    FetchContent_Populate(lv_drivers)
endif()

add_library(lvgl_lib STATIC)
file(GLOB_RECURSE LVGL_SOURCES "${lvgl_SOURCE_DIR}/src/*.c")
target_sources(lvgl_lib PRIVATE ${LVGL_SOURCES})
target_include_directories(lvgl_lib PUBLIC "${lvgl_SOURCE_DIR}" "${LVGL_CONF_DIR}")
target_compile_definitions(lvgl_lib PUBLIC LV_CONF_INCLUDE_SIMPLE LV_LVGL_H_INCLUDE_SIMPLE)

add_library(lv_drivers_lib STATIC
    "${lv_drivers_SOURCE_DIR}/sdl/sdl.c"
    "${lv_drivers_SOURCE_DIR}/sdl/sdl_common.c"
)
target_include_directories(lv_drivers_lib PUBLIC
    "${lv_drivers_SOURCE_DIR}"
    "${lvgl_SOURCE_DIR}"
    "${LVGL_CONF_DIR}"
)
target_compile_definitions(lv_drivers_lib PUBLIC
    LV_CONF_INCLUDE_SIMPLE
    LV_DRV_CONF_INCLUDE_SIMPLE
    LV_LVGL_H_INCLUDE_SIMPLE
)
target_link_libraries(lv_drivers_lib PUBLIC SDL2::SDL2-static lvgl_lib)

add_executable(simulator
    main.c
    platform/platform_sdl.c
    platform/hal_sdl.c
    platform/hal_jumper_sdl.c
    platform/hal_buttons_sdl.c
    ${COMMON_APP_SOURCES}
    ${COMMON_UI_SOURCES}
)

if(SIM_USE_GENERATED_UI)
    target_compile_definitions(simulator PRIVATE SIM_USE_GENERATED_UI=1)
    file(GLOB UI_GENERATED_SOURCES "${COMMON_DIR}/ui_generated/*.c")
    target_sources(simulator PRIVATE
        "${COMMON_DIR}/app/app_generated.c"
        ${UI_GENERATED_SOURCES}
    )
    target_include_directories(simulator PRIVATE
        "${COMMON_DIR}/app"
        "${COMMON_DIR}/ui_generated"
    )
endif()

target_include_directories(simulator PRIVATE
    ${COMMON_INCLUDE_DIRS}
    "${CMAKE_CURRENT_SOURCE_DIR}"
    "${CMAKE_CURRENT_SOURCE_DIR}/platform"
    "${lvgl_SOURCE_DIR}"
    "${lv_drivers_SOURCE_DIR}"
    "${LVGL_CONF_DIR}"
)

target_compile_definitions(simulator PRIVATE
    LV_CONF_INCLUDE_SIMPLE
    LV_LVGL_H_INCLUDE_SIMPLE
    SDL_MAIN_HANDLED
)
target_link_libraries(simulator PRIVATE lvgl_lib lv_drivers_lib SDL2::SDL2-static m)

if(WIN32)
    target_link_libraries(simulator PRIVATE winmm imm32 version setupapi)
endif()
