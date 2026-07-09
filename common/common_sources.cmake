# Platform-independent sources (firmware).
# Included from both CMakeLists — keep in sync.

set(COMMON_APP_SOURCES
    "${COMMON_DIR}/app/app_generated.c"
)

file(GLOB COMMON_UI_GENERATED_SOURCES "${COMMON_DIR}/ui_generated/*.c")
set(COMMON_UI_SOURCES ${COMMON_UI_GENERATED_SOURCES})

set(COMMON_INCLUDE_DIRS
    "${COMMON_DIR}/app"
    "${COMMON_DIR}/ui_generated"
    "${COMMON_DIR}/ui"
    "${COMMON_DIR}/hal"
)
